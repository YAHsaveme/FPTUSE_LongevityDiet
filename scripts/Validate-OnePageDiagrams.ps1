param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
$dir = Join-Path $Root 'docs\assignment\one-page'
function Assert([bool]$Good, [string]$Message) { if (-not $Good) { throw "ONE-PAGE QA FAIL: $Message" } }
function Have([string]$Path) { Assert ((Test-Path -LiteralPath $Path) -and ((Get-Item -LiteralPath $Path).Length -gt 50)) "Missing or empty: $Path" }
$drawios = @('01-c0-system-context','02-c1-container-architecture','05-c2-component-architecture')
foreach ($name in $drawios) {
  $f=Join-Path $dir "$name.drawio"; Have $f
  [xml]$xml = Get-Content -LiteralPath $f -Raw -Encoding UTF8
  $pages=@($xml.SelectNodes('/mxfile/diagram'))
  Assert ($pages.Count -eq 1) "$name contains $($pages.Count) pages"
  $model=$pages[0].mxGraphModel
  $canvasWidth=[double]$model.pageWidth; $canvasHeight=[double]$model.pageHeight
  Assert ($canvasWidth -ge 3000 -and $canvasHeight -ge 2000) "$name is not a large canvas"
  $nodes=@($pages[0].SelectNodes('./mxGraphModel/root/mxCell'))
  $ids=@{}; $vertexCount=0; $edgeCount=0; $minFont=999
  foreach($n in $nodes) {
    $id=[string]$n.GetAttribute('id')
    Assert (-not $ids.ContainsKey($id)) "Duplicate id in $name : $id"
    $ids[$id]=$true
  }
  foreach($n in $nodes) {
    if ($n.GetAttribute('vertex') -eq '1') {
      $vertexCount++
      $g=$n.mxGeometry; Assert ($null -ne $g) "Missing cell geometry $name"
      $cellX=[double]$g.x; $cellY=[double]$g.y; $cellWidth=[double]$g.width; $cellHeight=[double]$g.height
      Assert ($cellX -ge 0 -and $cellY -ge 0 -and ($cellX+$cellWidth) -le ($canvasWidth+2) -and ($cellY+$cellHeight) -le ($canvasHeight+2)) "Out-of-page cell in $name"
      $m=[regex]::Match([string]$n.GetAttribute('style'), '(?:^|;)fontSize=(\d+)')
      if($m.Success){$minFont=[math]::Min($minFont,[int]$m.Groups[1].Value)}
    }
    if($n.GetAttribute('edge') -eq '1'){
      $edgeCount++
      $a=[string]$n.GetAttribute('source');$b=[string]$n.GetAttribute('target')
      Assert ($ids.ContainsKey($a) -and $ids.ContainsKey($b)) "Broken connector $a to $b in $name"
      Assert ($n.GetAttribute('style') -match 'orthogonalEdgeStyle|segmentEdgeStyle') "Non-orthogonal route in $name"
    }
  }
  Assert ($vertexCount -gt 10 -and $edgeCount -ge 4 -and $minFont -ge 28) "Failed content or typography gate in $name"
  foreach($ext in @('png','pdf')){Have (Join-Path $dir "$name.$ext")}
  Write-Host "PASS Draw.io $name | 1 page | nodes=$vertexCount edges=$edgeCount | minFont=$minFont"
}
$expected=@('Users','UserProfiles','RefreshTokens','Allergies','UserAllergies','UserExcludedFoods','Reminders','Foods','Recipes','RecipeIngredients','RecipeAllergens','DietRules','RuleVersions','RuleSetVersions','RuleSetVersionItems','MealPlans','MealPlanDays','PlannedMeals','Challenges','ChallengeDays','FmdSafetyAssessments','FmdCycles','MealLogs','MealLogItems','ActivityLogs','EatingWindowSnapshots','AdherenceScores','ScoreDimensions','WeeklyReports','RecommendationFeedback','ProcessedEvents','OutboxMessages','AuditLogs')
foreach($kind in @('target','current')) {
  $file=Join-Path $dir "06-database-$kind.dbml";Have $file
  $s=Get-Content -LiteralPath $file -Raw -Encoding UTF8
  $tables=@([regex]::Matches($s,'(?m)^Table\s+(\w+)\.(\w+)\s*\{'))
  $rels=@([regex]::Matches($s,'(?m)^Ref:\s+(\w+)\.(\w+)\.(\w+)\s+[-<>]\s+(\w+)\.(\w+)\.(\w+)\s*$'))
  $keys=@{};$schemas=@{}
  foreach($t in $tables){$keys[$t.Groups[1].Value+'.'+$t.Groups[2].Value]=$true;$schemas[$t.Groups[1].Value]=$true}
  foreach($r in $rels){
    Assert ($r.Groups[1].Value -eq $r.Groups[4].Value) "Cross-database FK in $kind DBML"
    Assert ($keys.ContainsKey($r.Groups[1].Value+'.'+$r.Groups[2].Value) -and $keys.ContainsKey($r.Groups[4].Value+'.'+$r.Groups[5].Value)) "Broken DBML table reference in $kind"
  }
  if($kind -eq 'target'){
    Assert ($tables.Count -eq 33 -and $schemas.Count -eq 6 -and $rels.Count -ge 18) "Expected 33 target tables / 6 DB namespaces / >=18 refs"
    foreach($name in $expected){Assert ((@($tables|ForEach-Object {$_.Groups[2].Value})) -contains $name) "Missing $name in target DBML"}
  } else {
    Assert ($tables.Count -eq 18 -and $schemas.Count -eq 3 -and $rels.Count -ge 5) "Expected 18 current tables / 3 DBs / >=5 refs"
    Assert ($s -match 'Status\s+nvarchar\(24\)') "Missing Users.Status enum from current DBML"
  }
  Have (Join-Path $dir "06-database-$kind-one-page.svg")
  Have (Join-Path $dir "06-database-$kind-one-page.pdf")
  Write-Host "PASS DBML $kind | tables=$($tables.Count) DBs=$($schemas.Count) local FKs=$($rels.Count)"
}
$pdfs=@('01-c0-system-context.pdf','02-c1-container-architecture.pdf','05-c2-component-architecture.pdf','06-database-current-one-page.pdf','06-database-target-one-page.pdf')
foreach($p in $pdfs){
  $data=[Text.Encoding]::GetEncoding(28591).GetString([IO.File]::ReadAllBytes((Join-Path $dir $p)))
  $count=[regex]::Matches($data,'/Type\s*/Page\b').Count
  Assert ($count -eq 1) "$p contains $count pages (expected 1)"
  Write-Host "PASS PDF $p (one page)"
}
# Monochrome acceptance gate: no blue/red/pastel RGB styles in editable Draw.io or ERD SVG files.
foreach($name in @('01-c0-system-context.drawio','02-c1-container-architecture.drawio','05-c2-component-architecture.drawio','06-database-target-one-page.svg','06-database-current-one-page.svg')) {
  $file=Join-Path $dir $name
  $text=Get-Content -LiteralPath $file -Raw -Encoding UTF8
  $colors=@([regex]::Matches($text,'#[0-9A-Fa-f]{6}\b'))
  foreach($match in $colors) {
    $hex=$match.Value.Substring(1).ToUpperInvariant()
    Assert ($hex.Substring(0,2) -eq $hex.Substring(2,2) -and $hex.Substring(2,2) -eq $hex.Substring(4,2)) "Non-grayscale color in $name : #$hex"
  }
  if($name -like '*.drawio') {
    Assert ($text -notmatch 'rounded=1;') "Nonstandard rounded node in $name"
  }
  Write-Host "PASS MONO $name | RGB grayscale only ($($colors.Count) values)"
}
& node (Join-Path $PSScriptRoot 'Validate-OnePageLayout.js')
Assert ($LASTEXITCODE -eq 0) 'Collision/layout check failed: overlapping boxes or connectors'
Write-Host 'PASS: One-page diagrams, monochrome styling, box clearance, routed edges and DBML tables verified.'
