param(
  [switch]$StartStack,
  [switch]$NoBuild,
  [switch]$SkipTests,
  [switch]$SkipBackup,
  [switch]$SkipMigrationDryRun,
  [switch]$Logs
)

. "$PSScriptRoot\lib.ps1"
Enter-RepoRoot

function Wait-HttpOk {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [int]$Attempts = 18,
    [int]$DelaySeconds = 5
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        Write-Host "Health: $($response.StatusCode) $Url"
        return
      }
    } catch {
      if ($attempt -eq $Attempts) {
        throw "Health probe failed for $Url after $Attempts attempts."
      }
    }

    Start-Sleep -Seconds $DelaySeconds
  }
}

Require-Command "docker"
Ensure-EnvFile

Invoke-Checked "Docker daemon" {
  & docker info | Out-Null
}

Invoke-Checked "Validate compose config" {
  & docker compose config --quiet
}

if (-not $SkipTests) {
  Invoke-Checked "Full quality gate" {
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\test.ps1"
  }
}

if (-not $StartStack) {
  Write-Host ""
  Write-Host "Preflight passed. Re-run with -StartStack for full homelab deploy rehearsal."
  exit 0
}

$upArgs = @("compose", "up", "-d")
if (-not $NoBuild) {
  $upArgs += "--build"
}

Invoke-Checked "Start compose stack" {
  & docker @upArgs
}

Invoke-Checked "Compose status" {
  & docker compose ps
}

Wait-HttpOk -Url "http://localhost/health"

if (-not $SkipBackup) {
  Invoke-Checked "SQLite backup rehearsal" {
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\backup-profiles.ps1"
  }
}

if (-not $SkipMigrationDryRun) {
  Invoke-Checked "SQLite to Postgres dry-run rehearsal" {
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\migrate-sqlite-to-postgres.ps1" -DryRun
  }
}

if ($Logs) {
  & docker compose logs --tail 80 api web caddy
}

Write-Host ""
Write-Host "Homelab deploy rehearsal completed."
