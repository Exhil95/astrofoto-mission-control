# Development

Ten dokument opisuje workflow developera oraz standardy utrzymania kodu w Astrofoto Mission Control.

## Lokalne Środowisko

Wymagania:

- PowerShell
- Python 3.13
- Node.js 20 LTS albo 22 LTS
- npm
- Docker Desktop lub Docker Engine, jeśli testujesz homelab stack

Pierwsza instalacja:

```powershell
.\scripts\dev.ps1 -Install
```

Start aplikacji:

```powershell
.\scripts\dev.ps1
```

Restart z czyszczeniem portów:

```powershell
.\scripts\dev.ps1 -Restart
```

## Porty

- API dev: `http://127.0.0.1:8000`
- API fallback, gdy 8000 zajęty: `http://127.0.0.1:8001`
- Web dev: `http://127.0.0.1:5173`
- Caddy homelab: `http://localhost`
- MinIO API: `127.0.0.1:9000`
- MinIO Console: `127.0.0.1:9001`

## Quality Gates

Pełny test:

```powershell
.\scripts\test.ps1
```

Co robi skrypt:

- `pytest` w `apps/api`,
- `ruff check .` w `apps/api`,
- `npm run build` w `apps/web`,
- `npm run test:unit` w `apps/web`, jeśli Vitest jest zainstalowany,
- `npm run lint` w `apps/web`, jeśli ESLint jest zainstalowany.

Szybkie uruchomienia:

```powershell
.\scripts\test.ps1 -SkipBackend
.\scripts\test.ps1 -SkipWeb
.\scripts\test.ps1 -SkipLint
```

## Web

Folder:

```text
apps/web
```

Najważniejsze pliki:

- `src/App.tsx`: orkiestracja głównych workflow i layoutu.
- `src/components/*`: panele UI.
- `src/lib/session.ts`: klient API i typy sesji.
- `src/lib/profiles.ts`: klient API i mapping profili.
- `src/lib/forecast.ts`: klient prognozy.
- `src/lib/fov.ts`: lokalne obliczenia FOV.
- `src/lib/exports/*`: buildery Markdown, ICS i wspolny downloader plikow.
- `src/lib/targets.ts`: fallback target catalog z JSON API.
- `src/lib/sky.ts`: reguły sceny, filtrowanie targetów, FOV-fit.
- `src/lib/i18n.ts`: słowniki i helpery tłumaczeń.
- `src/styles.css`: globalny system wizualny.

Komendy:

```powershell
cd apps\web
npm run dev
npm run build
npm run test:unit
npm run lint
```

## API

Folder:

```text
apps/api
```

Najważniejsze pliki:

- `astro_api/main.py`: endpointy FastAPI.
- `astro_api/schemas.py`: kontrakty Pydantic.
- `astro_api/services.py`: planowanie sesji, capture plan, processing plan, multi-session.
- `astro_api/astro_engine.py`: astronomia, Słońce, Księżyc, wysokość targetów.
- `astro_api/forecast.py`: Open-Meteo i cache prognozy.
- `astro_api/fits_ingest.py`: skan FITS i quality scoring.
- `astro_api/profiles.py`: SQLite profile sprzętu.
- `astro_api/session_archive.py`: SQLite archiwum sesji.
- `astro_api/catalog.py`: walidacja target catalog.
- `astro_api/image_cache.py`: cache obrazków targetów.

Komendy:

```powershell
cd apps\api
.\.venv\Scripts\python.exe -m pytest tests
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m uvicorn astro_api.main:app --reload
```

## Kontrakty API

Backend zwraca snake_case, frontend mapuje dane na camelCase w `src/lib/*.ts`.

Zasada:

- Pydantic schemas są źródłem prawdy dla API.
- Frontendowe typy są adapterem UI.
- Nowe pola dodawaj jednocześnie w schema, mapperze i testach.

## Clean Code Rules

Najważniejsze zasady w tym repo:

- UI komponent nie powinien zawierać ciężkiej logiki domenowej, jeśli można ją przenieść do `src/lib`.
- Backendowe formuły astrofoto i astronomiczne zostają w API.
- Frontend może mieć fallbacki, ale canonical planning powinien przychodzić z API.
- Eksporty Markdown/ICS powinny używać tych samych helperów tłumaczeń co UI.
- Nie dodawaj nowego globalnego stanu, jeśli wystarczy lokalny state albo derived memo.
- Nie mieszaj skanu FITS z modyfikacją plików. FITS library jest read-only.
- Przy zmianie API dodaj albo zaktualizuj test.
- Przy zmianie layoutu sceny sprawdź desktop i mobile.
- Nie rozbijaj dużego pliku tylko dla samego rozbijania. Najpierw wyciągaj stabilne granice domenowe.

## Obecne Hot Spoty

Te pliki są największe i wymagają ostrożności:

- `apps/web/src/styles.css`: globalny CSS.
- `apps/web/src/lib/i18n.ts`: wszystkie języki i dynamiczne tłumaczenia.
- `apps/web/src/App.tsx`: orkiestracja workflow.
- `apps/web/src/lib/session.ts`: typy, fallbacki i klient API.
- `apps/api/astro_api/services.py`: wiele strategii planowania.
- `apps/web/src/components/FitsIngestPanel.tsx`: UI, Markdown export i archiwum import draft.
- `apps/api/astro_api/fits_ingest.py`: skan FITS, scoring i biblioteka kalibracji.

## Rekomendowany Refaktor Następny

Najbezpieczniejsza kolejność:

1. Wyciągnąć Markdown/ICS export z `App.tsx` i `FitsIngestPanel.tsx` do `src/lib/exports`.
2. Podzielić `i18n.ts` na `dictionaries/*` plus helpery.
3. Podzielić `services.py` na `session_planning.py`, `capture_planning.py`, `processing_planning.py`, `multi_session.py`.
4. Podzielić `styles.css` na warstwy albo CSS modules dopiero po ustabilizowaniu designu.

## Debugging

Logi dev:

```text
.codex-logs/dev/api.out.log
.codex-logs/dev/api.err.log
.codex-logs/dev/web.out.log
.codex-logs/dev/web.err.log
```

Health:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173
```

Docker:

```powershell
docker compose ps
docker compose logs -f api web caddy
docker compose config --quiet
```
