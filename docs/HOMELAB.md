# Homelab Deploy

Astrofoto Mission Control is meant to run behind Caddy as the only public entrypoint.
The API stores equipment profiles in SQLite at `/data/astrofoto.sqlite3`, backed by the
`astrofoto-data` Docker volume.

## First Run

```powershell
.\scripts\deploy.ps1
```

Open `http://localhost` unless you changed `CADDY_SITE_ADDRESS`.

## Ops Scripts

Run these from the repository root:

```powershell
.\scripts\dev.ps1 -Install       # local API + web dev servers
.\scripts\test.ps1               # API pytest/ruff and web production build
.\scripts\deploy.ps1             # docker compose up -d --build
.\scripts\backup-profiles.ps1    # copy /data/astrofoto.sqlite3 to backups/
.\scripts\restore-profiles.ps1 -Path .\backups\astrofoto-YYYYMMDD-HHMMSS.sqlite3
```

Use `.\scripts\dev.ps1 -Restart` when a stale local process is holding ports
`8000` or `5173`. Use `.\scripts\deploy.ps1 -NoBuild` for a fast restart after
configuration-only changes.

## Required `.env` Review

- `CADDY_SITE_ADDRESS`: use `:80` for LAN-only HTTP or a real domain for Caddy-managed TLS.
- `PUBLIC_BASE_URL`: the URL you expect to open in the browser.
- `CORS_ORIGINS`: include `PUBLIC_BASE_URL` and any direct dev origins you use.
- `PROFILE_DATABASE_URL`: keep `sqlite:////data/astrofoto.sqlite3` for Docker persistence.
- `FITS_LIBRARY_ROOT_HOST`: host folder with `.fit`, `.fits`, or `.fts` frames mounted read-only into the API.
- `FITS_LIBRARY_ROOT`: container path for FITS scans, usually `/data/fits`.
- `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `S3_SECRET_ACCESS_KEY`: replace before leaving the service up on a shared network.

## Health Checks

```powershell
docker compose ps
docker compose logs -f api caddy
```

Caddy exposes a lightweight probe:

```powershell
curl http://localhost/health
```

## Data Volumes

- `astrofoto-data`: SQLite profile database at `/data/astrofoto.sqlite3`.
- `FITS_LIBRARY_ROOT_HOST`: read-only bind mount for captured FITS frames, defaulting to `./data/fits`.
- `postgres-data`: reserved relational database volume for future app data.
- `redis-data`: Valkey cache data.
- `minio-data`: object storage.
- `caddy-data` and `caddy-config`: certificates and Caddy state.

The API automatically adds new equipment profile columns on startup, so existing
SQLite profile databases can keep telescope, reducer, camera, filter, guiding,
focuser, and mount metadata without a manual migration step.

## FITS Frame Library

Place captured frames under the host folder from `FITS_LIBRARY_ROOT_HOST`, for example:

```powershell
.\data\fits\2026-06-15-north-america\
```

The API only scans inside `FITS_LIBRARY_ROOT`, reads FITS headers, and returns metadata
such as frame type, filter, exposure, gain, offset, sensor temperature, object name,
camera, and calibration groups. The bind mount is read-only, so the app cannot modify
raw capture data.

## Backup Profiles

```powershell
.\scripts\backup-profiles.ps1
```

## Restore Profiles

```powershell
.\scripts\restore-profiles.ps1 -Path .\backups\astrofoto-YYYYMMDD-HHMMSS.sqlite3
```

Use the exact backup filename you want to restore. The restore script asks for
confirmation and attempts to create a pre-restore backup first.
