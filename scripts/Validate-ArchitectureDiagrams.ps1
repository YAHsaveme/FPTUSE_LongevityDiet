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
    Where-Object { $_.Name -match '^0[1-9]-' } |
    Sort-Object Name

if (-not $files) { throw 'No final architecture diagrams found.' }
if (-not (Test-Path $DrawIoExe)) { throw "draw.io executable not found: $DrawIoExe" }

foreach ($file in $files)
{
    $text = [IO.File]::ReadAllText($file.FullName, [Text.Encoding]::UTF8)
    [xml]$text | Out-Null

    if ($text -match '&amp;lt;|â€”|Â·|â€“')
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

Write-Host ''
Write-Host ("Validated geometry/XML/encoding and exported {0} diagrams to {1}" -f $files.Count, $previewDir)
