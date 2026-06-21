# SQLite To Postgres Migration

Ten dokument opisuje prototyp migracji profili sprzętu i Session Archive z lokalnego SQLite do PostgreSQL w homelab stacku.

## Status

Obecny runtime aplikacji nadal używa:

```env
PROFILE_DATABASE_URL=sqlite:////data/astrofoto.sqlite3
```

PostgreSQL jest już w `docker-compose.yml`, a prototyp migracji potrafi utworzyć tabele i skopiować dane do Postgresa. To jest etap przygotowania drogi migracyjnej, nie automatyczne przełączenie aplikacji na Postgres.

## Co Jest Migrowane

Źródło SQLite:

- `equipment_profiles`
- `session_archives`

Cel PostgreSQL:

- `equipment_profiles`
- `session_archives`

Różnice typów:

- `session_archives.filter_names`: SQLite `TEXT` z JSON stringiem -> PostgreSQL `JSONB`
- `session_archives.white_night`: SQLite `0/1` -> PostgreSQL `BOOLEAN`
- `session_archives.session_date`: SQLite `TEXT` -> PostgreSQL `DATE`
- pola liczbowe są przenoszone do `INTEGER` albo `DOUBLE PRECISION`

## Bezpieczny Flow Homelab

1. Zrób backup SQLite.

```powershell
.\scripts\backup-profiles.ps1
```

2. Sprawdź, czy stack działa.

```powershell
docker compose ps
```

3. Uruchom dry-run migracji.

```powershell
.\scripts\migrate-sqlite-to-postgres.ps1 -DryRun
```

Dry-run tylko czyta SQLite i wypisuje liczbę wierszy.

4. Wykonaj migrację do Postgresa.

```powershell
.\scripts\migrate-sqlite-to-postgres.ps1
```

Skrypt odpala:

```text
python -m astro_api.postgres_migration
```

wewnątrz kontenera `api`, więc domyślnie widzi:

- SQLite: `/data/astrofoto.sqlite3`
- Postgres: `postgres:5432`
- `DATABASE_URL` z `.env`

## Weryfikacja

Po migracji:

```powershell
docker compose exec postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -c "select count(*) from equipment_profiles;"
docker compose exec postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -c "select count(*) from session_archives;"
```

Albo bez zmiennych:

```powershell
docker compose exec postgres psql -U astrofoto -d astrofoto -c "select id, name, site_name from equipment_profiles order by id;"
docker compose exec postgres psql -U astrofoto -d astrofoto -c "select id, target_name, session_date, filter_names from session_archives order by session_date desc, id desc;"
```

## Idempotencja

Migrator używa `ON CONFLICT (id) DO UPDATE`, więc można go odpalić ponownie. Zachowuje oryginalne `id`, a po migracji resetuje sekwencje identity do najwyższego przeniesionego `id`.

## Rollback

Na tym etapie runtime nadal czyta SQLite, więc rollback aplikacji to po prostu brak przełączenia `PROFILE_DATABASE_URL`.

Jeśli SQLite zostanie uszkodzony podczas innych operacji:

```powershell
.\scripts\restore-profiles.ps1 -Path .\backups\astrofoto-YYYYMMDD-HHMMSS.sqlite3
```

## Przyszłe Przełączenie Runtime

Następny etap, przed betą, powinien dodać storage adapter:

```text
astro_api/storage/
  sqlite_profiles.py
  postgres_profiles.py
  sqlite_session_archive.py
  postgres_session_archive.py
```

Wtedy `PROFILE_DATABASE_URL` będzie mógł przyjąć:

```env
PROFILE_DATABASE_URL=postgresql+psycopg://astrofoto:change-me@postgres:5432/astrofoto
```

Do czasu dodania adaptera nie zmieniaj `PROFILE_DATABASE_URL` na Postgres w produkcyjnym `.env`, bo aktualne moduły `profiles.py` i `session_archive.py` używają `sqlite3`.

## Kryterium Gotowości Do Przełączenia

- migracja dry-run przechodzi,
- migracja właściwa kopiuje oczekiwaną liczbę profili i archiwów,
- API ma testy dla adaptera Postgres,
- backup SQLite istnieje i restore był przetestowany,
- `.env` ma nie-domyślne hasło Postgresa,
- homelab deploy po przełączeniu przechodzi healthcheck.
