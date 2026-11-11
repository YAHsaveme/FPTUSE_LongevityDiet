param(
  [string]$BaseUri='http://127.0.0.1:8080/api/v1'
)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$uri=[uri]$BaseUri
if($uri.Host -notin @('127.0.0.1','localhost','::1') -or $uri.Port -ne 8080){
  throw 'Admin acceptance is restricted to the local isolated QA Docker port 8080.'
}
$meta=@(docker inspect prn232-acceptance-api-1 | ConvertFrom-Json)
if($LASTEXITCODE -ne 0 -or $meta.Count -eq 0 -or
  $meta[0].Config.Labels.'com.docker.compose.project' -ne 'prn232-acceptance') {
  throw 'The isolated prn232-acceptance Docker Compose project must be running.'
}
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile=Join-Path $repo '.env'
if(-not (Test-Path -LiteralPath $envFile)){throw 'Isolated QA credentials file is missing.'}
$saLine=@(Get-Content -LiteralPath $envFile | Where-Object {$_ -match '^MSSQL_SA_PASSWORD='})
if($saLine.Count -ne 1){throw 'Expected exactly one QA SQL password setting.'}
$sa=$saLine[0].Substring('MSSQL_SA_PASSWORD='.Length)
function Ensure([string]$name,[bool]$condition) {
  if(-not $condition){throw ('FAIL '+$name)}
  Write-Host ('PASS '+$name)
}
function Api([string]$method,[string]$path,$payload=$null,$token=$null) {
  $argsHash=@{Method=$method;Uri=($BaseUri+$path);TimeoutSec=35;ErrorAction='Stop'}
  if($null -ne $token){$argsHash.Headers=@{Authorization=('Bearer '+$token)}}
  if($null -ne $payload){
    $argsHash.ContentType='application/json'
    $argsHash.Body=($payload|ConvertTo-Json -Depth 10 -Compress)
  }
  Invoke-RestMethod @argsHash
}
function ExpectError([string]$name,[int]$expected,[scriptblock]$request){
  try {
    $null=(& $request)
    throw ('FAIL '+$name+' expected HTTP '+$expected)
  } catch [System.Net.WebException] {
    $actual=[int]$_.Exception.Response.StatusCode
    Ensure $name ($actual -eq $expected)
  }
}
function NewAdmin {
  $id=[guid]::NewGuid().ToString('N')
  $email='prn232-admin-qa-'+$id+'@example.test'
  $password='AdminQA!A9'+[guid]::NewGuid().ToString('N')
  $registered=Api 'Post' '/auth/register' @{
    email=$email;password=$password;displayName='Synthetic Admin QA'
  }
  Ensure 'QA_REGISTER' (-not [string]::IsNullOrWhiteSpace($registered.accessToken))
  # The only direct SQL write is promotion of this freshly created synthetic
  # email. Verify exactly one affected row; never update real accounts.
  if($email -notmatch '^prn232-admin-qa-[0-9a-f]{32}@example\.test$') {
    throw 'QA-only SQL promotion identity failed validation.'
  }
  $sql="SET NOCOUNT ON; UPDATE [LongevityDietDb].[dbo].[Users] SET [Role]='Admin' WHERE [Email]='$email' AND [Role]='Member'; IF @@ROWCOUNT <> 1 THROW 51000, 'Synthetic QA admin promotion affected the wrong number of rows', 1;"
  $null=(& docker exec prn232-acceptance-sqlserver-1 /opt/mssql-tools18/bin/sqlcmd -b -S localhost -U sa -P $sa -C -Q $sql)
  if($LASTEXITCODE -ne 0){throw 'Synthetic QA SQL admin promotion failed.'}
  $logged=Api 'Post' '/auth/login' @{email=$email;password=$password}
  Ensure 'ADMIN_LOGIN_JWT' (-not [string]::IsNullOrWhiteSpace($logged.accessToken))
  return $logged.accessToken
}
Write-Host 'LIVE_ADMIN_QA_BEGIN'
$adminA=NewAdmin
$adminB=NewAdmin
$ruleKey='QA_GOV_'+[guid]::NewGuid().ToString('N').Substring(0,16).ToUpperInvariant()
$rule=Api 'Post' '/admin/diet-rules' @{
  ruleKey=$ruleKey;title='Synthetic QA governance rule'
  description='Nonclinical test only';category='Pattern';isMedicalSensitive=$true
} $adminA
Ensure 'RULE_CREATE_SQL' ($null -ne $rule.id)
$version=Api 'Post' ('/admin/diet-rules/'+$rule.id+'/versions') @{
  parametersJson='{"weight":1}'
  sourceUrl='https://example.org/qa-nonclinical-fixture'
  sourceType=2
  citation='Synthetic QA provenance, not expert guidance'
  evidenceLevel=2
  effectiveAt=$null
} $adminA
Ensure 'VERSION_CREATE_SQL' ($null -ne $version.id)
$path='/admin/rule-versions/'+$version.id
ExpectError 'PUBLISH_BEFORE_REVIEW_409' 409 { Api 'Post' ($path+'/publication') $null $adminB }
$submitted=Api 'Post' ($path+'/review') $null $adminA
Ensure 'SUBMIT_FOR_REVIEW_SQL' ($submitted.state -eq 4)
$queue=Api 'Get' '/admin/rule-reviews/queue?medicalSensitive=true&page=1&pageSize=100' $null $adminB
Ensure 'SENSITIVE_REVIEW_QUEUE_SQL' (@($queue.items|Where-Object {$_.ruleVersionId -eq $version.id}).Count -eq 1)
ExpectError 'SELF_APPROVAL_BLOCKED_409' 409 { Api 'Post' ($path+'/publication') $null $adminA }
$impact=Api 'Get' ($path+'/impact') $null $adminB
Ensure 'VERSION_IMPACT_SQL' ($impact.totalHistoricalPlans -eq 0)
$published=Api 'Post' ($path+'/publication') $null $adminB
Ensure 'INDEPENDENT_ADMIN_PUBLISH_SQL' ($published.state -eq 2)
ExpectError 'IMMUTABLE_PUBLISHED_VERSION_409' 409 {
  Api 'Put' $path @{
    parametersJson='{"weight":2}'
    sourceUrl='https://example.org/qa-nonclinical-fixture'
    sourceType=2
    citation='Synthetic QA provenance'
    evidenceLevel=2
    effectiveAt=$null
  } $adminA
}
$history=Api 'Get' ($path+'/history?page=1&pageSize=20') $null $adminB
$actions=@($history.items|ForEach-Object {$_.action})
Ensure 'RULE_AUDIT_HISTORY_SQL' ('Published' -in $actions -and 'Submitted' -in $actions)
$retired=Api 'Post' ($path+'/retirement') $null $adminA
Ensure 'RULE_RETIRED_SQL' ($retired.state -eq 3)
ExpectError 'RETIRED_RULE_REVIEW_BLOCKED_409' 409 { Api 'Post' ($path+'/review') $null $adminB }
Write-Host 'LIVE_ADMIN_QA=PASS'
