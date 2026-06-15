param(
  [switch]$Install,
  [switch]$Restart
)

. "$PSScriptRoot\lib.ps1"
Enter-RepoRoot

Require-Command "npm"

$apiDir = Join-Path $Script:RepoRoot "apps\api"
$webDir = Join-Path $Script:RepoRoot "apps\web"
$logDir = Join-Path $Script:RepoRoot ".codex-logs\dev"
$apiPython = Join-Path $apiDir ".venv\Scripts\python.exe"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if ($Restart) {
  Stop-PortProcess -Port 8000
  Stop-PortProcess -Port 5173
}

if (-not (Test-Path $apiPython)) {
  $pyLauncher = Get-Command "py" -ErrorAction SilentlyContinue
  if ($pyLauncher) {
    Invoke-Checked "Create API venv" { & py -3.13 -m venv (Join-Path $apiDir ".venv") }
  } else {
    Require-Command "python"
    Invoke-Checked "Create API venv" { & python -m venv (Join-Path $apiDir ".venv") }
  }
}

if ($Install -or -not (Test-Path (Join-Path $apiDir ".venv\pyvenv.cfg"))) {
  Invoke-Checked "Install API dependencies" {
    Push-Location $apiDir
    & $apiPython -m pip install -e ".[dev]"
    Pop-Location
  }
}

if ($Install -or -not (Test-Path (Join-Path $webDir "node_modules"))) {
  Invoke-Checked "Install web dependencies" {
    Push-Location $webDir
    & npm install
    Pop-Location
  }
}

if (Test-PortInUse -Port 8000) {
  Write-Warning "Port 8000 is already in use. Use -Restart to stop the existing process first."
} else {
  Start-Process `
    -FilePath $apiPython `
    -ArgumentList "-m", "uvicorn", "astro_api.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $apiDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir "api.out.log") `
    -RedirectStandardError (Join-Path $logDir "api.err.log")
}

if (Test-PortInUse -Port 5173) {
  Write-Warning "Port 5173 is already in use. Use -Restart to stop the existing process first."
} else {
  Start-Process `
    -FilePath "npm" `
    -ArgumentList "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173" `
    -WorkingDirectory $webDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir "web.out.log") `
    -RedirectStandardError (Join-Path $logDir "web.err.log")
}

Write-Host ""
Write-Host "Dev servers:"
Write-Host "  Web: http://127.0.0.1:5173"
Write-Host "  API: http://127.0.0.1:8000"
Write-Host "Logs: $logDir"
