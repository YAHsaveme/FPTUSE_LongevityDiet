param(
  [string]$BaseUrl = 'https://localhost:7110'
)

$ErrorActionPreference = 'Stop'

$root = Invoke-WebRequest -Uri "$BaseUrl/" -SkipCertificateCheck -Method Get
$health = Invoke-WebRequest -Uri "$BaseUrl/health" -SkipCertificateCheck -Method Get
$swagger = Invoke-WebRequest -Uri "$BaseUrl/swagger/index.html" -SkipCertificateCheck -Method Get
$openApi = Invoke-RestMethod -Uri "$BaseUrl/openapi/v1.json" -SkipCertificateCheck -Method Get

Write-Output ("ROOT_STATUS=" + $root.StatusCode)
Write-Output ("HEALTH_STATUS=" + $health.StatusCode)
Write-Output ("SWAGGER_STATUS=" + $swagger.StatusCode)
Write-Output ("OPENAPI_BEARER=" + [bool]$openApi.components.securitySchemes.Bearer)
Write-Output ("PROFILE_HAS_SECURITY=" + [bool]$openApi.paths.'/api/v1/profile'.get.security)
