$ErrorActionPreference = 'Stop'

$root = 'D:\PRN232\PRN232_LongevityDiet'
$diagramDir = Join-Path $root 'docs\assignment\diagrams'
$previewDir = Join-Path $root 'docs\assignment\previews'
$vectorDir = Join-Path $root 'docs\assignment\vector'
$drawio = 'D:\Draw.io\draw.io.exe'

$expected = @(
    '01-c0-system-context.drawio',
    '02-c1-container-architecture.drawio',
    '03-conceptual-erd.drawio',
    '04-physical-database.drawio'
)

$geometryLint = Join-Path $root 'scripts\Lint-ArchitectureGeometry.ps1'
& $geometryLint -ArchitectureDir $diagramDir

New-Item -ItemType Directory -Force -Path $previewDir | Out-Null
New-Item -ItemType Directory -Force -Path $vectorDir | Out-Null

foreach ($name in $expected) {
    $file = Join-Path $diagramDir $name

    if (-not (Test-Path $file)) {
        throw "Missing diagram: $name"
    }

    $raw = Get-Content $file -Raw -Encoding UTF8

    try {
        [xml]$xml = $raw
    }
    catch {
        throw "Invalid draw.io XML: $name"
    }

    if ($xml.mxfile.diagram.Count -lt 1) {
        throw "No draw.io page found: $name"
    }

    foreach ($edge in $xml.SelectNodes('//mxCell[@edge="1"]')) {
        $style = [string]$edge.style
        if ($style -notmatch 'edgeStyle=orthogonalEdgeStyle') {
            throw "Non-orthogonal connector detected in $name (edge $($edge.id))"
        }
        if ($style -notmatch 'curved=0') {
            throw "Curved connector is not explicitly disabled in $name (edge $($edge.id))"
        }
        if ($style -notmatch 'endArrow=block' -or $style -notmatch 'endFill=1' -or $style -notmatch 'endSize=12') {
            throw "Arrowhead style is inconsistent in $name (edge $($edge.id))"
        }
    }

    if ($raw -match 'Ã|Â|â€™|â€“|â€”|�') {
        throw "Possible encoding artifact in $name"
    }

    $png = Join-Path $previewDir ([IO.Path]::GetFileNameWithoutExtension($name) + '.png')
    $exportWidth = switch ($name) {
        '01-c0-system-context.drawio' { 4800 }
        '02-c1-container-architecture.drawio' { 6000 }
        '03-conceptual-erd.drawio' { 6500 }
        '04-physical-database.drawio' { 6000 }
        default { 4800 }
    }
    & $drawio --export --format png --theme light --size page --width $exportWidth --output $png $file | Out-Null

    if (-not (Test-Path $png)) {
        throw "PNG export failed: $name"
    }

    $svg = Join-Path $vectorDir ([IO.Path]::GetFileNameWithoutExtension($name) + '.svg')
    & $drawio --export --format svg --theme light --output $svg $file | Out-Null
    if (-not (Test-Path $svg)) {
        throw "SVG export failed: $name"
    }

    Write-Output "PASS $name (PNG + SVG)"
}

$sectionPreviewScript = Join-Path $root 'scripts\Generate-PhysicalDbSectionPreviews.py'
python $sectionPreviewScript
if ($LASTEXITCODE -ne 0) {
    throw 'Physical DB section preview generation failed.'
}

$assignmentDoc = Join-Path $root 'docs\assignment\00-ASSIGNMENT-DOCUMENT.md'
if (-not (Test-Path $assignmentDoc)) {
    throw 'Missing 00-ASSIGNMENT-DOCUMENT.md'
}
$assignmentText = Get-Content $assignmentDoc -Raw -Encoding UTF8
foreach ($requiredSection in @(
    '## 1. Context',
    '## 2. Problems',
    '## 3. Solutions',
    '## 4. Main Actors',
    '## 5. Main Features',
    '## 6. System Architecture - C4',
    '## 7. Technology',
    '## 8. ERD - Conceptual',
    '## 9. Physical Database',
    '## 10. PRN232 Assignment Coverage'
)) {
    if ($assignmentText -notmatch [regex]::Escape($requiredSection)) {
        throw "Missing Assignment document section: $requiredSection"
    }
}
foreach ($requiredTerm in @(
    'ASP.NET Core .NET 9',
    'EF Core 9',
    'SQL Server 2022',
    'JWT',
    'Redis 7 Streams',
    'gRPC',
    'Background Worker',
    'Docker Compose',
    'OpenAPI'
)) {
    if ($assignmentText -notmatch [regex]::Escape($requiredTerm)) {
        throw "Missing mandatory technology/requirement in Assignment document: $requiredTerm"
    }
}
Write-Output 'PASS Assignment document required sections/technology checks'

