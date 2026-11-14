# Docker Desktop only: start LongevityDiet with the locally saved Gemini
# User Secret. Never write an API key to a Compose file or the Git repository.
[CmdletBinding()]
param(
    [switch] $SkipBuild
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$apiProject = Join-Path $root 'src\LongevityDiet.API\LongevityDiet.API.csproj'
$envFile = Join-Path $root '.env'
$compose = Join-Path $root 'docker-compose.yml'
$geminiOverlay = Join-Path $root 'docker-compose.gemini-demo.yml'
$originalKey = [Environment]::GetEnvironmentVariable('GEMINI_API_KEY', 'Process')
$hadOriginalKey = $null -ne $originalKey
$key = $null

try {
    if (-not (Test-Path $envFile)) {
        throw 'Missing local .env. Run scripts/Initialize-LocalDevelopment.ps1 first.'
    }
    $missing = @()
    foreach ($required in @('MSSQL_SA_PASSWORD', 'JWT_SIGNING_KEY', 'JWT_ISSUER', 'JWT_AUDIENCE')) {
        $line = Get-Content $envFile | Where-Object { $_ -match ('^\s*' + [regex]::Escape($required) + '=') } | Select-Object -Last 1
        if (-not $line -or [string]::IsNullOrWhiteSpace(($line -split '=',2)[1]) -or
            ($line -split '=',2)[1] -match '^CHANGE_ME') { $missing += $required }
    }
    if ($missing.Count -gt 0) { throw ('Missing/placeholder local .env settings: ' + ($missing -join ', ')) }

    [xml] $project = Get-Content $apiProject -Raw
    $secretsId = [string] $project.Project.PropertyGroup.UserSecretsId
    if ([string]::IsNullOrWhiteSpace($secretsId)) {
        throw 'API project does not define UserSecretsId.'
    }
    $secretsPath = Join-Path $env:APPDATA ('Microsoft\UserSecrets\' + $secretsId + '\secrets.json')
    if (-not (Test-Path $secretsPath)) {
        throw 'ASP.NET Core API User Secrets file not found. Configure Gemini:ApiKey in Manage User Secrets.'
    }
    $secrets = Get-Content $secretsPath -Raw | ConvertFrom-Json
    if ($secrets.PSObject.Properties['Gemini:ApiKey']) {
        $key = [string] $secrets.'Gemini:ApiKey'
    } elseif ($secrets.Gemini -and $secrets.Gemini.ApiKey) {
        $key = [string] $secrets.Gemini.ApiKey
    }
    if ([string]::IsNullOrWhiteSpace($key) -or $key.Length -lt 15) {
        throw 'Gemini:ApiKey is missing from ASP.NET Core User Secrets.'
    }

    # Only the current PowerShell process and the child docker-compose process
    # receive the secret. Docker stores the key in the local API container
    # environment, which is acceptable only for this localhost demo.
    [Environment]::SetEnvironmentVariable('GEMINI_API_KEY', $key, 'Process')
    $key = $null
    Push-Location $root
    try {
        $dockerArgs = @('compose', '-f', $compose, '-f', $geminiOverlay, 'up', '-d', '--force-recreate')
        if (-not $SkipBuild) { $dockerArgs += '--build' }
        Write-Host 'Starting isolated Docker Desktop demo (Gemini key for API only)...'
        & docker @dockerArgs
        if ($LASTEXITCODE -ne 0) {
            throw ('Docker Compose failed with exit code ' + $LASTEXITCODE)
        }
        Write-Host 'Demo started. Web: http://127.0.0.1:5173'
        Write-Host 'API: http://127.0.0.1:8080'
        Write-Host 'Gemini key was not saved in the repository or shown in this terminal.'
        & docker compose -f $compose -f $geminiOverlay ps --format 'table {{.Service}}\t{{.Status}}'
        if ($LASTEXITCODE -ne 0) { throw 'Failed to list started containers.' }
    } finally {
        Pop-Location
    }
} finally {
    # Do not persist the secret as a user- or machine-scoped environment variable.
    if ($hadOriginalKey) {
        [Environment]::SetEnvironmentVariable('GEMINI_API_KEY', $originalKey, 'Process')
    } else {
        [Environment]::SetEnvironmentVariable('GEMINI_API_KEY', $null, 'Process')
    }
    $key = $null
}
