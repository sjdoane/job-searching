# Registers a daily Windows Scheduled Task that runs the headless calendar sync
# (scripts/scheduled-scan.mjs). Run this once in PowerShell:
#
#   powershell -ExecutionPolicy Bypass -File scripts\register-scan-task.ps1
#
# Re-running updates the task (-Force). To remove it:
#   Unregister-ScheduledTask -TaskName "JobSearchCommandCenter-Scan" -Confirm:$false
#
# Note: the task runs whether or not the dev server is up — it talks to Google
# directly using your stored login. Connect Google in the app first (Settings).

$ErrorActionPreference = "Stop"

$ProjectDir = Split-Path -Parent $PSScriptRoot
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) { throw "node not found on PATH. Install Node.js or run from a shell where 'node' works." }

$TaskName = "JobSearchCommandCenter-Scan"
$Action = New-ScheduledTaskAction -Execute $Node -Argument "scripts\scheduled-scan.mjs" -WorkingDirectory $ProjectDir
$Trigger = New-ScheduledTaskTrigger -Daily -At 8:00am
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings `
  -Description "Daily one-way calendar sync for Job Search Command Center" -Force | Out-Null

Write-Output "Registered scheduled task '$TaskName' (daily at 8:00 AM)."
Write-Output "Project: $ProjectDir"
Write-Output "Run now to test:  Start-ScheduledTask -TaskName '$TaskName'"
