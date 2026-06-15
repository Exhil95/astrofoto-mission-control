$ErrorActionPreference = "Stop"

$Script:RepoRoot = Split-Path -Parent $PSScriptRoot

function Enter-RepoRoot {
  Set-Location $Script:RepoRoot
}

function Require-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Ensure-EnvFile {
  Enter-RepoRoot
  $envPath = Join-Path $Script:RepoRoot ".env"
  $examplePath = Join-Path $Script:RepoRoot ".env.example"

  if (-not (Test-Path $envPath)) {
    Copy-Item -LiteralPath $examplePath -Destination $envPath
    Write-Host "Created .env from .env.example. Review secrets before exposing the service."
  }
}

function Test-PortInUse {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  return $null -ne $connection
}

function Stop-PortProcess {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
      Write-Host "Stopping $($process.ProcessName) on port $Port (PID $($process.Id))"
      Stop-Process -Id $process.Id -Force
    }
  }
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Label"
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE."
  }
}
