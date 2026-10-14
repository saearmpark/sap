[CmdletBinding()]
param(
    [ValidateSet("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")]
    [string]$DayOfWeek = "Sunday",
    [ValidatePattern("^(?:[01]\d|2[0-3]):[0-5]\d$")]
    [string]$At = "03:00",
    [ValidateRange(1, 365)]
    [int]$RetentionCount = 12
)

$ErrorActionPreference = "Stop"
$taskName = "SAP-Postgres-Backup"
$backupDirectory = Join-Path $env:LOCALAPPDATA "SAP\PostgresBackup"
$credentialPath = Join-Path $backupDirectory "connection-url.dpapi"
$runnerPath = Join-Path $PSScriptRoot "run-scheduled-backup.ps1"

$secureUrl = Read-Host "PostgreSQL connection URL (input is hidden)" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
try {
    $connectionString = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $uriValue = if ($connectionString.StartsWith("jdbc:", [StringComparison]::OrdinalIgnoreCase)) {
        $connectionString.Substring(5)
    } else {
        $connectionString
    }
    $connectionUri = [Uri]$uriValue
    if ($connectionUri.Scheme -notin @("postgres", "postgresql") -or
        [string]::IsNullOrWhiteSpace($connectionUri.UserInfo) -or
        [string]::IsNullOrWhiteSpace($connectionUri.AbsolutePath.Trim("/"))) {
        throw "Enter a PostgreSQL URL that includes a database name and credentials."
    }

    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    $secureUrl | ConvertFrom-SecureString |
        Set-Content -LiteralPath $credentialPath -Encoding ascii
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secureUrl.Dispose()
    $connectionString = $null
    $uriValue = $null
}

$powershellPath = Join-Path $PSHOME "powershell.exe"
$arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$runnerPath`" -RetentionCount $RetentionCount"
$action = New-ScheduledTaskAction -Execute $powershellPath -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At ([datetime]::ParseExact($At, "HH:mm", $null))
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$principal = New-ScheduledTaskPrincipal `
    -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Settings $settings -Principal $principal -Description "Create and rotate protected local PostgreSQL backups for SAP." `
    -Force | Out-Null
Write-Output "Scheduled weekly PostgreSQL backups ($DayOfWeek at $At)."
Write-Output "Local archives: $(Join-Path $backupDirectory 'archives')"
Write-Output "The task runs as the current Windows user. Keep this PC available and signed in."
