# Homelab Deploy

Astrofoto Mission Control jest przygotowane do pracy w homelabie za Caddy. Caddy jest jedynym publicznym entrypointem, web UI działa jako osobny serwis, a API jest dostępne przez `/api`.

## Szybki Deploy

Z repo root:

```powershell
.\scripts\deploy.ps1
```

Skrypt:

1. tworzy `.env` z `.env.example`, jeśli go nie ma,
2. waliduje `docker compose config`,
3. uruchamia `docker compose up -d --build`,
4. pokazuje `docker compose ps`,
5. sprawdza `http://localhost/health`.

Szybki restart bez buildu:

```powershell
.\scripts\deploy.ps1 -NoBuild
```

Logi po deployu:

```powershell
.\scripts\deploy.ps1 -Logs
```

## Deploy Rehearsal

Przed betą używaj rehearsal zamiast od razu robić deploy “na czuja”.

Bezpieczny preflight bez startowania stacka:

```powershell
.\scripts\rehearse-deploy.ps1
```

Pełna próba homelab:

```powershell
.\scripts\rehearse-deploy.ps1 -StartStack
```

Co sprawdza:

1. Docker daemon,
2. obecność albo utworzenie `.env`,
3. `docker compose config --quiet`,
4. pełny quality gate, chyba że użyjesz `-SkipTests`,
5. opcjonalny start stacka,
6. `http://localhost/health`,
7. backup SQLite,
8. dry-run migracji SQLite -> Postgres.

Przy szybkiej próbie bez buildu:

```powershell
.\scripts\rehearse-deploy.ps1 -StartStack -NoBuild
```

Gdy chcesz zobaczyć logi API/web/Caddy po próbie:

```powershell
.\scripts\rehearse-deploy.ps1 -StartStack -Logs
```

## `.env` Checklist

Przed zostawieniem stacka na stałe przejrzyj:

```env
CADDY_SITE_ADDRESS=:80
PUBLIC_BASE_URL=http://localhost
CORS_ORIGINS=http://localhost,http://localhost:5173
AUTH_SESSION_TTL_HOURS=720
POSTGRES_PASSWORD=change-me
MINIO_ROOT_PASSWORD=change-me-minio
S3_SECRET_ACCESS_KEY=change-me-minio
FITS_LIBRARY_ROOT_HOST=./data/fits
FITS_LIBRARY_ROOT=/data/fits
```

Rekomendacje:

- LAN HTTP: `CADDY_SITE_ADDRESS=:80`.
- Domena z TLS Caddy: `CADDY_SITE_ADDRESS=astro.example.com`.
- `AUTH_SESSION_TTL_HOURS=720` daje 30 dni sesji. Dla dostepu spoza LAN rozwaz krotszy TTL, np. `168`.
- Jeśli używasz domeny, dodaj ją do `PUBLIC_BASE_URL` i `CORS_ORIGINS`.
- Sekrety zmień przed wystawieniem usług poza własny komputer.

## Serwisy Compose

### `caddy`

- porty: `80`, `443`,
- config: `infra/Caddyfile`,
- proxy web i API,
- health endpoint `/health`.

### `web`

- zbudowany frontend,
- zależy od zdrowego API,
- healthcheck przez lokalny fetch.

### `api`

- FastAPI,
- profile i archive w SQLite,
- FITS library read-only,
- target image cache.

### `postgres`

Obecnie przygotowany pod migrację profili i archive. SQLite jest nadal domyślnym systemem zapisu runtime, ale repo ma prototyp migracji opisany w [POSTGRES_MIGRATION.md](POSTGRES_MIGRATION.md).

### `redis`

Valkey. Zarezerwowany pod cache/kolejki.

### `minio`

Object storage dla przyszłych dużych assetów. Konsola jest zbindowana lokalnie:

```text
127.0.0.1:9001
```

## Wolumeny

- `astrofoto-data`: `/data`, SQLite i cache obrazów.
- `postgres-data`: Postgres.
- `redis-data`: Valkey.
- `minio-data`: MinIO.
- `caddy-data`: certyfikaty i dane Caddy.
- `caddy-config`: config state Caddy.

## SQLite

Domyślny Docker URL:

```env
PROFILE_DATABASE_URL=sqlite:////data/astrofoto.sqlite3
```

