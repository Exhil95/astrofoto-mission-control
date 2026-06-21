param(
  [string]$SqliteUrl = "sqlite:////data/astrofoto.sqlite3",
  [string]$PostgresUrl = "",
  [switch]$DryRun
)

. "$PSScriptRoot\lib.ps1"
Enter-RepoRoot

Require-Command "docker"

$arguments = @(
  "compose",
  "exec",
  "-T",
  "api",
  "python",
  "-m",
  "astro_api.postgres_migration",
  "--sqlite-url",
  $SqliteUrl
)

if ($PostgresUrl) {
  $arguments += @("--postgres-url", $PostgresUrl)
}

if ($DryRun) {
  $arguments += "--dry-run"
}

Invoke-Checked "SQLite to Postgres migration prototype" {
  & docker @arguments
}
