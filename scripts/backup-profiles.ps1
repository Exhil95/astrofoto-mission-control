param(
  [string]$OutputDir = "backups"
)

. "$PSScriptRoot\lib.ps1"
Enter-RepoRoot

Require-Command "docker"

$backupDir = Join-Path $Script:RepoRoot $OutputDir
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $backupDir "astrofoto-$stamp.sqlite3"

Invoke-Checked "Backup profile database" {
  & docker compose cp "api:/data/astrofoto.sqlite3" $backupPath
}

Write-Host "Backup written to $backupPath"
