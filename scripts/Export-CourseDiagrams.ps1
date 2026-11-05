param(
 [string]$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
 [string]$Drawio='D:\PRN232\_diagram_toolkit_sources\drawio-portable-32.6.10\draw.io.exe'
)
$ErrorActionPreference='Stop'
if(!(Test-Path -LiteralPath $Drawio)){throw 'Draw.io Desktop portable not found at the verified path'}
$dir=Join-Path $Root 'docs\assignment\one-page'
$previews='D:\PRN232\_diagram_toolkit_sources\course-c4-previews'
New-Item -ItemType Directory -Force $previews | Out-Null
& node (Join-Path $Root 'scripts\Generate-CourseDiagrams.js')
if($LASTEXITCODE -ne 0){throw 'Draw.io diagram generator failed'}
& node (Join-Path $Root 'scripts\Render-CourseDbml.js')
if($LASTEXITCODE -ne 0){throw 'DBML SVG renderer failed'}
foreach($name in @('01-c0-system-context','02-c1-container-architecture','03-c2-api-components','04-database-core')){
  $source=Join-Path $dir ($name+'.drawio')
  $pdf=Join-Path $dir ($name+'.pdf')
  $png=Join-Path $previews ($name+'.png')
  $prior=$ErrorActionPreference;$ErrorActionPreference='Continue'
  & $Drawio --export --format pdf --output $pdf $source 2>$null | Out-Null
  $ErrorActionPreference=$prior
  if(!(Test-Path -LiteralPath $pdf) -or (Get-Item $pdf).Length -lt 1000){throw "Draw.io PDF export failed: $name"}
  $prior=$ErrorActionPreference;$ErrorActionPreference='Continue'
  & $Drawio --export --format png --scale 0.85 --output $png $source 2>$null | Out-Null
  $ErrorActionPreference=$prior
  if(!(Test-Path -LiteralPath $png) -or (Get-Item $png).Length -lt 1000){throw "Draw.io PNG preview export failed: $name"}
  $data=[Text.Encoding]::GetEncoding(28591).GetString([IO.File]::ReadAllBytes($pdf))
  $pages=[regex]::Matches($data,'/Type\s*/Page\b').Count
  if($pages -ne 1){throw "$name has $pages PDF pages, expected exactly one"}
  Write-Host "DRAWIO_EXPORTED $name, 1 PDF page, PNG preview stored outside repo"
}
& node (Join-Path $Root 'scripts\Validate-CourseDiagrams.js')
if($LASTEXITCODE -ne 0){throw 'Course diagram quality gate failed'}
& node (Join-Path $Root 'scripts\Validate-CourseRouting.js')
if($LASTEXITCODE -ne 0){throw 'Orthogonal connector and label clearance QA failed'}
Write-Host 'ALL_DRAWIO_ARTIFACTS=PASS'
