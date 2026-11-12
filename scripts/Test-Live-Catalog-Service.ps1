$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$catalog='http://127.0.0.1:18082'
$identity='http://127.0.0.1:18080'
foreach($name in @('api','catalog','sqlserver','gateway')){
 $meta=docker inspect "prn232-acceptance-$name-1" 2>$null | ConvertFrom-Json
 if($LASTEXITCODE -ne 0 -or $null -eq $meta -or $meta.Config.Labels.'com.docker.compose.project' -ne 'prn232-acceptance'){throw "Isolated QA service required: $name"}
}
function Pass([string]$n,[bool]$yes){if(-not $yes){throw "FAIL $n"};Write-Output "PASS $n"}
function HttpStatus([string]$u,[string]$bearer=''){
 try{$h=@{};if($bearer){$h.Authorization='Bearer '+$bearer};$v=Invoke-WebRequest -Uri $u -Headers $h -UseBasicParsing -TimeoutSec 10;return [int]$v.StatusCode}
 catch [System.Net.WebException]{return [int]$_.Exception.Response.StatusCode}
}
function Api([string]$route,[string]$jwt){Invoke-RestMethod -Uri ($catalog+$route) -Headers @{Authorization='Bearer '+$jwt} -TimeoutSec 15}
Pass 'CATALOG_HEALTH' ((HttpStatus ($catalog+'/health')) -eq 200)
Pass 'CATALOG_READY_OWN_DATABASE' ((HttpStatus ($catalog+'/ready')) -eq 200)
Pass 'ANONYMOUS_JWT_REQUIRED' ((HttpStatus ($catalog+'/api/v1/foods')) -eq 401)
$id=[guid]::NewGuid().ToString('N')
$body=@{email="catalog-qa-$id@example.test";password="QaCatalog!_A7_$id";displayName='Catalog QA synthetic'}|ConvertTo-Json -Compress
$account=Invoke-RestMethod -Method Post -Uri ($identity+'/api/v1/auth/register') -ContentType 'application/json' -Body $body -TimeoutSec 20
$jwt=$account.accessToken
Pass 'CROSS_SERVICE_VALID_JWT' (-not [string]::IsNullOrWhiteSpace($jwt))
$foods=Api '/api/v1/foods?page=1&pageSize=20' $jwt
$recipes=Api '/api/v1/recipes?page=1&pageSize=20' $jwt
$rules=@(Api '/api/v1/diet-rules' $jwt)
Pass 'FOODS_4_SEEDED_IN_CATALOG_DB' ($foods.totalItems -eq 4 -and @($foods.items).Count -eq 4)
Pass 'RECIPES_2_SEEDED_IN_CATALOG_DB' ($recipes.totalItems -eq 2 -and @($recipes.items).Count -eq 2)
Pass 'RULES_2_SEEDED_IN_CATALOG_DB' (@($rules | ForEach-Object { $_.id }).Count -eq 2 -or @($rules[0].id).Count -eq 2)
$detail=Api ('/api/v1/foods/'+$foods.items[0].id) $jwt
Pass 'READ_CATALOG_FOOD_DETAIL' ($detail.id -eq $foods.items[0].id)
$page=Api '/api/v1/foods?page=1&pageSize=1&sortBy=calories&sortDirection=desc' $jwt
Pass 'CATALOG_QUERY_SORT_PAGE' ($page.totalPages -eq 4 -and @($page.items).Count -eq 1)
$adminFood=@{name='QA unauthorized';category='QA';calories=60;proteinG=0;carbohydrateG=10;fatG=1;isPlantBased=$true}|ConvertTo-Json -Compress
try{$null=Invoke-WebRequest -Uri ($catalog+'/api/v1/admin/foods') -Method Post -Headers @{Authorization='Bearer '+$jwt} -ContentType 'application/json' -Body $adminFood -UseBasicParsing -TimeoutSec 10;throw 'Member unexpectedly created a catalog food'}
catch [System.Net.WebException]{Pass 'CATALOG_ADMIN_RBAC_403' ([int]$_.Exception.Response.StatusCode -eq 403)}
$sa=(& docker exec prn232-acceptance-sqlserver-1 printenv MSSQL_SA_PASSWORD).Trim()
if(-not $sa){throw 'SQL QA secret unavailable in container'}
$sql=@'
SET NOCOUNT ON;
IF NOT EXISTS(SELECT 1 FROM [LongevityCatalogDb].[dbo].[__EFMigrationsHistory]) THROW 51000, 'Catalog migration missing', 1;
IF (SELECT COUNT(*) FROM [LongevityCatalogDb].[INFORMATION_SCHEMA].[TABLES] WHERE TABLE_SCHEMA='catalog') <> 10 THROW 51001, 'Catalog table count incorrect', 1;
IF EXISTS (SELECT 1 FROM [LongevityCatalogDb].[INFORMATION_SCHEMA].[TABLES] WHERE TABLE_NAME IN ('Users','UserProfiles','MealPlans','ActivityLogs','WorkerJobs')) THROW 51002, 'Cross-domain table detected', 1;
IF (SELECT COUNT(*) FROM [LongevityCatalogDb].[catalog].[Foods]) <> 4 THROW 51003, 'Independent food count incorrect', 1;
IF (SELECT COUNT(*) FROM [LongevityCatalogDb].[catalog].[Recipes]) <> 2 THROW 51004, 'Independent recipe count incorrect', 1;
SELECT 'CATALOG_DB_OWNERSHIP_VERIFIED' AS Result;
'@
$out=& docker exec prn232-acceptance-sqlserver-1 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $sa -C -b -Q $sql
if($LASTEXITCODE -ne 0){throw 'Catalog SQL ownership gate failed'}
Pass 'SCHEMA_CATALOG_OWNERSHIP' (($out -join ' ') -match 'CATALOG_DB_OWNERSHIP_VERIFIED')
Pass 'LEGACY_GATEWAY_UNCHANGED' ((HttpStatus ($identity+'/gateway/ready')) -eq 200)
Write-Output 'INDEPENDENT_CATALOG_SERVICE_DOCKER_QA=PASS'
