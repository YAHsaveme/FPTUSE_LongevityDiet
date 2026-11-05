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
& node (Join-Path $Root 'scripts\Generate-EndToEndFlow.js')
if($LASTEXITCODE -ne 0){throw 'End-to-end Draw.io sequence generation failed'}
& node (Join-Path $Root 'scripts\Generate-FullPhysicalDatabase.js')
if($LASTEXITCODE -ne 0){throw 'Full EF Core physical ERD generation failed'}
foreach($name in @('01-c0-system-context','02-c1-container-architecture','03-c2-api-components','04-database-core','05-runtime-end-to-end','06-full-physical-database')){
  $source=Join-Path $dir ($name+'.drawio')
  $pdf=Join-Path $dir ($name+'.pdf')
  $png=Join-Path $previews ($name+'.png')
  $prior=$ErrorActionPreference;$ErrorActionPreference='Continue'
  & $Drawio --export --format pdf --output $pdf $source 2>$null | Out-Null
  $ErrorActionPreference=$prior
  if(!(Test-Path -LiteralPath $pdf) -or (Get-Item $pdf).Length -lt 1000){throw "Draw.io PDF export failed: $name"}
  # Runtime sequence is much larger than C4. Keep only its *preview* small;
  # the editable Draw.io and vector PDF preserve full one-page resolution.
  $previewScale=if($name -eq '05-runtime-end-to-end'){'0.30'}elseif($name -eq '06-full-physical-database'){'0.40'}else{'0.85'}
  if(Test-Path -LiteralPath $png){Remove-Item -LiteralPath $png -Force}
  $prior=$ErrorActionPreference;$ErrorActionPreference='Continue'
  & $Drawio --export --format png --scale $previewScale --output $png $source 2>$null | Out-Null
  $ErrorActionPreference=$prior
  if(!(Test-Path -LiteralPath $png) -or (Get-Item $png).Length -lt 1000){throw "Draw.io PNG preview export failed: $name"}
  # Audit actual rendered connector paths, not only the editable XML geometry.
  # Keep large SVG previews outside Git; the test catches edge-edge crossings.
  if($name -ne '05-runtime-end-to-end'){
    $svg=Join-Path $previews ($name+'.svg')
    $prior=$ErrorActionPreference;$ErrorActionPreference='Continue'
    & $Drawio --export --format svg --output $svg $source 2>$null | Out-Null
    $svgResult=$LASTEXITCODE
    $ErrorActionPreference=$prior
    if($svgResult -ne 0 -or !(Test-Path -LiteralPath $svg) -or (Get-Item $svg).Length -lt 1000){
      throw "Draw.io SVG path export failed: $name"
    }
  }
  $data=[Text.Encoding]::GetEncoding(28591).GetString([IO.File]::ReadAllBytes($pdf))
  $pages=[regex]::Matches($data,'/Type\s*/Page\b').Count
  if($pages -ne 1){throw "$name has $pages PDF pages, expected exactly one"}
  Write-Host "DRAWIO_EXPORTED $name, 1 PDF page, PNG preview stored outside repo"
}
& node (Join-Path $Root 'scripts\Validate-CourseDiagrams.js')
if($LASTEXITCODE -ne 0){throw 'Course diagram quality gate failed'}
& node (Join-Path $Root 'scripts\Validate-CourseRouting.js')
if($LASTEXITCODE -ne 0){throw 'Orthogonal connector and label clearance QA failed'}
& node (Join-Path $Root 'scripts\Validate-EndToEndFlow.js')
if($LASTEXITCODE -ne 0){throw 'Complete runtime sequence validation failed'}
& node (Join-Path $Root 'scripts\Validate-ArchitectureTopology.js')
if($LASTEXITCODE -ne 0){throw 'C1/C2 ports, graph connectivity or 18-table source mapping failed'}
& node (Join-Path $Root 'scripts\Validate-RenderedSvg.js') $previews
if($LASTEXITCODE -ne 0){throw 'Actual Draw.io SVG connector crossing or label collision detected'}
Write-Host 'ALL_DRAWIO_ARTIFACTS=PASS'
