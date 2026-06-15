param(
  [switch]$NoBuild,
  [switch]$Logs
)

. "$PSScriptRoot\lib.ps1"
Enter-RepoRoot

Require-Command "docker"
Ensure-EnvFile

Invoke-Checked "Validate compose config" {
  & docker compose config --quiet
}

$upArgs = @("compose", "up", "-d")
if (-not $NoBuild) {
  $upArgs += "--build"
}

Invoke-Checked "Deploy compose stack" {
  & docker @upArgs
}

Invoke-Checked "Compose status" {
  & docker compose ps
}

try {
  $health = Invoke-WebRequest -UseBasicParsing "http://localhost/health" -TimeoutSec 10
  Write-Host "Health: $($health.StatusCode) http://localhost/health"
} catch {
  Write-Warning "Health probe failed. Check 'docker compose logs api caddy'."
}

if ($Logs) {
  & docker compose logs --tail 80 api caddy
}
