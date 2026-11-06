param()
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
& node (Join-Path $root 'scripts\Validate-OverallDiagrams.js')
if($LASTEXITCODE -ne 0){throw 'Four overall diagram QA failed'}
Write-Output 'OVERALL_ARCHITECTURE_QA=PASS'
