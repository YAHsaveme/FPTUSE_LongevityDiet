param(
 [string]$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
 [string]$Drawio='D:\PRN232\_diagram_toolkit_sources\drawio-portable-32.6.10\draw.io.exe'
)
$ErrorActionPreference='Stop'
if(!(Test-Path -LiteralPath $Drawio)){throw "Draw.io Desktop not found at $Drawio"}
$base=Join-Path $Root 'docs\assignment\one-page'
$previews='D:\PRN232\_diagram_toolkit_sources\overall-diagrams-previews-20261106'
New-Item -ItemType Directory -Force -Path $previews|Out-Null
& node (Join-Path $Root 'scripts\Generate-OverallDiagrams.js')
if($LASTEXITCODE -ne 0){throw 'Overall Draw.io generator failed'}
foreach($name in @('C0','C1','C2','Database Diagram')){
 $src=Join-Path $base ($name+'.drawio')
 if(!(Test-Path $src)){throw "Missing source: $src"}
 foreach($format in @('pdf','svg','png')){
  $dst=if($format -eq 'pdf'){Join-Path $base ($name+'.pdf')}else{Join-Path $previews ($name+'.'+$format)}
  $scale=if($format -eq 'png'){'0.18'}else{'1'}
  $previous=$ErrorActionPreference
  $ErrorActionPreference='Continue'
  & $Drawio --export --format $format --scale $scale --output $dst $src 2>$null|Out-Null
  $exit=$LASTEXITCODE
  $ErrorActionPreference=$previous
  if($exit -ne 0 -or !(Test-Path $dst) -or (Get-Item $dst).Length -lt 1000){throw "Export error: $name.$format"}
 }
 Write-Output "OVERALL_EXPORT $name = OK"
}
& node (Join-Path $Root 'scripts\Validate-OverallDiagrams.js')
if($LASTEXITCODE -ne 0){throw 'Structural model QA failed'}
& node (Join-Path $Root 'scripts\Validate-RenderedSvg.js') $previews 'C0' 'C1' 'C2' 'Database Diagram'
if($LASTEXITCODE -ne 0){throw 'SVG edge/label clearance failed'}
& node (Join-Path $Root 'scripts\Validate-CourseLinks.js')
if($LASTEXITCODE -ne 0){throw 'Course link QA failed'}
Write-Output 'FOUR_OVERALL_DIAGRAMS_QA=PASS'
