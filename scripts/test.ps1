param(
  [switch]$SkipBackend,
  [switch]$SkipWeb,
  [switch]$SkipLint,
  [switch]$SkipSmoke
)

. "$PSScriptRoot\lib.ps1"
Enter-RepoRoot

$apiDir = Join-Path $Script:RepoRoot "apps\api"
$webDir = Join-Path $Script:RepoRoot "apps\web"
$apiPython = Join-Path $apiDir ".venv\Scripts\python.exe"

if (-not $SkipBackend) {
  if (-not (Test-Path $apiPython)) {
    throw "API venv not found at apps\api\.venv. Run scripts\dev.ps1 -Install first."
  }

  Invoke-Checked "API pytest" {
    Push-Location $apiDir
    & $apiPython -m pytest tests
    Pop-Location
  }

  Invoke-Checked "API ruff" {
    Push-Location $apiDir
    & $apiPython -m ruff check .
    Pop-Location
  }
}

if (-not $SkipWeb) {
  Require-Command "npm"

  Invoke-Checked "Web build" {
    Push-Location $webDir
    & npm run build
    Pop-Location
  }

  $vitestCmd = Join-Path $webDir "node_modules\.bin\vitest.cmd"
  if (Test-Path $vitestCmd) {
    Invoke-Checked "Web unit tests" {
      Push-Location $webDir
      & npm run test:unit
      Pop-Location
    }
  } else {
    Write-Warning "Skipping web unit tests: vitest is not installed in apps\web\node_modules."
  }

  $eslintCmd = Join-Path $webDir "node_modules\.bin\eslint.cmd"
  if (-not $SkipLint -and (Test-Path $eslintCmd)) {
    Invoke-Checked "Web lint" {
      Push-Location $webDir
      & npm run lint
      Pop-Location
    }
  } elseif (-not $SkipLint) {
    Write-Warning "Skipping web lint: eslint is not installed in apps\web\node_modules."
  }

  $playwrightCmd = Join-Path $webDir "node_modules\.bin\playwright.cmd"
  if (-not $SkipSmoke -and (Test-Path $playwrightCmd)) {
    Invoke-Checked "Web smoke tests" {
      Push-Location $webDir
      & npm run test:smoke
      Pop-Location
    }
  } elseif (-not $SkipSmoke) {
    Write-Warning "Skipping web smoke tests: Playwright is not installed in apps\web\node_modules."
  }
}

Write-Host ""
Write-Host "All requested checks completed."
