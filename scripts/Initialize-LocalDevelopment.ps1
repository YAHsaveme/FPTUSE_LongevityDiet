$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root '.env'
$apiProject = Join-Path $root 'src\LongevityDiet.API\LongevityDiet.API.csproj'
$workerProject = Join-Path $root 'src\LongevityDiet.Worker\LongevityDiet.Worker.csproj'

if (-not (Test-Path $envPath)) {
    $sqlPassword = 'Ldc!' + [guid]::NewGuid().ToString('N') + '9aA'
    $jwtKey = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')

    @(
        "MSSQL_SA_PASSWORD=$sqlPassword"
        "JWT_SIGNING_KEY=$jwtKey"
        'JWT_ISSUER=LongevityDiet.API'
        'JWT_AUDIENCE=LongevityDiet.Web'
        'SQLSERVER_PORT=14330'
        'REDIS_PORT=6379'
        'API_PORT=8080'
        'GRPC_PORT=8081'
        'WEB_PORT=5173'
    ) | Set-Content -Encoding UTF8 $envPath

    Write-Host 'Created local .env with generated development secrets.'
}
$values = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $values[$matches[1]] = $matches[2]
    }
}

$sqlPort = $values['SQLSERVER_PORT']
$sqlPassword = $values['MSSQL_SA_PASSWORD']
$jwtKey = $values['JWT_SIGNING_KEY']

if ([string]::IsNullOrWhiteSpace($sqlPassword) -or [string]::IsNullOrWhiteSpace($jwtKey)) {
    throw '.env is missing MSSQL_SA_PASSWORD or JWT_SIGNING_KEY.'
}

$connectionString = "Server=localhost,$sqlPort;Database=LongevityDietDb;User Id=sa;Password=$sqlPassword;TrustServerCertificate=True"

dotnet user-secrets set 'ConnectionStrings:Default' $connectionString --project $apiProject | Out-Null
dotnet user-secrets set 'Jwt:SigningKey' $jwtKey --project $apiProject | Out-Null
dotnet user-secrets set 'ConnectionStrings:Default' $connectionString --project $workerProject | Out-Null

Write-Host 'Synced API and Worker .NET User Secrets.'
Write-Host 'Local development initialization complete.'
