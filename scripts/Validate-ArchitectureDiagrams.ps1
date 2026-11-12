param()
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
& node (Join-Path $root 'scripts\Validate-OfficialArchitecture.js')
if($LASTEXITCODE -ne 0){throw 'Five official C0/C1/C2/ERD/Business Flow diagrams QA failed'}
Write-Output 'OFFICIAL_ARCHITECTURE_QA=PASS'
