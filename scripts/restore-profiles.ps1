param(
  [Parameter(Mandatory = $true)]
  [string]$Path,
  [switch]$Force
)

. "$PSScriptRoot\lib.ps1"
Enter-RepoRoot

Require-Command "docker"

$sourcePath = Resolve-Path -LiteralPath $Path

if (-not $Force) {
  $answer = Read-Host "Restore '$sourcePath' over /data/astrofoto.sqlite3? Type RESTORE to continue"
  if ($answer -ne "RESTORE") {
    Write-Host "Restore cancelled."
    exit 0
  }
}

$preRestoreDir = Join-Path $Script:RepoRoot "backups"
New-Item -ItemType Directory -Force -Path $preRestoreDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$preRestorePath = Join-Path $preRestoreDir "astrofoto-pre-restore-$stamp.sqlite3"

try {
  & docker compose cp "api:/data/astrofoto.sqlite3" $preRestorePath | Out-Null
  Write-Host "Current database backed up to $preRestorePath"
} catch {
  Write-Warning "Could not create pre-restore backup. Continuing with requested restore."
}

Invoke-Checked "Stop API" {
  & docker compose stop api
}

Invoke-Checked "Restore profile database" {
  & docker compose cp $sourcePath "api:/data/astrofoto.sqlite3"
}

Invoke-Checked "Start API" {
  & docker compose start api
}

Write-Host "Profile database restored from $sourcePath"
