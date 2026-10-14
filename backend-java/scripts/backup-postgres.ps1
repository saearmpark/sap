[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\backups"),
    [ValidateRange(1, 365)]
    [int]$RetentionCount = 12
)

$ErrorActionPreference = "Stop"

function Read-PostgresConnection([string]$ConnectionString) {
    $uriValue = $ConnectionString
    if ($uriValue.StartsWith("jdbc:", [StringComparison]::OrdinalIgnoreCase)) {
        $uriValue = $uriValue.Substring(5)
    }
    $uri = [Uri]$uriValue
    if ($uri.Scheme -notin @("postgres", "postgresql")) {
        throw "SPRING_DATASOURCE_URL must be a PostgreSQL connection URL."
    }
    $credentials = $uri.UserInfo.Split(":", 2)
    if ($credentials.Count -ne 2) {
        throw "The PostgreSQL connection URL must include a username and password."
    }
    $database = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($database)) {
        throw "The PostgreSQL connection URL does not name a database."
    }
    return @{
        Host = $uri.DnsSafeHost
        Port = if ($uri.IsDefaultPort) { "5432" } else { "$($uri.Port)" }
        Database = $database
        Username = [Uri]::UnescapeDataString($credentials[0])
        Password = [Uri]::UnescapeDataString($credentials[1])
    }
}

if ([string]::IsNullOrWhiteSpace($env:SPRING_DATASOURCE_URL)) {
    throw "Set SPRING_DATASOURCE_URL to the production PostgreSQL connection URL before running a backup."
}

$pgDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue
if (-not $pgDump) {
    throw "PostgreSQL command-line tools are required. Install pg_dump and add it to PATH."
}

$connection = Read-PostgresConnection $env:SPRING_DATASOURCE_URL
$resolvedOutput = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $resolvedOutput "sap-postgres-$timestamp.dump"
$previousPassword = $env:PGPASSWORD
$previousSslMode = $env:PGSSLMODE

try {
    $env:PGPASSWORD = $connection.Password
    $env:PGSSLMODE = "require"
    & $pgDump.Source `
        --format=custom `
        --no-owner `
        --no-privileges `
        --verbose `
        --no-password `
        "--host=$($connection.Host)" `
        "--port=$($connection.Port)" `
        "--username=$($connection.Username)" `
        "--dbname=$($connection.Database)" `
        "--file=$backupPath"
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE."
    }

    $hash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash
    "$hash  $(Split-Path $backupPath -Leaf)" |
        Set-Content -LiteralPath "$backupPath.sha256" -Encoding ascii
    Write-Output "Backup created: $backupPath"
    Write-Output "SHA-256: $hash"

    Get-ChildItem -LiteralPath $resolvedOutput -Filter "sap-postgres-*.dump" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $RetentionCount |
        ForEach-Object {
            Remove-Item -LiteralPath $_.FullName
            Remove-Item -LiteralPath "$($_.FullName).sha256" -ErrorAction SilentlyContinue
        }
} finally {
    if ($null -eq $previousPassword) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    else { $env:PGPASSWORD = $previousPassword }
    if ($null -eq $previousSslMode) { Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue }
    else { $env:PGSSLMODE = $previousSslMode }
}
