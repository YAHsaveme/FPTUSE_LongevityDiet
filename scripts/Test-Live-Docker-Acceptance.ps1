param(
  [string]$BaseUri = 'http://127.0.0.1:8080/api/v1'
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
# This test creates synthetic accounts and writes to SQL. Never target remote production.
$target=[uri]$BaseUri
if($target.Host -notin @('localhost','127.0.0.1','::1') -or $target.Port -ne 8080) {
  throw 'Live acceptance is restricted to the local QA HTTP port 8080.'
}
$metadata=@(docker inspect prn232-acceptance-api-1 2>$null | ConvertFrom-Json)
$composeProject=if($metadata.Count -gt 0){$metadata[0].Config.Labels.'com.docker.compose.project'}else{$null}
if($LASTEXITCODE -ne 0 -or $composeProject -ne 'prn232-acceptance') {
  throw 'The isolated Docker Compose QA project must be running before creating test data.'
}
function Record([string]$name, [bool]$good, [string]$details='') {
  if (-not $good) { throw ('FAIL ' + $name + ' ' + $details) }
  Write-Host ('PASS ' + $name + ' ' + $details)
}
function Body($object) { ConvertTo-Json -InputObject $object -Depth 12 -Compress }
function Request([string]$method,[string]$path,$payload=$null,$head=$null) {
  $options = @{Method=$method;Uri=($BaseUri+$path);TimeoutSec=35;ErrorAction='Stop'}
  if($null -ne $head) { $options.Headers=$head }
  if($null -ne $payload) { $options.ContentType='application/json';$options.Body=(Body $payload) }
  return Invoke-RestMethod @options
}
function RedisGroupCounters {
  $raw = @(docker exec prn232-acceptance-redis-1 redis-cli --raw XINFO GROUPS ldc:identity-events)
  if($LASTEXITCODE -ne 0) { throw 'Could not inspect Redis identity consumer group' }
  $map=@{}
  for($i=0;$i -lt $raw.Count-1;$i+=2) { $map[$raw[$i]]=$raw[$i+1] }
  if($map['name'] -ne 'ldc-reminder-workers') { throw 'Expected reminder worker consumer group' }
  return @{read=[int]$map['entries-read'];pending=[int]$map['pending']}
}
function New-QAUser([string]$prefix) {
  $nonce=[guid]::NewGuid().ToString('N')
  $mail=$prefix+'-'+$nonce+'@example.test'
  $passwd='LocalQA!aB9'+$nonce
  $response=Request 'Post' '/auth/register' @{email=$mail;password=$passwd;displayName='Synthetic QA'}
  Record ($prefix+'_REGISTER_SQL') (-not [string]::IsNullOrWhiteSpace($response.accessToken))
  return @{Authorization=('Bearer '+$response.accessToken)}
}
Write-Output 'LIVE_QA_START -- localhost, isolated synthetic QA users'
$h=New-QAUser 'prn232-qa'
$pre=Request 'Get' '/wellness/overview' $null $h
Record 'INITIAL_SCREENING_INCOMPLETE' (-not [bool]$pre.screeningComplete)
$profile=Request 'Put' '/profile' @{
  displayName='Synthetic QA';birthYear=1996;timeZone='Asia/Ho_Chi_Minh'
  wakeTime='06:30:00';sleepTime='23:00:00'
  preferredMealFrequency=3;foodPreference='Plant-forward Vietnamese'
} $h
Record 'ONBOARD_SQL' ([bool]$profile.profileCompleted)
$screen=Request 'Put' '/wellness/screening' @{
  riskFlags=@();allergiesReviewed=$true;allergies=@('peanut')
} $h
Record 'ALLERGY_SAFETY_SQL' ([bool]$screen.screeningComplete -and $screen.segment -eq 'AdultGeneral')
$plan=Request 'Post' '/meal-plans/ensure-current' @{} $h
Record 'ROLLING_14_DAYS_SQL' ($plan.days.Count -eq 14) ('days='+$plan.days.Count)
$mealCount=0;$allergenFree=$true
foreach($d in $plan.days) {
  $mealCount += $d.meals.Count
  foreach($meal in $d.meals) {
    if(@($meal.allergens) -contains 'peanut') {$allergenFree=$false}
  }
}
Record 'MEALS_AND_REVIEWED_ALLERGEN' ($mealCount -ge 14 -and $allergenFree) ('totalMeals='+$mealCount)
$repeated=Request 'Post' '/meal-plans/ensure-current' @{} $h
Record 'ROLLING_IDEMPOTENT' ($repeated.id -eq $plan.id)
$today=Get-Date -Format 'yyyy-MM-dd'
foreach($phase in @('Baseline','During','FollowUp')) {
  $null=Request 'Post' '/wellness/check-ins' @{
    localDate=$today;phase=$phase;energy=4;mood=3;digestion=4;sleepQuality=4
    symptoms=@();bodyChanges=@();weightKg=$null;notes='Synthetic QA, discard with isolated QA volumes'
  } $h
}
$overview=Request 'Get' '/wellness/overview' $null $h
Record 'THREE_HEALTH_PHASES_SQL' ($overview.recentCheckIns.Count -eq 3) ('count='+$overview.recentCheckIns.Count)
$other=New-QAUser 'prn232-qa-other'
$otherOverview=Request 'Get' '/wellness/overview' $null $other
Record 'USER_DATA_ISOLATION' ($otherOverview.recentCheckIns.Count -eq 0)
$activity=Request 'Post' '/activities' @{kind=1;durationMinutes=35;startedAt=(Get-Date).ToUniversalTime().AddMinutes(-2).ToString('o');note='Synthetic QA walk'} $h
Record 'ACTIVITY_SQL' ($null -ne $activity)
$summary=Request 'Get' '/activities/summary' $null $h
$advice=Request 'Get' '/recommendations/activity' $null $h
Record 'REST_TO_GRPC_LIVE' ($null -ne $advice -and $advice.completedMinutes -eq $summary.equivalentMinutes) ('completed='+$advice.completedMinutes)
try {
  $null=Request 'Get' '/admin/rule-reviews/queue' $null $h
  throw 'Regular member was allowed to read admin queue'
} catch [System.Net.WebException] {
  $code=[int]$_.Exception.Response.StatusCode
  Record 'ADMIN_RBAC_FORBIDDEN' ($code -eq 403) ('HTTP='+$code)
}
$beforeConsumer=RedisGroupCounters
$beforeLen=[int](docker exec prn232-acceptance-redis-1 redis-cli XLEN ldc:identity-events)
$reminders=Request 'Put' '/reminders/preferences' @{
  optedIn=$true;mealLoggingEnabled=$true;activityEnabled=$false;
  challengeEnabled=$false;weeklySummaryEnabled=$false;
  mealTime='13:00:00';activityTime='16:00:00';challengeTime='19:00:00';
  weeklySummaryTime='20:00:00';quietStart='23:30:00';quietEnd='06:30:00'
} $h
Record 'REMINDER_PREFERENCE_SQL_OUTBOX' ($reminders.optedIn -and $reminders.mealLoggingEnabled)
$acknowledged=$false
for($try=0;$try -lt 16;$try++) {
  Start-Sleep -Seconds 2
  $afterConsumer=RedisGroupCounters
  $length=[int](docker exec prn232-acceptance-redis-1 redis-cli XLEN ldc:identity-events)
  if($length -gt $beforeLen -and $afterConsumer.read -gt $beforeConsumer.read -and $afterConsumer.pending -eq 0) {
    $acknowledged=$true
    break
  }
}
Record 'SQL_OUTBOX_REDIS_STREAM_WORKER_ACK' $acknowledged ('streamEntries='+($length-$beforeLen))
Write-Output 'LIVE_DOCKER_E2E=PASS'
