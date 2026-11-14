# Local Docker Desktop integration smoke test for Gemini and menu persistence.
# A random synthetic account is used. Does not print keys, passwords or tokens.
[CmdletBinding()]
param(
    [string] $ApiBaseUrl = 'http://127.0.0.1:8080'
)
$ErrorActionPreference = 'Stop'
$apiBase = $ApiBaseUrl.TrimEnd('/')
$token = $null
$password = $null

function Invoke-DemoJson {
    param([string] $Method, [string] $Path, [object] $Body = $null)
    $headers = @{}
    if ($script:token) { $headers['Authorization'] = 'Bearer ' + $script:token }
    $params = @{
        Uri = $script:apiBase + $Path
        Method = $Method
        Headers = $headers
        TimeoutSec = 105
        ContentType = 'application/json'
    }
    if ($null -ne $Body) {
        $params['Body'] = ($Body | ConvertTo-Json -Depth 15 -Compress)
    }
    try {
        return Invoke-RestMethod @params
    } catch {
        $status = 0
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        $problem = ''
        if ($_.ErrorDetails.Message) {
            try {
                $pd = $_.ErrorDetails.Message | ConvertFrom-Json
                $problem = [string]$pd.title
                if (-not $problem) { $problem = [string]$pd.detail }
                if (-not $problem -and $pd.errors) {
                    $problem = ((@($pd.errors.PSObject.Properties.Name)) -join ', ')
                }
                if ($problem.Length -gt 160) { $problem = $problem.Substring(0, 160) }
            } catch { $problem = '' }
        }
        throw ('Demo HTTP request failed at ' + $Method + ' ' + $Path +
            ' (status ' + $status + ', error ' + $problem + '). No secret was logged.')
    }
}

try {
    $suffix = [guid]::NewGuid().ToString('N')
    $password = 'Demo!9aA-' + [guid]::NewGuid().ToString('N')
    Write-Host '[1/7] Registering an isolated QA account through Docker API'
    $session = Invoke-DemoJson POST '/api/v1/auth/register' @{
        email = 'gemini-docker-qa-' + $suffix + '@example.test'
        password = $password
        displayName = 'Gemini Docker QA'
    }
    $token = [string]$session.accessToken
    $password = $null
    if ([string]::IsNullOrWhiteSpace($token)) { throw 'Missing login token in registration response.' }

    Write-Host '[2/7] Saving preferences and allergy screening'
    $null = Invoke-DemoJson PUT '/api/v1/profile' @{
        displayName = 'Gemini Docker QA'
        birthYear = 1996
        timeZone = 'Asia/Ho_Chi_Minh'
        wakeTime = '06:30:00'
        sleepTime = '23:00:00'
        preferredMealFrequency = 3
        foodPreference = 'Plant-forward Vietnamese'
    }
    $null = Invoke-DemoJson PUT '/api/v1/wellness/screening' @{
        riskFlags = @()
        allergiesReviewed = $true
        allergies = @()
    }

    Write-Host '[3/7] Confirming the API container has Gemini enabled'
    $status = Invoke-DemoJson GET '/api/v1/meal-plans/ai-status'
    if (-not $status.enabled -or $status.provider -ne 'Gemini') {
        throw 'Gemini is disabled in the Docker API. Check Compose secret injection.'
    }

    Write-Host '[4/7] Creating a real Gemini-assisted 7-day menu'
    $plan = Invoke-DemoJson POST '/api/v1/meal-plans/generate' @{
        startDate = (Get-Date).Date.AddDays(1).ToString('yyyy-MM-dd')
        days = 7
        dietaryPattern = 'PlantForward'
        preferredCuisine = 'Vietnamese'
        useAi = $true
    }
    if (-not $plan.id -or @($plan.days).Count -ne 7) {
        throw 'The generated plan was missing an ID or seven scheduled days.'
    }
    if (@($plan.days | ForEach-Object { $_.meals }).Count -lt 21) {
        throw 'Gemini result did not persist a complete 7-day menu.'
    }
    # Regex uses Unicode escapes so Windows PowerShell 5.1 can parse UTF-8 files.
    if ($plan.planExplanation -notmatch 'AI \u0111\u00e3 h\u1ed7 tr\u1ee3') {
        Write-Host 'GEMINI_PROVIDER_RESULT=FALLBACK_RULE_ENGINE'
        throw 'Gemini was configured but no valid AI candidate choices were accepted. This is not a live Gemini PASS.'
    }
    Write-Host 'GEMINI_PROVIDER_RESULT=AI_CHOICES_VERIFIED'

    Write-Host '[5/7] Reading saved menu back from SQL via API'
    $current = Invoke-DemoJson GET '/api/v1/meal-plans/current'
    if ($current.id -ne $plan.id -or @($current.days).Count -ne 7) {
        throw 'Current menu did not match the saved Gemini-generated plan.'
    }

    Write-Host '[6/7] Testing saved meal CRUD without another Gemini call'
    $day = $current.days[0]
    $candidates = Invoke-DemoJson GET '/api/v1/meal-plans/candidates'
    $snackCode = 'SN-LOTUS-SEED-MUNG-04'
    if (@($candidates.candidateCode) -notcontains $snackCode) {
        throw 'Approved QA snack candidate not found in the current catalog.'
    }
    Write-Host ('QA_SNACK_CODE=' + $snackCode)
    Write-Host ('QA_EXISTING_TIMES=' + (($day.meals | ForEach-Object {$_.plannedTime}) -join ','))
    $added = Invoke-DemoJson POST ('/api/v1/meal-plans/' + $plan.id + '/days/' + $day.id + '/meals') @{
        candidateCode = $snackCode
        slotType = 'Snack'
        plannedTime = '15:30:00'
    }
    $addedDay = @($added.days | Where-Object {$_.id -eq $day.id})[0]
    $snackMeal = @($addedDay.meals | Where-Object {$_.slotType -eq 'Snack'})[0]
    if (-not $snackMeal.id) { throw 'Snack was not inserted.' }
    $updated = Invoke-DemoJson PUT ('/api/v1/meal-plans/' + $plan.id + '/meals/' + $snackMeal.id) @{
        candidateCode = $snackCode
        slotType = 'Snack'
        plannedTime = '15:45:00'
    }
    $updatedSnack = @($updated.days[0].meals | Where-Object {$_.id -eq $snackMeal.id})[0]
    if ($updatedSnack.plannedTime -notmatch '^15:45') {
        throw 'Snack time change did not persist.'
    }
    $null = Invoke-DemoJson DELETE ('/api/v1/meal-plans/' + $plan.id + '/meals/' + $snackMeal.id)
    $reloaded = Invoke-DemoJson GET '/api/v1/meal-plans/current'
    if (@($reloaded.days[0].meals | Where-Object {$_.id -eq $snackMeal.id}).Count -ne 0) {
        throw 'Deleted snack remained in the persisted plan.'
    }

    Write-Host '[7/7] Checking menu safety and final persisted day count'
    foreach ($dayCheck in $reloaded.days) {
        if (@($dayCheck.meals).Count -lt 1) { throw 'A day had no meals.' }
        foreach ($meal in $dayCheck.meals) {
            if (-not $meal.candidateCode -or $meal.caloriesKcal -le 0) {
                throw 'A meal contained invalid catalog code or nutrition data.'
            }
        }
    }
    Write-Host ('DOCKER_GEMINI_E2E=PASS DAYS=' + @($reloaded.days).Count +
        ' MEALS=' + @($reloaded.days | ForEach-Object {$_.meals}).Count)
} finally {
    $token = $null
    $password = $null
}
