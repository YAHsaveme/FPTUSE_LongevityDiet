$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()

function Assert-ProjectRule {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) {
        $failures.Add($Message)
    }
}

function Read-ProjectText {
    param([string]$RelativePath)
    return Get-Content (Join-Path $root $RelativePath) -Raw
}

$requiredProjects = @(
    'src\LongevityDiet.Domain\LongevityDiet.Domain.csproj',
    'src\LongevityDiet.Repositories\LongevityDiet.Repositories.csproj',
    'src\LongevityDiet.Services\LongevityDiet.Services.csproj',
    'src\LongevityDiet.API\LongevityDiet.API.csproj',
    'src\LongevityDiet.Recommendation.Grpc\LongevityDiet.Recommendation.Grpc.csproj',
    'src\LongevityDiet.Worker\LongevityDiet.Worker.csproj',
    'src\LongevityDiet.Web\LongevityDiet.Web.esproj',
    'docker-compose.dcproj'
)

foreach ($project in $requiredProjects) {
    Assert-ProjectRule (Test-Path (Join-Path $root $project)) "Missing canonical project: $project"
}

$requiredPlanningFiles = [System.Collections.Generic.List[string]]::new()
$requiredPlanningFiles.Add('docs\task\README.md')
$requiredPlanningFiles.Add('docs\task\ROADMAP-4-WEEKS.md')
$requiredPlanningFiles.Add('docs\09-TEST-DEPLOY-DEMO.md')
$requiredPlanningFiles.Add('docs\10-PRN232-TRACEABILITY.md')

foreach ($week in 1..4) {
    $requiredPlanningFiles.Add("docs\task\Week $week\README.md")
    foreach ($task in 1..4) {
        $requiredPlanningFiles.Add("docs\task\Week $week\Task $task.md")
    }
}

foreach ($planningFile in $requiredPlanningFiles) {
    Assert-ProjectRule (Test-Path (Join-Path $root $planningFile)) "Missing canonical 4-week planning/evidence file: $planningFile"
}

$forbiddenPlanningPaths = [System.Collections.Generic.List[string]]::new()
$forbiddenPlanningPaths.Add('docs\task\ROADMAP-9-WEEKS.md')
foreach ($week in 5..9) {
    $forbiddenPlanningPaths.Add("docs\task\Week $week")
}

foreach ($forbiddenPath in $forbiddenPlanningPaths) {
    Assert-ProjectRule (-not (Test-Path (Join-Path $root $forbiddenPath))) "Stale 9-week planning artifact must be removed: $forbiddenPath"
}

