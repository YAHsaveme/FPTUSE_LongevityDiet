param(
 [string]$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
 [string]$Drawio='D:\PRN232\_diagram_toolkit_sources\drawio-portable-32.6.10\draw.io.exe'
)
$ErrorActionPreference='Stop'
if(!(Test-Path -LiteralPath $Drawio)){throw "Draw.io Desktop not found at $Drawio"}
$base=Join-Path $Root 'docs\assignment\one-page'
$previews='D:\PRN232\_architecture_five_preview_20261112'
New-Item -ItemType Directory -Force -Path $previews|Out-Null
& node (Join-Path $Root 'scripts\Generate-OverallDiagrams.js')
if($LASTEXITCODE -ne 0){throw 'Five official Draw.io generator failed'}
foreach($name in @('C0','C1','C2','Database Diagram','Business Flow')){
 $src=Join-Path $base ($name+'.drawio')
 if(!(Test-Path -LiteralPath $src)){throw "Missing Draw.io source: $src"}
 foreach($format in @('pdf','png')){
  $dst=if($format -eq 'pdf'){Join-Path $base ($name+'.pdf')}else{Join-Path $previews ($name+'.png')}
  $scale=if($format -eq 'png'){'0.4'}else{'1'}
  $prior=$ErrorActionPreference
  $ErrorActionPreference='Continue'
  & $Drawio --export --format $format --scale $scale --output $dst $src 2>$null|Out-Null
  $exit=$LASTEXITCODE
  $ErrorActionPreference=$prior
  if($exit -ne 0 -or !(Test-Path -LiteralPath $dst) -or (Get-Item -LiteralPath $dst).Length -lt 3500){
    throw "Invalid export: $name.$format"
  }
 }
 Write-Output "EXPORTED: $name.drawio | $name.pdf"
}
& node (Join-Path $Root 'scripts\Validate-OfficialArchitecture.js')
if($LASTEXITCODE -ne 0){throw 'Five official diagrams failed structural QA'}
& node (Join-Path $Root 'scripts\Validate-OfficialDiagram-Geometry.js') --strict
if($LASTEXITCODE -ne 0){throw 'Five official diagrams have text/node geometry collisions'}
& node (Join-Path $Root 'scripts\Validate-CourseLinks.js')
if($LASTEXITCODE -ne 0){throw 'Course documentation links failed'}
Write-Output 'FIVE_OFFICIAL_ARCHITECTURES=PASS'