API automatycznie zapewnia aktualne kolumny profili i archive przy starcie. Nie ma jeszcze pełnego systemu migracji, więc backup SQLite przed dużymi zmianami jest obowiązkowy.

## SQLite -> Postgres Prototype

Dry-run migracji:

```powershell
.\scripts\migrate-sqlite-to-postgres.ps1 -DryRun
```

Właściwe kopiowanie danych do Postgresa:

```powershell
.\scripts\migrate-sqlite-to-postgres.ps1
```

Na tym etapie nie zmieniaj produkcyjnego `PROFILE_DATABASE_URL` na Postgres, bo runtime profili i archive nadal używa adaptera SQLite. Szczegóły i weryfikacja są w [POSTGRES_MIGRATION.md](POSTGRES_MIGRATION.md).

## Backup

```powershell
.\scripts\backup-profiles.ps1
```

Backup trafia do:

```text
backups/astrofoto-YYYYMMDD-HHMMSS.sqlite3
```

Backup SQLite zawiera profile, Session Archive, lokalne konta operatorow i hashe hasel. Traktuj ten plik jak sekret.

## Restore

```powershell
.\scripts\restore-profiles.ps1 -Path .\backups\astrofoto-YYYYMMDD-HHMMSS.sqlite3
```

Restore pyta o potwierdzenie i próbuje zrobić pre-restore backup.

## FITS Library

Domyślnie:

```text
data/fits
```

Przykład struktury:

```text
data/fits/
  2026-06-15-north-america/
    Light/
    Flat/
    Dark/
    Bias/
```

API skanuje wyłącznie wewnątrz `FITS_LIBRARY_ROOT`. Próba wyjścia poza root kończy się błędem.

Obsługiwane rozszerzenia:

- `.fit`
- `.fits`
- `.fts`

Mount w Compose jest read-only:

```yaml
${FITS_LIBRARY_ROOT_HOST:-./data/fits}:${FITS_LIBRARY_ROOT:-/data/fits}:ro
```

## Health I Diagnostyka

Status:

```powershell
docker compose ps
```

Logi:

```powershell
docker compose logs -f api web caddy
```

Health przez Caddy:

```powershell
curl http://localhost/health
```

Health API bezpośrednio w kontenerze:

```powershell
docker compose exec api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/health').read())"
```

Walidacja Caddy:

```powershell
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile
```

## Aktualizacja

Typowy flow:

```powershell
git pull
.\scripts\test.ps1
.\scripts\backup-profiles.ps1
.\scripts\deploy.ps1
```

Przy zmianach tylko w `.env` albo Caddy:

```powershell
.\scripts\deploy.ps1 -NoBuild
```

## Bezpieczeństwo

- Login/rejestracja uzywa lokalnych kont operatorow w SQLite. Hasla sa hashowane przez PBKDF2-SHA256, a bearer tokeny sa przechowywane jako SHA-256.
- Minimalna dlugosc hasla w API to 8 znakow, ale dla homelabu uzywaj passphrase 16+ znakow.
- Nie udostepniaj aplikacji poza LAN bez TLS. Dla domeny uzyj Caddy-managed TLS i ustaw `PUBLIC_BASE_URL` oraz `CORS_ORIGINS` na prawdziwy origin.
- Trzymaj `CORS_ORIGINS` wasko. Nie dodawaj `*` przy bearer tokenach.
- Backup SQLite zawiera `auth_users` i `auth_sessions`, wiec przechowuj go offline albo w zaszyfrowanym miejscu.
- Przy podejrzeniu wycieku tokena wyloguj operatora w UI. Jesli chcesz uniewaznic wszystkie sesje, po backupie usun wpisy z tabeli `auth_sessions` w SQLite i zrestartuj API.
- Nie wystawiaj MinIO publicznie bez osobnej konfiguracji auth/TLS.
- Nie używaj domyślnych sekretów z `.env.example`.
- FITS mount trzymaj read-only.
- Dla domeny użyj Caddy-managed TLS.
- Jeśli aplikacja ma być dostępna spoza LAN, rozważ reverse proxy za VPN albo access control.

## Znane Ograniczenia

- PostgreSQL i MinIO są gotowe infrastrukturalnie, ale większość danych aplikacyjnych nadal zapisuje SQLite.
- Nie ma jeszcze pełnego migration framework.
- Nie ma jeszcze background workerów dla długich zadań.
- FITS scan działa synchronicznie i powinien mieć rozsądny `max_files`.
