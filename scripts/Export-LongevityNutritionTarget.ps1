param(
 [string]$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
 [string]$Drawio='D:\PRN232\_diagram_toolkit_sources\drawio-portable-32.6.10\draw.io.exe'
)
$ErrorActionPreference='Stop'
if(!(Test-Path -LiteralPath $Drawio)){ throw 'Draw.io Desktop not available' }
$base=Join-Path $Root 'docs\assignment\one-page'
$preview='D:\PRN232\_diagram_toolkit_sources\course-c4-previews'
New-Item -ItemType Directory -Force -Path $preview | Out-Null
& node (Join-Path $Root 'scripts\Generate-LongevityNutritionTarget.js')
if($LASTEXITCODE -ne 0){ throw 'Generator failed' }
$names=@('07-c2-daily-nutrition-target','08-erd-nutrition-profile-safety-target',
'09-erd-food-daily-plans-target','10-erd-checkins-trends-target','11-daily-care-loop-target',
'12-erd-cross-domain-foreign-keys-target','13-fk-profile-safety-target',
'14-fk-food-daily-plans-target','15-fk-checkins-trends-target',
'16-c2-service-dependencies-target')
foreach($n in $names){
 $src=Join-Path $base ($n+'.drawio')
 $pdf=Join-Path $base ($n+'.pdf')
 $svg=Join-Path $preview ($n+'.svg')
 $prior=$ErrorActionPreference;$ErrorActionPreference='Continue'
 & $Drawio --export --format pdf --output $pdf $src 2>$null | Out-Null
 $pdfExit=$LASTEXITCODE
 & $Drawio --export --format svg --output $svg $src 2>$null | Out-Null
 $svgExit=$LASTEXITCODE
 $ErrorActionPreference=$prior
 if($pdfExit -ne 0 -or !(Test-Path $pdf) -or (Get-Item $pdf).Length -lt 1000){ throw "PDF export failure $n" }
 if($svgExit -ne 0 -or !(Test-Path $svg) -or (Get-Item $svg).Length -lt 1000){ throw "SVG export failure $n" }
 if($true){ # Keep every local visual preview synchronized with the native diagram; avoids stale connector views.
  $png=Join-Path $preview ($n+'.png')
  $prior=$ErrorActionPreference;$ErrorActionPreference='Continue'
  & $Drawio --export --format png --scale 0.9 --output $png $src 2>$null | Out-Null
  $pngExit=$LASTEXITCODE;$ErrorActionPreference=$prior
  if($pngExit -ne 0 -or !(Test-Path $png) -or (Get-Item $png).Length -lt 1000){throw "Preview export failure $n"}
 }
 Write-Host "TARGET_DRAWIO_EXPORTED $n"
}
& node (Join-Path $Root 'scripts\Validate-LongevityNutritionTarget.js')
if($LASTEXITCODE -ne 0){throw 'Target structural QA failed'}
& node (Join-Path $Root 'scripts\Validate-NutritionPlanContract.js')
if($LASTEXITCODE -ne 0){throw 'Target scenario contract QA failed'}
Write-Host 'NUTRITION_TARGET_EXPORT_QA=PASS'
