# Homelab Deploy

Astrofoto Mission Control is meant to run behind Caddy as the only public entrypoint.
The API stores equipment profiles in SQLite at `/data/astrofoto.sqlite3`, backed by the
`astrofoto-data` Docker volume.

## First Run

```powershell
copy .env.example .env
docker compose up -d --build
docker compose ps
```

Open `http://localhost` unless you changed `CADDY_SITE_ADDRESS`.

## Required `.env` Review

- `CADDY_SITE_ADDRESS`: use `:80` for LAN-only HTTP or a real domain for Caddy-managed TLS.
- `PUBLIC_BASE_URL`: the URL you expect to open in the browser.
- `CORS_ORIGINS`: include `PUBLIC_BASE_URL` and any direct dev origins you use.
- `PROFILE_DATABASE_URL`: keep `sqlite:////data/astrofoto.sqlite3` for Docker persistence.
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
- `postgres-data`: reserved relational database volume for future app data.
- `redis-data`: Valkey cache data.
- `minio-data`: object storage.
- `caddy-data` and `caddy-config`: certificates and Caddy state.

## Backup Profiles

```powershell
New-Item -ItemType Directory -Force backups
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
docker compose cp api:/data/astrofoto.sqlite3 "backups/astrofoto-$stamp.sqlite3"
```

## Restore Profiles

```powershell
docker compose stop api
docker compose cp .\backups\astrofoto-YYYYMMDD-HHMMSS.sqlite3 api:/data/astrofoto.sqlite3
docker compose start api
```

Use the exact backup filename you want to restore.
