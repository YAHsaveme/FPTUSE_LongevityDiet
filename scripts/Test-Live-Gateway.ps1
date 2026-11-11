param(
    [string]$GatewayUrl = 'http://127.0.0.1:18080',
    [string]$WebUrl = 'http://127.0.0.1:5173',
    [switch]$TestUpstreamOutage
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$repo = Split-Path -Parent $PSScriptRoot
$overlayPath = 'D:\PRN232\DockerRuntime\prn232-acceptance.volumes.yml'
$composeArgs = @(
    'compose', '-p', 'prn232-acceptance',
    '-f', (Join-Path $repo 'docker-compose.yml'),
    '-f', $overlayPath,
    '-f', (Join-Path $repo 'docker-compose.gateway.yml'),
    '--env-file', (Join-Path $repo '.env')
)
if (([uri]$GatewayUrl).Host -ne '127.0.0.1' -or
    ([uri]$GatewayUrl).Port -ne 18080 -or
    ([uri]$WebUrl).Host -ne '127.0.0.1' -or
    ([uri]$WebUrl).Port -ne 5173) {
    throw 'Only the local isolated QA endpoints are permitted.'
}
if (-not (Test-Path $overlayPath)) {
    throw 'Dedicated QA volumes file is required.'
}
$gateway = docker inspect prn232-acceptance-gateway-1 2>$null | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or
    $gateway.Config.Labels.'com.docker.compose.project' -ne 'prn232-acceptance') {
    throw 'The isolated QA Compose gateway is required.'
}
function Assert-True([string]$label, [bool]$condition) {
    if (-not $condition) { throw ('FAIL ' + $label) }
    Write-Output ('PASS ' + $label)
}
function Status([string]$url, [hashtable]$headers = @{}) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -Headers $headers -TimeoutSec 9
        return [int]$response.StatusCode
    } catch [System.Net.WebException] {
        if ($null -ne $_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }
        throw
    }
}
function Wait-GatewayReady {
    for ($i = 0; $i -lt 40; $i++) {
        try {
            if ((Status ($GatewayUrl + '/gateway/ready')) -eq 200) { return }
        } catch { }
        Start-Sleep -Seconds 2
    }
    throw 'Gateway readiness did not recover.'
}

Wait-GatewayReady
Assert-True 'GATEWAY_LIVENESS' ((Status ($GatewayUrl + '/gateway/health')) -eq 200)
Assert-True 'GATEWAY_READINESS' ((Status ($GatewayUrl + '/gateway/ready')) -eq 200)
Assert-True 'OPENAPI_PROXY' ((Status ($GatewayUrl + '/openapi/v1.json')) -eq 200)
Assert-True 'UNAUTHORIZED_REMAINS_401' ((Status ($GatewayUrl + '/api/v1/foods')) -eq 401)
Assert-True 'UNKNOWN_ROUTE_NOT_PROXY' ((Status ($GatewayUrl + '/secret/debug')) -eq 404)
Assert-True 'WEB_PROXY_UNAUTHORIZED_401' ((Status ($WebUrl + '/api/v1/foods')) -eq 401)

$config = & docker exec prn232-acceptance-web-1 cat /etc/nginx/conf.d/default.conf
Assert-True 'WEB_USES_GATEWAY_NOT_API' (
    ($config -join [Environment]::NewLine).Contains('proxy_pass http://gateway:8080/api/'))

# A synthetic member proves Authorization survives Web -> YARP -> REST.
$id = [guid]::NewGuid().ToString('N')
$payload = @{
    email = "gateway-qa-$id@example.test"
    password = "QaGateway!_A7_$id"
    displayName = 'Gateway synthetic QA'
} | ConvertTo-Json -Compress
$account = Invoke-RestMethod -Method Post -Uri ($GatewayUrl + '/api/v1/auth/register') -ContentType 'application/json' -Body $payload -TimeoutSec 20
Assert-True 'REGISTER_VIA_GATEWAY_SQL' (-not [string]::IsNullOrWhiteSpace($account.accessToken))
$auth = @{ Authorization = 'Bearer ' + $account.accessToken }
Assert-True 'JWT_VIA_GATEWAY' ((Status ($GatewayUrl + '/api/v1/profile') $auth) -eq 200)
Assert-True 'JWT_VIA_WEB_AND_GATEWAY' ((Status ($WebUrl + '/api/v1/profile') $auth) -eq 200)
Assert-True 'MEMBER_FORBIDDEN_FROM_ADMIN_VIA_GATEWAY' ((Status ($GatewayUrl + '/api/v1/admin/diet-rules') $auth) -eq 403)
Assert-True 'MEMBER_FORBIDDEN_FROM_ADMIN_VIA_WEB' ((Status ($WebUrl + '/api/v1/admin/diet-rules') $auth) -eq 403)

if ($TestUpstreamOutage) {
    $apiStopped = $false
    try {
        & docker @composeArgs stop api | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Could not stop isolated QA API.' }
        $apiStopped = $true
        $gatewayReady = Status ($GatewayUrl + '/gateway/ready')
        Assert-True 'UPSTREAM_DOWN_RETURNS_503' ($gatewayReady -eq 503)
        Assert-True 'LIVENESS_SURVIVES_API_OUTAGE' ((Status ($GatewayUrl + '/gateway/health')) -eq 200)
    } finally {
        if ($apiStopped) {
            & docker @composeArgs start api | Out-Null
            if ($LASTEXITCODE -ne 0) { throw 'Failed to restore QA API.' }
            Wait-GatewayReady
        }
    }
    Assert-True 'UPSTREAM_RECOVERY' ((Status ($GatewayUrl + '/gateway/ready')) -eq 200)
}

Write-Output 'GATEWAY_DOCKER_QA=PASS'
