[CmdletBinding()]
param(
    [ValidateRange(1, 365)]
    [int]$RetentionCount = 12
)

$ErrorActionPreference = "Stop"
$backupDirectory = Join-Path $env:LOCALAPPDATA "SAP\PostgresBackup"
$credentialPath = Join-Path $backupDirectory "connection-url.dpapi"
$logPath = Join-Path $backupDirectory "scheduled-backup.log"
$backupScript = Join-Path $PSScriptRoot "backup-postgres.ps1"

if (-not (Test-Path -LiteralPath $credentialPath)) {
    throw "The protected database URL is missing. Reinstall the scheduled backup task."
}

$secret = ConvertTo-SecureString (Get-Content -LiteralPath $credentialPath -Raw)
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    $env:SPRING_DATASOURCE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    & $backupScript -OutputDirectory (Join-Path $backupDirectory "archives") -RetentionCount $RetentionCount
    if ($LASTEXITCODE -ne 0) {
        throw "The PostgreSQL backup command failed with exit code $LASTEXITCODE."
    }
} catch {
    "$(Get-Date -Format o) $($_.Exception.Message)" |
        Add-Content -LiteralPath $logPath -Encoding utf8
    throw
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secret.Dispose()
    Remove-Item Env:SPRING_DATASOURCE_URL -ErrorAction SilentlyContinue
}
