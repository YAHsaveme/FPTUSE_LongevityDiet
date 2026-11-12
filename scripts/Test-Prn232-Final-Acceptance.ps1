param(
    [switch]$IncludeGatewayOutage,
    [switch]$IncludeIndependentRedisSmoke,
    [string]$EvidenceFile = "docs/assignment/PRN232-FINAL-LOCAL-ACCEPTANCE-20261111.json"
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$passed = [System.Collections.Generic.List[string]]::new()
$started = [DateTimeOffset]::UtcNow
$expectedProject = 'prn232-acceptance'
$services = @('api','gateway','web','worker','sqlserver','redis','recommendation-grpc')
function Assert-True([string]$name,[bool]$result) {
    if (-not $result) { throw ('FAIL '+$name) }
    Write-Host ('PASS '+$name)
}
function Gate([string]$name,[scriptblock]$action) {
    Write-Host ('== '+$name+' ==')
    & $action
    if ($LASTEXITCODE -ne 0 -or -not $?) { throw ('GATE_FAILED '+$name) }
    $script:passed.Add($name)
    Write-Host ('GATE_PASS '+$name)
}
function ExpectHttp200([string]$url) {
    $uri=[uri]$url
    if ($uri.Host -ne '127.0.0.1') { throw 'Remote QA endpoints are forbidden.' }
    $request=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 10
    Assert-True ('HTTP_200_'+$uri.AbsolutePath) ($request.StatusCode -eq 200)
}
if (([IO.Path]::GetFullPath($EvidenceFile).StartsWith($root,[StringComparison]::OrdinalIgnoreCase)) -eq $false) {
    throw 'EvidenceFile must remain inside repository.'
}

# Never write to a production/shared database. Every live acceptance script also
# independently checks the Compose label and local port before changing data.
foreach ($service in $services) {
    $name = "$expectedProject-$service-1"
    $result = & docker inspect $name 2>$null | ConvertFrom-Json
    Assert-True ('ISOLATED_DOCKER_SERVICE_'+$service) (
        $LASTEXITCODE -eq 0 -and
        $null -ne $result -and
        $result.Config.Labels.'com.docker.compose.project' -eq $expectedProject)
}
Gate 'PDF_OFFICIAL_STATIC_22_REQUIREMENTS' {
    node scripts/Validate-Prn232-Final-PDF.cjs
}
Gate 'SOURCE_SOLUTION_172_DOTNET_TESTS' {
    dotnet test LongevityDiet.sln -c Release --nologo -v:q
}
Gate 'WEB_TESTS' {
    npm --prefix src/LongevityDiet.Web test
}
Gate 'WEB_LINT' {
    npm --prefix src/LongevityDiet.Web run lint
}
Gate 'WEB_PRODUCTION_BUILD' {
    npm --prefix src/LongevityDiet.Web run build
}
Gate 'WEB_PRODUCTION_DEPENDENCY_AUDIT' {
    npm --prefix src/LongevityDiet.Web audit --omit=dev --audit-level=high
}
Gate 'C0_C1_C2_ERD' {
    node scripts/Validate-OverallDiagrams.js
}
Gate 'ASSIGNMENT_DOC_LINKS' {
    node scripts/Validate-CourseLinks.js
}
Gate 'DOCKER_COMPOSE_CURRENT_AND_GATEWAY' {
    docker compose --env-file .env.example config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Default Compose invalid' }
    docker compose -f docker-compose.yml -f docker-compose.gateway.yml --env-file .env.example config --quiet
}
Gate 'LIVE_DOCKER_SQL_REDIS_API_READY' {
    ExpectHttp200 'http://127.0.0.1:8080/ready'
    ExpectHttp200 'http://127.0.0.1:18080/gateway/ready'
    ExpectHttp200 'http://127.0.0.1:5173/'
    Assert-True 'REDIS_PONG' ((& docker exec prn232-acceptance-redis-1 redis-cli PING | Out-String).Trim() -eq 'PONG')
}
Gate 'LIVE_THREE_EF_SQL_DATABASES_MIGRATED' {
    $container = 'prn232-acceptance-sqlserver-1'
    $saPassword = (& docker exec $container printenv MSSQL_SA_PASSWORD).Trim()
    if (-not $saPassword) { throw 'The SQL QA password is unavailable.' }
    $sql = "SET NOCOUNT ON; IF NOT EXISTS (SELECT 1 FROM [LongevityDietDb].[dbo].[__EFMigrationsHistory]) THROW 51001, 'Main database has no EF migration', 1; IF NOT EXISTS (SELECT 1 FROM [LongevityTrackingDb].[dbo].[__EFMigrationsHistory]) THROW 51002, 'Tracking database has no EF migration', 1; IF NOT EXISTS (SELECT 1 FROM [LongevityWorkerDb].[dbo].[__EFMigrationsHistory]) THROW 51003, 'Worker database has no EF migration', 1; SELECT 'MAIN+TRACKING+WORKER_MIGRATED' AS Result;"
    & docker exec $container /opt/mssql-tools18/bin/sqlcmd -b -S localhost -U sa -P $saPassword -C -Q $sql
    if ($LASTEXITCODE -ne 0) { throw 'EF migrations are missing from SQL QA.' }
}
Gate 'LIVE_REST_JWT_SQL_LDAS_GRPC_REDIS_WORKER_SCHEDULED' {
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Docker-Acceptance.ps1 -VerifyMealLdas -VerifyTimedNotification
}
Gate 'LIVE_REST_SEARCH_FILTER_SORT_PAGINATION' {
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Rest-Query-Features.ps1
}
Gate 'LIVE_ADMIN_RULE_GOVERNANCE_TWO_REVIEWERS' {
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Admin-Rule-Governance.ps1
}
Gate 'LIVE_CATALOG_CHALLENGE_FMD_WEEKLY_REPORT' {
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Member2-Member3.ps1
}
Gate 'LIVE_GATEWAY_JWT_RBAC_RECOVERY' {
    if ($IncludeGatewayOutage) {
        powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Gateway.ps1 -TestUpstreamOutage
    } else {
        powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Gateway.ps1
    }
}
Gate 'PLAYWRIGHT_BROWSER_E2E' {
    npm --prefix tests/LongevityDiet.E2ETests run test:docker
}
if ($IncludeIndependentRedisSmoke) {
    Gate 'INDEPENDENT_REDIS_STREAMS_WORKER_QA' {
        powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Run-Member1RedisSmoke.ps1
    }
}
$sha = (& git rev-parse HEAD).Trim()
$finished = [DateTimeOffset]::UtcNow
$evidence = [ordered]@{
    source = 'PRN232 Final Assignment original 3-page PDF, requirements 2-7'
    status = 'TECHNICAL_QA_PASS_NOT_GRADED'
    environment = 'localhost isolated prn232-acceptance Docker project; synthetic QA users only'
    localGitSha = $sha
    startedAtUtc = $started.ToString('o')
    completedAtUtc = $finished.ToString('o')
    gatewayOutageTested = [bool]$IncludeGatewayOutage
    independentRedisSmokeTested = [bool]$IncludeIndependentRedisSmoke
    passedGateCount = $passed.Count
    passedGates = @($passed)
    courseRubricWeights = [ordered]@{
        architecture = 20
        rest = 20
        backgroundJob = 10
        messageBroker = 15
        grpc = 15
        dockerCloud = 10
        docsPresentation = 10
    }
    humanInstructorDemoAndGradeVerified = $false
    fullAdr005FourDomainServicesVerified = $false
    medicalCertificationVerified = $false
}
$json = ConvertTo-Json -InputObject $evidence -Depth 8
$target = Join-Path $root $EvidenceFile
[IO.File]::WriteAllText($target,$json,[Text.UTF8Encoding]::new($false))
Write-Host ('FINAL_PDF_TECHNICAL_ACCEPTANCE=PASS gates='+$passed.Count)
Write-Host ('EVIDENCE='+$target)
Write-Host 'HUMAN_GRADING_AND_ADR005_REMAIN_PENDING'
