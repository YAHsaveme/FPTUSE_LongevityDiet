param(
  [string]$BaseUrl = 'https://localhost:7110'
)

$ErrorActionPreference = 'Stop'

$invokeWebRequestCommand = Get-Command Invoke-WebRequest
$supportsSkipCertificateCheck = $invokeWebRequestCommand.Parameters.ContainsKey('SkipCertificateCheck')
$originalCertificatePolicy = $null

try {
  if (-not $supportsSkipCertificateCheck) {
    $policyType = 'LongevityDietTrustAllCertsPolicy' -as [type]
    if (-not $policyType) {
      Add-Type -TypeDefinition @'
using System.Net;
using System.Security.Cryptography.X509Certificates;

public sealed class LongevityDietTrustAllCertsPolicy : ICertificatePolicy
{
    public bool CheckValidationResult(ServicePoint servicePoint, X509Certificate certificate, WebRequest request, int certificateProblem)
    {
        return true;
    }
}
'@
    }

    $originalCertificatePolicy = [System.Net.ServicePointManager]::CertificatePolicy
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object LongevityDietTrustAllCertsPolicy
  }

  $requestParameters = @{
    Method = 'Get'
    UseBasicParsing = $true
  }
  if ($supportsSkipCertificateCheck) {
    $requestParameters['SkipCertificateCheck'] = $true
  }

  $health = Invoke-WebRequest -Uri "$BaseUrl/health" @requestParameters
  $swagger = Invoke-WebRequest -Uri "$BaseUrl/swagger/index.html" @requestParameters
  $openApiResponse = Invoke-WebRequest -Uri "$BaseUrl/openapi/v1.json" @requestParameters
  $openApi = $openApiResponse.Content | ConvertFrom-Json
}
finally {
  if (-not $supportsSkipCertificateCheck) {
    [System.Net.ServicePointManager]::CertificatePolicy = $originalCertificatePolicy
  }
}

Write-Output ("HEALTH_STATUS=" + $health.StatusCode)
Write-Output ("SWAGGER_STATUS=" + $swagger.StatusCode)
Write-Output ("OPENAPI_BEARER=" + [bool]$openApi.components.securitySchemes.Bearer)
Write-Output ("PROFILE_HAS_SECURITY=" + [bool]$openApi.paths.'/api/v1/profile'.get.security)
