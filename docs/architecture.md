# Architecture

Astrofoto Mission Control jest monorepo z dwoma głównymi aplikacjami: React/Vite frontend i FastAPI backend. Projekt jest visual-first, ale logika astrofoto, astronomiczna i operacyjna ma pozostać na backendzie albo w dedykowanych modułach domenowych.

## Granice Systemu

```text
Browser
  |
  | Vite dev proxy albo Caddy /api
  v
FastAPI
  |
  +-- target catalog JSON
  +-- SQLite profiles/archive
  +-- FITS library read-only mount
  +-- Open-Meteo forecast
  +-- target image cache
```

## Frontend

Folder:

```text
apps/web
```

Odpowiedzialności:

- renderowanie mission-control UI,
- zarządzanie bieżącym workflow,
- wizualizacja FOV i obiektów,
- lokalne fallbacki, gdy API jest niedostępne,
- mapowanie snake_case API na camelCase UI,
- lokalizacja tekstów i eksportów.

Najważniejsze warstwy:

- `components`: panele i widoki.
- `components/fits/FitsPresentation.tsx`: prezentacyjne elementy skanu FITS.
- `lib/session.ts`: klient API dla planów, archive, FITS i fallbacki.
- `lib/profiles.ts`: profile sprzętu.
- `lib/forecast.ts`: prognoza i cache controls.
- `lib/fov.ts`: obliczenia FOV używane w UI.
- `lib/exports/*`: buildery Markdown, ICS i downloader plików.
- `lib/fitsArchive.ts`: draft importu FITS do Session Archive.
- `lib/fitsUi.ts`: drobne helpery stanu UI dla FITS.
- `lib/targets.ts`: target catalog fallback.
- `lib/sky.ts`: reguły sceny, filtrowanie i FOV-fit.
- `lib/i18n.ts`: publiczna fasada i dynamiczne tłumaczenia.
- `lib/i18n/*.ts`: słowniki per język dla EN/PL/DE/IT/ES.
- `e2e/smoke.playwright.ts`: Playwright smoke dla głównych workflow.

## Backend

Folder:

```text
apps/api
```

Odpowiedzialności:

- canonical planning dla sesji, capture, processing i multi-session,
- walidacja kontraktów Pydantic,
- katalog targetów,
- profile i archive w SQLite,
- skan FITS i scoring jakości,
- biblioteka kalibracji,
- cache prognozy,
- cache obrazków targetów.

Najważniejsze moduły:

- `main.py`: routing FastAPI.
- `schemas.py`: request/response models.
- `services.py`: compatibility facade dla publicznych funkcji planowania.
- `session_planning.py`, `capture_planning.py`, `processing_planning.py`: use-case modules dla planowania.
- `tonight_board.py`, `multi_session_planning.py`, `planning_common.py`: ranking nocy, multi-session i wspolne scoringi.
- `astro_engine.py`: obliczenia astronomiczne.
- `forecast.py`: Open-Meteo i cache.
- `fits_ingest.py`: FITS scan, metadata extraction, quality score.
- `profiles.py`: profile sprzętu.
- `session_archive.py`: archiwum sesji.
- `catalog.py`: target catalog validation.
- `image_cache.py`: proxy/cache obrazów targetów.

## Dane

### Target Catalog

Źródło:

```text
apps/api/astro_api/data/targets.json
```

Backend waliduje katalog przez Pydantic. Frontend importuje ten sam JSON jako offline fallback.

### SQLite

Profile i Session Archive są zapisywane w SQLite.

Dev default:

```text
apps/api/astrofoto.sqlite3
```

Docker default:

```text
/data/astrofoto.sqlite3
```

W Dockerze plik jest w wolumenie `astrofoto-data`.

### FITS Library

Folder hosta:

```text
FITS_LIBRARY_ROOT_HOST=./data/fits
```

Folder w kontenerze:

```text
FITS_LIBRARY_ROOT=/data/fits
```

Mount jest read-only. API nie zapisuje ani nie modyfikuje surowych klatek.

### Target Image Cache

Obrazy targetów są cacheowane w:

```text
TARGET_IMAGE_CACHE_DIR=/data/target-image-cache
```

TTL:

```text
TARGET_IMAGE_CACHE_TTL_SECONDS=604800
```

## Przepływy Danych

### Planner

1. UI wybiera target i profil.
2. `calculateFov` liczy lokalny FOV dla natychmiastowej reakcji.
3. UI pobiera Session Plan, Tonight Board i Capture Plan z API.
4. Jeśli API nie odpowiada, frontend używa fallbacków z `session.ts`.

### Weather

1. UI wysyła lokalizację, datę i TTL.
2. API sprawdza cache prognozy.
3. API pobiera Open-Meteo tylko po wygaśnięciu cache albo `force_refresh`.
4. UI pokazuje status i score.

### FITS

1. UI wysyła ścieżkę względną do `FITS_LIBRARY_ROOT`.
2. API wymusza, żeby ścieżka została wewnątrz root.
3. API parsuje nagłówki FITS i liczy quality score.
4. `lib/fitsArchive.ts` dopasowuje target, datę, filtry, tryb i payload archiwum.
5. UI pokazuje manifest i pozwala utworzyć archive entry.

### Calibration Library

1. UI bierze target filters, target exposure, temperature, binning i camera z capture plan/profilu.
2. API skanuje folder kalibracji.
3. API grupuje klatki i nadaje `match`, `usable` albo `review`.
4. UI generuje handoff do obróbki.

## Deployment Architecture

Docker Compose uruchamia:

- `caddy`: publiczny entrypoint i reverse proxy,
- `web`: Vite preview dla zbudowanego UI,
- `api`: FastAPI,
- `postgres`: zarezerwowany dla przyszłych relacyjnych danych,
- `redis`: Valkey dla cache/kolejek,
- `minio`: storage obiektowy dla przyszłych dużych assetów.

Obecnie profile i archiwum są w SQLite, mimo że Postgres jest już w stacku. To świadoma decyzja: prosty homelab persistence teraz, gotowa infrastruktura na późniejszą migrację.

## Clean-code Kierunek

Docelowo:

- `App.tsx` ma być orkiestratorem, nie miejscem logiki domenowej.
- eksporty Markdown/ICS sa w `lib/exports`.
- `i18n.ts` jest fasada, a slowniki sa w plikach per jezyk.
- FITS frontend dzieli flow panelu, prezentacje i draft archiwum na osobne moduly.
- backendowe planowanie jest rozbite wedlug use case z `services.py` jako fasada.
- FITS ingest powinien mieć osobne moduły dla parsera, scoringu i calibration matching.

Aktualny stan i rekomendacje są w [AUDIT.md](AUDIT.md).
