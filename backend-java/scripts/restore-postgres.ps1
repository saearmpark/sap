[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath
)

$ErrorActionPreference = "Stop"

function Read-PostgresConnection([string]$ConnectionString) {
    $uriValue = $ConnectionString
    if ($uriValue.StartsWith("jdbc:", [StringComparison]::OrdinalIgnoreCase)) {
        $uriValue = $uriValue.Substring(5)
    }
    $uri = [Uri]$uriValue
    if ($uri.Scheme -notin @("postgres", "postgresql")) {
        throw "The restore target must be a PostgreSQL connection URL."
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

$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
$checksumPath = "$resolvedBackup.sha256"
if (-not (Test-Path -LiteralPath $checksumPath)) {
    throw "The SHA-256 checksum file is missing: $checksumPath"
}
$expectedHash = ((Get-Content -LiteralPath $checksumPath -Raw).Trim() -split "\s+")[0]
$actualHash = (Get-FileHash -LiteralPath $resolvedBackup -Algorithm SHA256).Hash
if ($actualHash -ne $expectedHash) {
    throw "The backup checksum does not match. Do not restore this file."
}

if ([string]::IsNullOrWhiteSpace($env:SAP_RESTORE_TARGET_DATABASE_URL)) {
    throw "Set SAP_RESTORE_TARGET_DATABASE_URL to a separate, empty staging database before restoring."
}

$target = Read-PostgresConnection $env:SAP_RESTORE_TARGET_DATABASE_URL
if ([string]::IsNullOrWhiteSpace($env:SPRING_DATASOURCE_URL)) {
    throw "Set SPRING_DATASOURCE_URL to the production database URL so the script can block restoring into production."
}
$production = Read-PostgresConnection $env:SPRING_DATASOURCE_URL
if ($target.Host -eq $production.Host -and $target.Database -eq $production.Database) {
    throw "The restore target matches SPRING_DATASOURCE_URL. Production restore is blocked."
}

$pgRestore = Get-Command "pg_restore" -ErrorAction SilentlyContinue
if (-not $pgRestore) {
    throw "PostgreSQL command-line tools are required. Install pg_restore and add it to PATH."
}

$confirmation = Read-Host "This will replace objects in '$($target.Database)' on '$($target.Host)'. Type RESTORE $($target.Database) to continue"
if ($confirmation -cne "RESTORE $($target.Database)") {
    throw "Restore cancelled because the confirmation did not match."
}

$previousPassword = $env:PGPASSWORD
$previousSslMode = $env:PGSSLMODE
try {
    $env:PGPASSWORD = $target.Password
    $env:PGSSLMODE = "require"
    & $pgRestore.Source `
        --exit-on-error `
        --verbose `
        --no-owner `
        --no-privileges `
        --clean `
        --if-exists `
        --no-password `
        "--host=$($target.Host)" `
        "--port=$($target.Port)" `
        "--username=$($target.Username)" `
        "--dbname=$($target.Database)" `
        $resolvedBackup
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore failed with exit code $LASTEXITCODE."
    }
    Write-Output "Restore completed to staging database '$($target.Database)'. Verify it before switching application configuration."
} finally {
    if ($null -eq $previousPassword) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    else { $env:PGPASSWORD = $previousPassword }
    if ($null -eq $previousSslMode) { Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue }
    else { $env:PGSSLMODE = $previousSslMode }
}
