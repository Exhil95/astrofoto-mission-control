# Application Audit

Data audytu: 2026-06-21

Zakres:

- struktura monorepo,
- granice frontend/backend,
- testy i lint,
- deploy homelab,
- dokumentacja,
- największe pliki i hot spoty,
- ryzyka clean code.

## Stan Ogólny

Projekt jest funkcjonalnie bogaty i ma zdrową bazę testową po stronie API. Frontend ma production build i od tego audytu również aktywny ESLint. Homelab stack ma sensowny kierunek: Caddy jako entrypoint, API jako canonical backend i read-only FITS library.

## Co Zostało Poprawione W Tym Passie

### Frontend Lint

Dodano:

- `eslint`,
- `@eslint/js`,
- `typescript-eslint`,
- `eslint-plugin-react-hooks`,
- `eslint-plugin-react-refresh`,
- `apps/web/eslint.config.js`.

Efekt:

- `npm run lint` działa,
- `scripts/test.ps1` uruchamia lint zamiast pomijać go z ostrzeżeniem,
- poprawiono wykryte warningi hooków React.

### Sky Logic Extraction

Dodano:

```text
apps/web/src/lib/sky.ts
```

Przeniesiono tam:

- typ `SkyDisplayMode`,
- typ `SkyFitFilter`,
- `isSkyDisplayMode`,
- `formatObjectFootprint`,
- `filterSkyTargets`,
- `curateSkyTargets`,
- `calculateFitLabel`.

Efekt:

- `App.tsx` ma mniej logiki domenowej sceny,
- reguły FOV-fit i kuracji targetów mają własne miejsce,
- łatwiej testować i rozbudowywać mapę nieba.

### FITS Frontend Split

Dodano:

- `apps/web/src/lib/fitsArchive.ts`,
- `apps/web/src/lib/fitsUi.ts`,
- `apps/web/src/components/fits/FitsPresentation.tsx`.

Efekt:

- `FitsIngestPanel.tsx` steruje już głównie stanem skanu, importem i pobieraniem handoffu,
- draft importu do Session Archive jest logiką domenową w `lib/fitsArchive.ts`,
- prezentacja grup, klatek i statusów skanu jest w osobnym komponencie,
- eksporty Markdown pozostają w `lib/exports/fits.ts`.

### Playwright Smoke Tests

Dodano:

- `apps/web/playwright.config.ts`,
- `apps/web/e2e/smoke.playwright.ts`,
- `npm run test:smoke`,
- `scripts/test.ps1 -SkipSmoke`.

Efekt:

- smoke testy przechodzą przez Planner, Session/Capture, Frames i Multi,
- testy blokują regresje top bara, przełączania workspace i podstawowych paneli,
- requesty `/api/` są abortowane w testach, więc frontend smoke działa na fallbackach bez backendu.

### SQLite -> Postgres Migration Prototype

Dodano:

- `apps/api/astro_api/postgres_migration.py`,
- `apps/api/tests/test_postgres_migration.py`,
- `scripts/migrate-sqlite-to-postgres.ps1`,
- `docs/POSTGRES_MIGRATION.md`.

Efekt:

- migrator tworzy docelowe tabele `equipment_profiles` i `session_archives` w Postgresie,
- kopiuje dane z SQLite z zachowaniem `id`,
- normalizuje `filter_names` do JSONB i `white_night` do boolean,
- ma dry-run oraz testy bez wymagania żywego Postgresa.

### React Hooks

Poprawiono:

- dependency array w `ProfileDock`,
- dependency array w `SkyScene`.

### Dokumentacja

Dodano lub przebudowano:

- `README.md`,
- `docs/USER_GUIDE.md`,
- `docs/DEVELOPMENT.md`,
- `docs/API.md`,
- `docs/architecture.md`,
- `docs/HOMELAB.md`,
- `docs/AUDIT.md`.

## Wynik Audytu Plików

Największe pliki:

| Plik | Ryzyko |
| --- | --- |
| `apps/web/src/styles.css` | globalny CSS, duże ryzyko przypadkowych regresji layoutu |
| `apps/web/src/App.tsx` | orkiestruje wiele workflow |
| `apps/web/src/lib/session.ts` | klient API, typy i fallbacki w jednym module |
| `apps/api/astro_api/fits_ingest.py` | parser, scoring i calibration matching razem |

## Ocena Ryzyk

### Wysokie

`App.tsx` nadal miesza:

- workspace state,
- API effects,
- archive actions,
- export Markdown/ICS,
- layout sceny.

Rekomendacja: wyciągać kolejne moduły nie-UI do `src/lib`.

### Wysokie

`apps/web/src/lib/session.ts` nadal łączy typy API, normalizację payloadów, klienta HTTP i fallbacki offline.

Rekomendacja: rozdzielić klienta API, typy kontraktów i fallbacki planowania dopiero po dodaniu smoke testów UI.

### Średnie

`apps/api/astro_api/fits_ingest.py` łączy skan plików FITS, parsing nagłówków, quality scoring i calibration matching.

Rekomendacja:

- `fits_parser.py`,
- `fits_quality.py`,
- `calibration_matching.py`,
- `fits_ingest.py` jako fasada use-case.

### Średnie

`services.py` jest juz compatibility facade dla backendowego planowania. Logika use-case mieszka w osobnych modulach.

Rekomendacja:
- `session_planning.py`,
- `capture_planning.py`,
- `processing_planning.py`,
- `tonight_board.py`,
- `multi_session_planning.py`,
- `planning_common.py`.

### Średnie

Docker Compose ma Postgres i MinIO, a migrator do Postgresa istnieje, ale runtime app data nadal jest w SQLite.

Rekomendacja: zostawić SQLite jako default homelab do alphy, a przed betą dodać runtime storage adapter dla Postgresa.

### Niskie

Node lokalnie może być w wersji nieparzystej, która generuje warningi engine dla części paczek.

Rekomendacja: używać Node 20 LTS albo 22 LTS.

## Security I Ops

Pozytywne:

- `.env` nie jest trackowany,
- `.env.example` dokumentuje wymagane zmienne,
- FITS library jest read-only w Compose,
- Caddy jest jednym entrypointem,
- profile/archive mają backup/restore scripts.

Do poprawy później:

- migration framework dla SQLite,
- opcjonalne auth przed wystawieniem poza LAN,
- worker dla cięższych FITS scanów,
- limity rate/size na endpointach długich operacji.

## Test Coverage

Obecnie API ma testy dla:

- FOV,
- forecast,
- profiles,
- targets,
- session archive,
- FITS ingest.

Braki:

- testy web unit/component,
- testy eksportów Markdown/ICS,
- testy i18n completeness,
- test Docker Compose w CI/local smoke.

## Priorytet Następnych Refaktorów

1. Rozbic backendowy `fits_ingest.py` na parser, scoring i calibration matching.
2. Dodac runtime storage adapter dla Postgresa przed betą.
3. Podzielic `styles.css` na warstwy po stabilizacji designu.

## Kryterium Done Dla Obecnego Passa

- Pełny test runner przechodzi.
- Lint frontendu działa i przechodzi.
- README istnieje i prowadzi do dokumentów szczegółowych.
- API i homelab mają aktualne docs.
- Największe znane hot spoty są nazwane i mają rekomendowaną kolejność redukcji.