$sourceProjectFiles = Get-ChildItem (Join-Path $root 'src') -Recurse -File |
    Where-Object { $_.Extension -in @('.csproj', '.esproj') } |
    ForEach-Object { [IO.Path]::GetRelativePath($root, $_.FullName).Replace('/', '\') }

$allowedSourceProjects = @($requiredProjects | Where-Object { $_ -like 'src\*' })
foreach ($project in $sourceProjectFiles) {
    Assert-ProjectRule ($project -in $allowedSourceProjects) "Unexpected source project detected: $project"
}

$dependencyRules = @{
    'src\LongevityDiet.Domain\LongevityDiet.Domain.csproj' = @()
    'src\LongevityDiet.Repositories\LongevityDiet.Repositories.csproj' = @('LongevityDiet.Domain')
    'src\LongevityDiet.Services\LongevityDiet.Services.csproj' = @('LongevityDiet.Domain', 'LongevityDiet.Repositories')
    'src\LongevityDiet.API\LongevityDiet.API.csproj' = @('LongevityDiet.Domain', 'LongevityDiet.Repositories', 'LongevityDiet.Services')
    'src\LongevityDiet.Worker\LongevityDiet.Worker.csproj' = @('LongevityDiet.Domain', 'LongevityDiet.Repositories', 'LongevityDiet.Services')
    'src\LongevityDiet.Recommendation.Grpc\LongevityDiet.Recommendation.Grpc.csproj' = @('LongevityDiet.Domain')
}

foreach ($entry in $dependencyRules.GetEnumerator()) {
    [xml]$xml = Read-ProjectText $entry.Key
    $refs = @($xml.Project.ItemGroup.ProjectReference | ForEach-Object {
        $include = ([string]$_.Include).Replace('\', '/')
        [IO.Path]::GetFileNameWithoutExtension($include)
    } | Where-Object { $_ })

    $expected = @($entry.Value)
    $unexpected = @($refs | Where-Object { $_ -notin $expected })
    $missing = @($expected | Where-Object { $_ -notin $refs })

    Assert-ProjectRule ($unexpected.Count -eq 0) "$($entry.Key) has forbidden ProjectReference(s): $($unexpected -join ', ')"
    Assert-ProjectRule ($missing.Count -eq 0) "$($entry.Key) is missing expected ProjectReference(s): $($missing -join ', ')"
}

$apiProgram = Read-ProjectText 'src\LongevityDiet.API\Program.cs'
Assert-ProjectRule ($apiProgram -notmatch 'UseStaticFiles\s*\(') 'API must not host frontend static files.'
Assert-ProjectRule ($apiProgram -notmatch 'MapFallbackToFile\s*\(') 'API must not host the React SPA fallback.'
Assert-ProjectRule ($apiProgram -notmatch 'UseDefaultFiles\s*\(') 'API must remain API-only.'

$vite = Read-ProjectText 'src\LongevityDiet.Web\vite.config.ts'
Assert-ProjectRule ($vite -notmatch 'LongevityDiet\.API[/\\]wwwroot') 'Frontend must not build into API/wwwroot.'
Assert-ProjectRule ($vite -match '5173') 'Frontend development port 5173 is missing from Vite config.'
Assert-ProjectRule ($vite -match 'https://localhost:7110') 'Vite proxy must target API HTTPS 7110 by default.'

$compose = Read-ProjectText 'docker-compose.yml'
foreach ($service in @('sqlserver:', 'redis:', 'recommendation-grpc:', 'api:', 'worker:', 'web:')) {
    Assert-ProjectRule ($compose -match [regex]::Escape($service)) "docker-compose.yml is missing service $service"
}
Assert-ProjectRule ($compose -match 'WEB_PORT:-5173') 'Docker Web host port must remain 5173.'
Assert-ProjectRule ($compose -match 'API_PORT:-8080') 'Docker API host port must remain 8080.'
Assert-ProjectRule ($compose -match 'GRPC_PORT:-8081') 'Docker gRPC host port must remain 8081.'
Assert-ProjectRule ($compose -match 'SQLSERVER_PORT:-14330') 'Docker SQL Server host port must remain 14330.'
Assert-ProjectRule ($compose -match 'REDIS_PORT:-6379') 'Docker Redis host port must remain 6379.'

$launch = Read-ProjectText 'LongevityDiet.slnLaunch'
Assert-ProjectRule ($launch -match 'Development - Full Stack') 'Visual Studio Development - Full Stack profile is missing.'
Assert-ProjectRule ($launch -match 'Docker Compose - Full Stack') 'Visual Studio Docker Compose - Full Stack profile is missing.'

$rootReadme = Read-ProjectText 'README.md'
$requiredReadmeSections = @(
    'Project description',
    'System architecture',
    'Technology stack',
    'Installation guide',
    'Deployment instructions',
    'Team Member Responsibilities'
)

foreach ($section in $requiredReadmeSections) {
    $pattern = "(?m)^##\s+$([regex]::Escape($section))\s*$"
    Assert-ProjectRule ($rootReadme -match $pattern) "README.md is missing PRN232-required section: $section"
}

$traceability = Read-ProjectText 'docs\10-PRN232-TRACEABILITY.md'
Assert-ProjectRule ($traceability -match 'System architecture and design') 'PRN232 traceability is missing the architecture rubric criterion.'
Assert-ProjectRule ($traceability -match 'REST API implementation') 'PRN232 traceability is missing the REST rubric criterion.'
Assert-ProjectRule ($traceability -match 'Background Job') 'PRN232 traceability is missing the Background Job rubric criterion.'
Assert-ProjectRule ($traceability -match 'Message Broker integration') 'PRN232 traceability is missing the Message Broker rubric criterion.'
Assert-ProjectRule ($traceability -match 'gRPC service') 'PRN232 traceability is missing the gRPC rubric criterion.'
Assert-ProjectRule ($traceability -match 'Docker/Cloud deployment') 'PRN232 traceability is missing the deployment rubric criterion.'
Assert-ProjectRule ($traceability -match 'Documentation and presentation') 'PRN232 traceability is missing the documentation rubric criterion.'
$requiredTraceabilityTerms = @(
    'ASP.NET Core',
    'Entity Framework Core',
    'Dependency Injection',
    'Configuration management',
    'Logging and exception handling',
    'JWT Authentication',
    'RESTful API design',
    'gRPC communication',
    'Message Broker integration',
    'Background Service',
    'Docker containerization'
)
foreach ($term in $requiredTraceabilityTerms) {
    Assert-ProjectRule ($traceability -match [regex]::Escape($term)) "PRN232 traceability is missing technical requirement: $term"
}

$demoPlan = Read-ProjectText 'docs\09-TEST-DEPLOY-DEMO.md'
$requiredDemoItems = @(
    'System architecture',
    'REST API functionality',
    'Background job execution',
    'Message publishing and consuming',
    'gRPC communication',
    'Docker or cloud deployment',
    'End-to-end business workflow'
)
foreach ($demoItem in $requiredDemoItems) {
    Assert-ProjectRule ($demoPlan -match [regex]::Escape($demoItem)) "Final demo plan is missing PRN232 demonstration item: $demoItem"
}

if ($failures.Count -gt 0) {
    Write-Host 'PROJECT_STRUCTURE_VALIDATION=FAIL' -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host 'PROJECT_STRUCTURE_VALIDATION=PASS' -ForegroundColor Green
Write-Host 'Canonical projects, dependency direction, FE/BE separation, runtime ports, 4-week planning and PRN232 README/rubric guardrails are intact.'
