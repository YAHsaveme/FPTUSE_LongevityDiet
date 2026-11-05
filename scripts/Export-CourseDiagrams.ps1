param(
 [string]$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
 [string]$DrawIo='D:\PRN232\_diagram_toolkit_sources\drawio-portable-32.6.10\draw.io.exe',
 [string]$Edge='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$ErrorActionPreference='Stop'
if(!(Test-Path $DrawIo)){throw 'Draw.io Desktop 32.6.10 not found. Install from official release.'}
if(!(Test-Path $Edge)){throw 'Microsoft Edge not found.'}
$dir=Join-Path $Root 'docs\assignment\one-page'
$assets='D:\PRN232\_diagram_toolkit_sources\course-c4-previews'
New-Item -ItemType Directory -Force $assets|Out-Null
& node (Join-Path $Root 'scripts\Generate-CourseDiagrams.js')
if($LASTEXITCODE -ne 0){throw 'C4 source generation failed'}
& node (Join-Path $Root 'scripts\Render-CourseDbml.js')
if($LASTEXITCODE -ne 0){throw 'DBML SVG generation failed'}
foreach($n in @('01-c0-system-context','02-c1-container-architecture','03-c2-api-components')){
 $pdf=Join-Path $dir ($n+'.pdf')
 $oldPref=$ErrorActionPreference; $ErrorActionPreference='Continue'
 & $DrawIo --export --format pdf --output $pdf (Join-Path $dir ($n+'.drawio')) 2>$null | Out-Null
 $ErrorActionPreference=$oldPref
 if(!(Test-Path $pdf)){throw "Missing PDF $n"}
 $png=Join-Path $assets ($n+'.png')
 $oldPref=$ErrorActionPreference; $ErrorActionPreference='Continue'
 & $DrawIo --export --format png --scale 1 --output $png (Join-Path $dir ($n+'.drawio')) 2>$null | Out-Null
 $ErrorActionPreference=$oldPref
 if(!(Test-Path $png)){throw "Preview not generated $n"}
 Write-Host "PDF_EXPORTED $n"
}
$previewHtml=Join-Path $assets 'core-erd-print.html'
$uri=([Uri](Join-Path $dir '04-database-core.svg')).AbsoluteUri
$html='<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page {size:1189mm 841mm;margin:0}html,body{margin:0;padding:0;width:1189mm;height:841mm;background:white;overflow:hidden}img{width:1189mm;height:841mm;object-fit:contain;display:block;break-inside:avoid}</style></head><body><img src="'+$uri+'"></body></html>'
[IO.File]::WriteAllText($previewHtml,$html,[Text.Encoding]::UTF8)
$pdf=Join-Path $dir '04-database-core.pdf'
$profile=Join-Path $assets ('pdf-profile-'+$PID)
$targetUri=([Uri]$previewHtml).AbsoluteUri
$prev=$ErrorActionPreference
$ErrorActionPreference='Continue'
& $Edge --headless=new --disable-gpu --no-first-run "--user-data-dir=$profile" "--print-to-pdf=$pdf" --no-pdf-header-footer $targetUri 2>$null | Out-Null
$ErrorActionPreference=$prev
if(!(Test-Path $pdf)){throw 'DBML PDF export failed'}
& node (Join-Path $Root 'scripts\Validate-CourseDiagrams.js')
if($LASTEXITCODE -ne 0){throw 'Course C4/ERD validation failed'}
Write-Host 'COURSE_DIAGRAM_EXPORT=PASS'
