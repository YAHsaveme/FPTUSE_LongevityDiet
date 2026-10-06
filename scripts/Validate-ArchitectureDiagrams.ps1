param(
    [string]$ArchitectureDir = (Join-Path $PSScriptRoot '..\docs\architecture'),
    [string]$DrawIoExe = 'D:\Draw.io\draw.io.exe',
    [int]$Width = 4200
)

$ErrorActionPreference = 'Stop'

$lintScript = Join-Path $PSScriptRoot 'Lint-ArchitectureGeometry.ps1'
& $lintScript -ArchitectureDir $ArchitectureDir

$previewDir = Join-Path $ArchitectureDir 'previews'
New-Item -ItemType Directory -Force -Path $previewDir | Out-Null

$files = Get-ChildItem $ArchitectureDir -Filter '*.drawio' -File |
    Where-Object { $_.Name -match '^(?:0[1-9]|10)-' } |
    Sort-Object Name

if (-not $files) { throw 'No final architecture diagrams found.' }
if (-not (Test-Path $DrawIoExe)) { throw "draw.io executable not found: $DrawIoExe" }

foreach ($file in $files)
{
    $text = [IO.File]::ReadAllText($file.FullName, [Text.Encoding]::UTF8)
    [xml]$text | Out-Null

    if ($text -match '&amp;lt;' -or $text -match '[^\x00-\x7F]')
    {
        throw "Encoding/HTML artifact detected in $($file.Name)"
    }

    $output = Join-Path $previewDir ($file.BaseName + '.png')
    $arguments = @(
        '--export',
        '--format', 'png',
        '--theme', 'light',
        '--size', 'page',
        '--width', $Width,
        '--output', $output,
        $file.FullName
    )

    & $DrawIoExe @arguments | Out-Null

    if (-not (Test-Path $output))
    {
        throw "PNG export failed for $($file.Name)"
    }

    Write-Host ("PASS {0}" -f $file.Name)
}

$contextText = [IO.File]::ReadAllText((Join-Path $ArchitectureDir '01-system-context.drawio'), [Text.Encoding]::UTF8)
foreach ($forbidden in @('React 19','ASP.NET Core','SQL Server 2022','Redis 7','gRPC / HTTP2')) {
    if ($contextText -match [regex]::Escape($forbidden)) { throw "Implementation detail leaked into System Context: $forbidden" }
}

$containerText = [IO.File]::ReadAllText((Join-Path $ArchitectureDir '02-container-architecture.drawio'), [Text.Encoding]::UTF8)
$targetC1Required = @(
    'Target Architecture','API Gateway','Identity & Profile Service','Catalog & Rules Service','Planning Service','Tracking & Progress Service',
    'Recommendation Service','Background Worker','Event Streams',
    'LongevityIdentityDb','LongevityCatalogDb','LongevityPlanningDb','LongevityTrackingDb','LongevityRecommendationDb','LongevityWorkerDb',
    ':443',':8080',':8081',':8082',':8083',':8084',':8085',':8086',':6379',':1433',':11434',
    'gRPC / HTTP/2','Redis Streams','EF Core / TDS'
)
foreach ($required in $targetC1Required) {
    if ($containerText -notmatch [regex]::Escape($required)) { throw "Target C1 semantic requirement missing: $required" }
}
foreach ($forbidden in @('[Container - Message Broker]','<b>REST API</b>','<b>SQL Database</b>')) {
    if ($containerText -match [regex]::Escape($forbidden)) { throw "Obsolete target-C1 center detected: $forbidden" }
}

$deploymentText = [IO.File]::ReadAllText((Join-Path $ArchitectureDir '03-docker-deployment.drawio'), [Text.Encoding]::UTF8)
foreach ($required in @('Hosts Web Application [Container Instance]','[Infrastructure Node]','default host :14330','Hosts Application Event Streams [Container Instance]')) {
    if ($deploymentText -notmatch [regex]::Escape($required)) { throw "Deployment-view semantic requirement missing: $required" }
}

$componentText = [IO.File]::ReadAllText((Join-Path $ArchitectureDir '04-api-component.drawio'), [Text.Encoding]::UTF8)
foreach ($forbidden in @('[External Container]','[External Container - Database]')) {
    if ($componentText -match [regex]::Escape($forbidden)) { throw "Component-view scope/type regression: $forbidden" }
}
if ($componentText -notmatch [regex]::Escape('[Supporting Runtime Concern]')) { throw 'Component view must distinguish supporting runtime concerns from C4 components.' }

foreach ($targetFile in @('05-recommendation-dynamic.drawio','06-outbox-redis-dynamic.drawio')) {
    $targetText = [IO.File]::ReadAllText((Join-Path $ArchitectureDir $targetFile), [Text.Encoding]::UTF8)
    if ($targetText -notmatch 'Target') { throw "Target/planned status is not explicit in $targetFile" }
}

$productionText = [IO.File]::ReadAllText((Join-Path $ArchitectureDir '10-production-secure-deployment.drawio'), [Text.Encoding]::UTF8)
foreach ($required in @('Production Target','HTTPS / TLS','HTTPS / REST','gRPC / HTTP/2 + TLS','Private Application Network','no public application ports')) {
    if ($productionText -notmatch [regex]::Escape($required)) { throw "Production deployment semantic requirement missing: $required" }
}
Write-Host 'PASS C4 abstraction/status/production-security semantic checks'
Write-Host ''
Write-Host ("Validated geometry/XML/encoding and exported {0} diagrams to {1}" -f $files.Count, $previewDir)
