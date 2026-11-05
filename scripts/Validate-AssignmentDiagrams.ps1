# Compatibility entry point after one-page Draw.io + DBML consolidation.
# See scripts/Validate-OnePageDiagrams.ps1 for the canonical checks.
param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference='Stop'
& (Join-Path $PSScriptRoot 'Validate-OnePageDiagrams.ps1') -Root $Root
if (-not $?) { exit 1 }
