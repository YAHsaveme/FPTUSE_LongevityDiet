param([string]$BaseUri='http://127.0.0.1:8080/api/v1')
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$parsed=[uri]$BaseUri
if($parsed.Host -notin @('localhost','127.0.0.1') -or $parsed.Port -ne 8080){throw 'Only local QA endpoint 8080 is allowed'}
$inspect=@(docker inspect prn232-acceptance-api-1 2>$null | ConvertFrom-Json)
if($LASTEXITCODE -ne 0 -or $inspect.Count -ne 1 -or $inspect[0].Config.Labels.'com.docker.compose.project' -ne 'prn232-acceptance'){
 throw 'Isolated prn232-acceptance Compose project is required'
}
function Pass([string]$name,[bool]$result,[string]$details=''){
 if(-not $result){throw ('FAIL '+$name+' '+$details)}
 Write-Host ('PASS '+$name+' '+$details)
}
function Call([string]$verb,[string]$route,$body=$null,$token=$null){
 $argsHash=@{Method=$verb;Uri=$BaseUri+$route;TimeoutSec=30;ErrorAction='Stop'}
 if($token){$argsHash.Headers=@{Authorization='Bearer '+$token}}
 if($null -ne $body){$argsHash.ContentType='application/json';$argsHash.Body=ConvertTo-Json -InputObject $body -Depth 12 -Compress}
 return Invoke-RestMethod @argsHash
}
function ExpectFailure([string]$label,[scriptblock]$action){
 try {$null=& $action;throw ('FAIL '+$label+' unexpectedly succeeded')}
 catch [System.Net.WebException] {Pass $label ([int]$_.Exception.Response.StatusCode -in 400,401,403,404,409,422) ('HTTP='+[int]$_.Exception.Response.StatusCode)}
}
$id=[guid]::NewGuid().ToString('N')
$email='prn232-m23-qa-'+$id+'@example.test'
$registered=Call 'Post' '/auth/register' @{email=$email;password='QA!m23_Aa9'+$id;displayName='M2 M3 synthetic QA'}
Pass 'REGISTER_SQL' (-not [string]::IsNullOrWhiteSpace($registered.accessToken))
$token=$registered.accessToken
$profile=Call 'Put' '/profile' @{displayName='M2 M3 synthetic QA';birthYear=1996;timeZone='Asia/Ho_Chi_Minh';wakeTime='06:30:00';sleepTime='23:00:00';preferredMealFrequency=3;foodPreference='Plant-forward Vietnamese'} $token
Pass 'PROFILE_SQL' $profile.profileCompleted
$foods=Call 'Get' '/foods?page=1&pageSize=2&sortBy=name&sortDirection=asc' $null $token
Pass 'CATALOG_FOOD_PAGINATION' ($foods.items.Count -eq 2 -and $foods.totalItems -ge 2) ('total='+$foods.totalItems)
$recipes=Call 'Get' '/recipes?page=1&pageSize=2' $null $token
Pass 'CATALOG_RECIPES_SQL' ($recipes.totalItems -ge 2) ('total='+$recipes.totalItems)
$rules=Call 'Get' '/diet-rules?page=1&pageSize=10' $null $token
Pass 'CATALOG_RULES_SQL' (@($rules).Count -ge 1 -and $null -ne @($rules)[0].id)
$screen=Call 'Put' '/wellness/screening' @{riskFlags=@();allergiesReviewed=$true;allergies=@('peanut')} $token
Pass 'ALLERGY_SCREEN' $screen.screeningComplete
$plan=Call 'Post' '/meal-plans/ensure-current' @{} $token
Pass 'MEAL_PLAN_14_DAYS' ($plan.days.Count -eq 14)
$recs=Call 'Get' '/recommendations?slotType=Lunch' $null $token
Pass 'RECOMMENDATION_API' ($null -ne $recs)
$templates=@(Call 'Get' '/challenges/templates' $null $token)
Pass 'CHALLENGE_14_DAY_SEED' ($templates.Count -ge 1 -and $templates[0].durationDays -eq 14)
$challenge=Call 'Post' '/challenges' @{templateId=$templates[0].id} $token
Pass 'CHALLENGE_START_SQL' ($challenge.days.Count -eq 14)
ExpectFailure 'CHALLENGE_DOUBLE_START_BLOCKED' {Call 'Post' '/challenges' @{templateId=$templates[0].id} $token}
$day1=Call 'Put' ('/challenges/'+$challenge.id+'/days/1') @{completed=$true} $token
Pass 'CHALLENGE_DAY_COMPLETE' ($day1.completedDays -eq 1)
$repeat=Call 'Put' ('/challenges/'+$challenge.id+'/days/1') @{completed=$true} $token
Pass 'CHALLENGE_COMPLETION_IDEMPOTENT' ($repeat.completedDays -eq 1)
$dashboard=Call 'Get' '/dashboard/summary' $null $token
Pass 'PERSISTED_DASHBOARD' ($dashboard.challengeCompletedDays -ge 1 -and $dashboard.trend.Count -ge 7) ('completed='+$dashboard.challengeCompletedDays)
$education=Call 'Get' '/fmd/education'
Pass 'FMD_EDUCATION_AVAILABLE' ($education.screeningQuestions.Count -ge 5)
ExpectFailure 'FMD_START_BEFORE_ASSESSMENT_BLOCKED' {Call 'Post' '/fmd/cycles' @{} $token}
$ack=Call 'Post' '/fmd/education/acknowledge' @{} $token
Pass 'FMD_ACK' ($null -ne $ack)
$answers=@{}
foreach($q in $education.screeningQuestions){$answers[$q.questionId]=$false}
$highRisk=@($education.screeningQuestions|Where-Object {$_.isHighRiskIfTrue})[0]
$answers[$highRisk.questionId]=$true
$assessment=Call 'Post' '/fmd/safety/assessment' @{answers=$answers;notes='Synthetic safety QA; no real medical record'} $token
Pass 'FMD_HIGH_RISK_REVIEW' (-not $assessment.isEligibleForTracking)
ExpectFailure 'FMD_HIGH_RISK_CYCLE_BLOCKED' {Call 'Post' '/fmd/cycles' @{} $token}
$queued=Call 'Post' '/weekly-reports/current/jobs' @{} $token
Pass 'WEEKLY_REPORT_PUBLISHED_REDIS' (-not [string]::IsNullOrWhiteSpace($queued.streamId))
$found=$null
for($i=0;$i -lt 20;$i++){
 Start-Sleep -Seconds 2
 try{$found=Call 'Get' '/weekly-reports/current' $null $token;if($found.status -eq 'Ready'){break}}
 catch [System.Net.WebException] {}
}
Pass 'WEEKLY_REPORT_WORKER_PERSISTED' ($null -ne $found -and $found.status -eq 'Ready') ('status='+$found.status)
$history=@(Call 'Get' '/weekly-reports' $null $token)
Pass 'WEEKLY_REPORT_HISTORY' ($history.Count -ge 1)
Write-Host 'MEMBER2_MEMBER3_DOCKER_QA=PASS'