$physicalFile = Join-Path $diagramDir '04-physical-database.drawio'
$physicalText = Get-Content $physicalFile -Raw -Encoding UTF8
$requiredTables = @(
    'Users','UserProfiles','RefreshTokens','Allergies','UserAllergies','UserExcludedFoods',
    'Foods','Recipes','RecipeIngredients','RecipeAllergens','DietRules','RuleVersions','RuleSetVersions','RuleSetVersionItems',
    'MealPlans','MealPlanDays','PlannedMeals','MealLogs','MealLogItems','ActivityLogs','EatingWindowSnapshots',
    'AdherenceScores','ScoreDimensions','Challenges','ChallengeDays','RecommendationFeedback',
    'FmdSafetyAssessments','FmdCycles','Reminders','WeeklyReports',
    'OutboxMessages','ProcessedEvents','AuditLogs'
)
foreach ($table in $requiredTables) {
    if ($physicalText -notmatch [regex]::Escape($table)) {
        throw "Missing target MVP table in Physical DB diagram: $table"
    }
}
Write-Output "PASS Physical DB full target table coverage ($($requiredTables.Count)/33)"

$c0Text = Get-Content (Join-Path $diagramDir '01-c0-system-context.drawio') -Raw -Encoding UTF8
$c1Text = Get-Content (Join-Path $diagramDir '02-c1-container-architecture.drawio') -Raw -Encoding UTF8

foreach ($requiredC0 in @('Guest','Member','Administrator','Longevity Diet Companion','Optional Local AI Runtime','Software System')) {
    if ($c0Text -notmatch [regex]::Escape($requiredC0)) {
        throw "Missing required C0 element/content: $requiredC0"
    }
}
foreach ($requiredC1 in @(
    'Web Application','REST API','Recommendation Service','SQL Server',
    'Background Worker','Application Event Streams','Redis 7 Streams',
    'HTTPS + REST/JSON','gRPC / HTTP2','EF Core / TDS','XREADGROUP + XACK'
)) {
    if ($c1Text -notmatch [regex]::Escape($requiredC1)) {
        throw "Missing required C1 element/content: $requiredC1"
    }
}
foreach ($sampleOnly in @('Mobile App','Cloudinary','Brevo','RabbitMQ','Google AI','Diet Service','Identity Service','Progress Service')) {
    if ($c0Text -match [regex]::Escape($sampleOnly) -or $c1Text -match [regex]::Escape($sampleOnly)) {
        throw "Reference-image component leaked into project architecture: $sampleOnly"
    }
}
Write-Output 'PASS C0/C1 project-scope and anti-copy checks'

$dsl = Join-Path $root 'docs\assignment\c4\workspace.dsl'
if (-not (Test-Path $dsl)) {
    throw 'Missing Structurizr workspace.dsl'
}

$dslText = Get-Content $dsl -Raw -Encoding UTF8
foreach ($required in @('systemContext ldc "C0-SystemContext"', 'container ldc "C1-Container"', 'web -> api', 'api -> recommendation', 'worker -> redis', 'redis -> worker')) {
    if ($dslText -notmatch [regex]::Escape($required)) {
        throw "Missing required C4 DSL content: $required"
    }
}

Write-Output 'PASS workspace.dsl structural checks'

$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCommand) {
    docker image inspect structurizr/structurizr *> $null
    if ($LASTEXITCODE -eq 0) {
        $c4Dir = Split-Path $dsl -Parent
        docker run --rm -v "${c4Dir}:/workspace" structurizr/structurizr validate -workspace /workspace/workspace.dsl
        if ($LASTEXITCODE -ne 0) {
            throw 'Structurizr CLI validation failed.'
        }
        Write-Output 'PASS Structurizr CLI workspace validation'
    }
}

Write-Output 'Assignment diagram validation complete.'
