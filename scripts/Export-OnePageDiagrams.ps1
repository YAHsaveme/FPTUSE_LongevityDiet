param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$DrawioExe = 'D:\PRN232\_diagram_toolkit_sources\drawio-portable-32.6.10\draw.io.exe',
  [string]$EdgeExe = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$ErrorActionPreference='Stop'
$dir=Join-Path $Root 'docs\assignment\one-page'
if(!(Test-Path $DrawioExe)){throw 'Missing Draw.io portable binary; install verified official release first.'}
if(!(Test-Path $EdgeExe)){throw 'Missing Edge headless browser for printing DBML-generated SVG to one-page PDF.'}
function Run-Node([string]$file){
  & node (Join-Path $Root ('scripts\'+$file))
  if($LASTEXITCODE -ne 0){throw "Node generator failed: $file"}
}
Run-Node 'Generate-OnePageArchitecture.js'
Run-Node 'Generate-OnePageDbml.js'
Run-Node 'Render-OnePageDbml.js'
function Ensure-Export([string]$Temp,[string]$Output){
  for($i=0;$i -lt 130;$i++){
    if((Test-Path $Temp) -and ((Get-Item $Temp).Length -gt 1200)){break}
    Start-Sleep -Milliseconds 200
  }
  if(!(Test-Path $Temp)){throw "Rendering failed: $Output"}
  if((Get-Item $Temp).Length -le 1200){throw "Render too small: $Temp"}
  Move-Item -LiteralPath $Temp -Destination $Output -Force
  Write-Host "EXPORTED $Output"
}
foreach($base in @('01-c0-system-context','02-c1-container-architecture','05-c2-component-architecture')){
  $input=Join-Path $dir ($base+'.drawio')
  foreach($fmt in @('pdf','png')){
    $output=Join-Path $dir ($base+'.'+$fmt)
    $tmp=Join-Path $dir ($base+'.exporting.'+$fmt)
    if(Test-Path $tmp){Remove-Item $tmp -Force}
    $prev=$ErrorActionPreference
    $ErrorActionPreference='Continue'
    if($fmt -eq 'png'){& $DrawioExe --export --format png --scale 0.7 --output $tmp $input 2>&1 | Out-Null}
    else{& $DrawioExe --export --format pdf --output $tmp $input 2>&1 | Out-Null}
    $ErrorActionPreference=$prev
    Ensure-Export $tmp $output
  }
}
foreach($kind in @('target','current')){
  $htmlFile=Join-Path $dir ('_print-'+$kind+'.html')
  $imageFile='06-database-'+$kind+'-one-page.svg'
  $html='<!doctype html><html><head><meta charset="utf-8"/><style>@page {size:1189mm 841mm;margin:0}html,body{width:1189mm;height:841mm;margin:0}img{width:1189mm;height:841mm;object-fit:contain;display:block}</style></head><body><img src="'+$imageFile+'"/></body></html>'
  [IO.File]::WriteAllText($htmlFile,$html,[Text.Encoding]::UTF8)
  $tmp=Join-Path $dir ('06-database-'+$kind+'-one-page.exporting.pdf')
  $output=Join-Path $dir ('06-database-'+$kind+'-one-page.pdf')
  if(Test-Path $tmp){Remove-Item $tmp -Force}
  $profile='D:\PRN232\_diagram_toolkit_sources\edge-dbml-export-'+$kind+'-'+$PID
  $url=([Uri]$htmlFile).AbsoluteUri
  try {
    $prev=$ErrorActionPreference
    $ErrorActionPreference='Continue'
    & $EdgeExe --headless=new --disable-gpu --no-first-run --no-default-browser-check "--user-data-dir=$profile" "--print-to-pdf=$tmp" --no-pdf-header-footer $url 2>&1 | Out-Null
    $ErrorActionPreference=$prev
    Ensure-Export $tmp $output
  } finally {
    if(Test-Path $htmlFile){Remove-Item $htmlFile -Force}
  }
}
& (Join-Path $Root 'scripts\Validate-OnePageDiagrams.ps1') -Root $Root
if(-not $?){throw 'One-page QA did not complete successfully'}
Write-Host 'ONE-PAGE EXPORT AND VERIFICATION: COMPLETE'
