# Development

Ten dokument opisuje workflow developera oraz standardy utrzymania kodu w Astrofoto Mission Control.

## Lokalne Srodowisko

Wymagania:

- PowerShell
- Python 3.13
- Node.js 20 LTS albo 22 LTS
- npm
- Docker Desktop lub Docker Engine, jesli testujesz homelab stack

Pierwsza instalacja:

```powershell
.\scripts\dev.ps1 -Install
```

Start aplikacji:

```powershell
.\scripts\dev.ps1
```

Restart z czyszczeniem portow:

```powershell
.\scripts\dev.ps1 -Restart
```

## Porty

- API dev: `http://127.0.0.1:8000`
- API fallback, gdy 8000 zajety: `http://127.0.0.1:8001`
- Web dev: `http://127.0.0.1:5173`
- Caddy homelab: `http://localhost`
- MinIO API: `127.0.0.1:9000`
- MinIO Console: `127.0.0.1:9001`

## Quality Gates

Pelny test:

```powershell
.\scripts\test.ps1
```

Co robi skrypt:

- `pytest` w `apps/api`
- `ruff check .` w `apps/api`
- `npm run build` w `apps/web`
- `npm run test:unit` w `apps/web`, jesli Vitest jest zainstalowany
- `npm run lint` w `apps/web`, jesli ESLint jest zainstalowany
- `npm run test:smoke` w `apps/web`, jesli Playwright jest zainstalowany

Szybkie uruchomienia:

```powershell
.\scripts\test.ps1 -SkipBackend
.\scripts\test.ps1 -SkipWeb
.\scripts\test.ps1 -SkipLint
.\scripts\test.ps1 -SkipSmoke
```

## Web

Folder:

```text
apps/web
```

Najwazniejsze pliki:

- `src/App.tsx`: orkiestracja glownych workflow i layoutu.
- `src/components/*`: panele UI.
- `src/lib/session.ts`: klient API i typy sesji.
- `src/lib/profiles.ts`: klient API i mapping profili.
- `src/lib/forecast.ts`: klient prognozy.
- `src/lib/fov.ts`: lokalne obliczenia FOV.
- `src/lib/exports/*`: buildery Markdown, ICS i wspolny downloader plikow.
- `src/lib/fitsArchive.ts`: budowanie draftu importu FITS do Session Archive.
- `src/lib/fitsUi.ts`: drobne helpery stanu UI dla panelu FITS.
- `src/lib/targets.ts`: fallback target catalog z JSON API.
- `src/lib/sky.ts`: reguly sceny, filtrowanie targetow, FOV-fit.
- `src/lib/i18n.ts`: publiczna fasada i dynamiczne helpery tlumaczen.
- `src/lib/i18n/*.ts`: slowniki per jezyk dla EN/PL/DE/IT/ES.
- `src/components/fits/FitsPresentation.tsx`: prezentacyjne listy i statusy skanu FITS.
- `e2e/smoke.playwright.ts`: Playwright smoke dla Planner, Session/Capture, Frames i Multi.
- `src/styles.css`: globalny system wizualny.

Komendy:

```powershell
cd apps\web
npm run dev
npm run build
npm run test:unit
npm run lint
npm run test:smoke
```

Pierwsze uruchomienie smoke testow po instalacji zaleznosci:

```powershell
cd apps\web
npx playwright install chromium
```

## API

Folder:

```text
apps/api
```

Najwazniejsze pliki:

- `astro_api/main.py`: endpointy FastAPI.
- `astro_api/schemas.py`: kontrakty Pydantic.
- `astro_api/services.py`: compatibility facade dla publicznych funkcji planowania.
- `astro_api/session_planning.py`: plan pojedynczej sesji i timeline.
- `astro_api/capture_planning.py`: capture runbook i Markdown plan.
- `astro_api/processing_planning.py`: rekomendacje stackowania i obrobki.
- `astro_api/tonight_board.py`: ranking targetow na jedna noc.
- `astro_api/multi_session_planning.py`: planowanie wielu nocy.
- `astro_api/planning_common.py`: wspolne scoringi i etykiety planowania.
- `astro_api/astro_engine.py`: astronomia, Slonce, Ksiezyc, wysokosc targetow.
- `astro_api/forecast.py`: Open-Meteo i cache prognozy.
- `astro_api/fits_ingest.py`: skan FITS i quality scoring.
- `astro_api/postgres_migration.py`: prototyp migracji SQLite profiles/archive do Postgresa.
- `astro_api/profiles.py`: SQLite profile sprzetu.
- `astro_api/session_archive.py`: SQLite archiwum sesji.
- `astro_api/catalog.py`: walidacja target catalog.
- `astro_api/image_cache.py`: cache obrazkow targetow.

