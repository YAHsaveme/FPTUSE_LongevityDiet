param([string]$BaseUri='http://127.0.0.1:18080/api/v1')
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$u=[uri]$BaseUri
if($u.Host -ne '127.0.0.1' -or $u.Port -ne 18080 -or $u.AbsolutePath -ne '/api/v1'){
  throw 'Only the isolated QA Gateway on localhost port 18080 is supported.'
}
$meta=docker inspect prn232-acceptance-api-1 2>$null | ConvertFrom-Json
if($LASTEXITCODE -ne 0 -or $meta.Config.Labels.'com.docker.compose.project' -ne 'prn232-acceptance'){
  throw 'Only the isolated QA Docker project prn232-acceptance can be used.'
}
function Assert([string]$name,[bool]$condition){
  if(-not $condition){throw ('FAIL '+$name)}
  Write-Host ('PASS '+$name)
}
function Api([string]$method,[string]$path,$body=$null,$token=$null){
  $argsHash=@{Method=$method;Uri=$BaseUri+$path;TimeoutSec=20;ErrorAction='Stop'}
  if($token){$argsHash.Headers=@{Authorization='Bearer '+$token}}
  if($body){$argsHash.ContentType='application/json';$argsHash.Body=$body|ConvertTo-Json -Compress -Depth 8}
  Invoke-RestMethod @argsHash
}
function ExpectError([string]$name,[int]$status,[scriptblock]$action){
  try{$null=(& $action);throw ('FAIL '+$name+' unexpectedly succeeded')}
  catch [System.Net.WebException]{
    Assert $name ([int]$_.Exception.Response.StatusCode -eq $status)
  }
}
$suffix=[guid]::NewGuid().ToString('N')
$registered=Api 'Post' '/auth/register' @{email=('prn232-final-catalog-qa-'+$suffix+'@example.test');password=('QA!_Catalog_A9_'+$suffix);displayName='Synthetic catalog QA'}
$jwt=$registered.accessToken
Assert 'SYNTHETIC_MEMBER_JWT' (-not [string]::IsNullOrWhiteSpace($jwt))
ExpectError 'ADMIN_CATALOG_BLOCKED_403' 403 {Api 'Get' '/admin/foods' $null $jwt}
$all=Api 'Get' '/foods?page=1&pageSize=100&sortBy=name&sortDirection=asc' $null $jwt
$foods=@($all.items)
Assert 'FOOD_CATALOG_SEEDED_SQL' ($all.totalItems -ge 2 -and $foods.Count -ge 2)
$one=Api 'Get' '/foods?page=1&pageSize=1&sortBy=name&sortDirection=asc' $null $jwt
$two=Api 'Get' '/foods?page=2&pageSize=1&sortBy=name&sortDirection=asc' $null $jwt
Assert 'PAGINATION_TOTAL_AND_PAGE' ($one.totalItems -eq $all.totalItems -and $one.totalPages -ge 2 -and @($one.items).Count -eq 1)
Assert 'PAGINATION_NO_REPEAT' ($one.items[0].id -ne $two.items[0].id)
$sample=$foods[0]
$search=[uri]::EscapeDataString($sample.name)
$found=Api 'Get' ('/foods?search='+$search+'&page=1&pageSize=100') $null $jwt
Assert 'SEARCH_EXACT_NAME' (@($found.items|Where-Object {$_.id -eq $sample.id}).Count -eq 1)
$category=[uri]::EscapeDataString($sample.category)
$filtered=Api 'Get' ('/foods?category='+$category+'&page=1&pageSize=100') $null $jwt
Assert 'FILTER_CATEGORY' (@($filtered.items).Count -ge 1 -and @($filtered.items|Where-Object {$_.category -ne $sample.category}).Count -eq 0)
$plantValue=([string]$sample.isPlantBased).ToLowerInvariant()
$plant=Api 'Get' ('/foods?isPlantBased='+$plantValue+'&page=1&pageSize=100') $null $jwt
Assert 'FILTER_BOOL_PLANT' (@($plant.items).Count -ge 1 -and @($plant.items|Where-Object {$_.isPlantBased -ne $sample.isPlantBased}).Count -eq 0)
$asc=Api 'Get' '/foods?page=1&pageSize=100&sortBy=calories&sortDirection=asc' $null $jwt
$desc=Api 'Get' '/foods?page=1&pageSize=100&sortBy=calories&sortDirection=desc' $null $jwt
$ascCalories=@($asc.items|ForEach-Object{[decimal]$_.calories})
$descCalories=@($desc.items|ForEach-Object{[decimal]$_.calories})
Assert 'SORT_ASC_CALORIES' ($ascCalories[0] -le $ascCalories[-1])
Assert 'SORT_DESC_CALORIES' ($descCalories[0] -ge $descCalories[-1])
Assert 'SORT_REVERSAL_INVARIANT' ([decimal]$ascCalories[0] -eq [decimal]$descCalories[-1])
ExpectError 'BAD_PAGE_SIZE_PROBLEM_400' 400 {Api 'Get' '/foods?pageSize=101' $null $jwt}
ExpectError 'BAD_SORT_FIELD_PROBLEM_400' 400 {Api 'Get' '/foods?sortBy=invalid' $null $jwt}
Write-Host 'REST_SEARCH_FILTER_SORT_PAGINATION_DOCKER_QA=PASS'
