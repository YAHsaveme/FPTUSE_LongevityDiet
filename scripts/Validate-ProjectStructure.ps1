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

if ($failures.Count -gt 0) {
    Write-Host 'PROJECT_STRUCTURE_VALIDATION=FAIL' -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host 'PROJECT_STRUCTURE_VALIDATION=PASS' -ForegroundColor Green
Write-Host 'Canonical projects, dependency direction, FE/BE separation and runtime ports are intact.'