Komendy:

```powershell
cd apps\api
.\.venv\Scripts\python.exe -m pytest tests
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m uvicorn astro_api.main:app --reload
```

Prototyp migracji SQLite -> Postgres w kontenerze homelab:

```powershell
.\scripts\migrate-sqlite-to-postgres.ps1 -DryRun
.\scripts\migrate-sqlite-to-postgres.ps1
```

Szczegoly i ograniczenia sa w `docs/POSTGRES_MIGRATION.md`.

Homelab deploy rehearsal przed releasem:

```powershell
.\scripts\rehearse-deploy.ps1
.\scripts\rehearse-deploy.ps1 -StartStack
```

## Kontrakty API

Backend zwraca snake_case, frontend mapuje dane na camelCase w `src/lib/*.ts`.

Zasada:

- Pydantic schemas sa zrodlem prawdy dla API.
- Frontendowe typy sa adapterem UI.
- Nowe pola dodawaj jednoczesnie w schema, mapperze i testach.

## Versioning

Aktualna alpha jest zapisana w:

- `VERSION`: semver projektu, np. `0.1.0-alpha.0`,
- `apps/web/package.json`: semver frontendu,
- `apps/api/pyproject.toml`: wersja PEP 440 API, np. `0.1.0a0` dla `0.1.0-alpha.0`,
- `docs/RELEASES.md`: release notes.

## Clean Code Rules

Najwazniejsze zasady w tym repo:

- UI komponent nie powinien zawierac ciezkiej logiki domenowej, jesli mozna ja przeniesc do `src/lib`.
- Backendowe formuly astrofoto i astronomiczne zostaja w API.
- Frontend moze miec fallbacki, ale canonical planning powinien przychodzic z API.
- Eksporty Markdown/ICS powinny uzywac tych samych helperow tlumaczen co UI.
- Nie dodawaj nowego globalnego stanu, jesli wystarczy lokalny state albo derived memo.
- Nie mieszaj skanu FITS z modyfikacja plikow. FITS library jest read-only.
- Przy zmianie API dodaj albo zaktualizuj test.
- Przy zmianie layoutu sceny sprawdz desktop i mobile.
- Nie rozbijaj duzego pliku tylko dla samego rozbijania. Najpierw wyciagaj stabilne granice domenowe.

## Obecne Hot Spoty

Te pliki sa najwieksze i wymagaja ostroznosci:

- `apps/web/src/styles.css`: globalny CSS.
- `apps/web/src/App.tsx`: orkiestracja workflow.
- `apps/web/src/lib/session.ts`: typy, fallbacki i klient API.
- `apps/api/astro_api/fits_ingest.py`: skan FITS, scoring i biblioteka kalibracji.

## Rekomendowany Refaktor Nastepny

Najbezpieczniejsza kolejnosc:

1. Rozbic `apps/api/astro_api/fits_ingest.py` na parser, scoring i calibration matching.
2. Podzielic `styles.css` na warstwy albo CSS modules dopiero po ustabilizowaniu designu.

## Debugging

Typowy lokalny przebieg:

1. Sprawdz `.\scripts\dev.ps1`, czy API i web wstaly.
2. Sprawdz `http://127.0.0.1:8000/health`.
3. Jesli web nie odpowiada, zobacz logi w `.codex-logs/dev`.
4. Jesli backend zwraca 500, odpal endpoint przez `/docs` i sprawdz payload.
5. Po zmianach uruchom `.\scripts\test.ps1`.
