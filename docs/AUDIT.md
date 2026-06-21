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
| `apps/web/src/lib/i18n.ts` | wszystkie języki i dynamiczne tłumaczenia w jednym pliku |
| `apps/web/src/App.tsx` | orkiestruje zbyt wiele workflow |
| `apps/web/src/lib/session.ts` | klient API, typy i fallbacki w jednym module |
| `apps/api/astro_api/services.py` | wiele use case planowania w jednym module |
| `apps/web/src/components/FitsIngestPanel.tsx` | UI, Markdown export i archive import draft razem |
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

`i18n.ts` jest bardzo duży. Przy pięciu językach łatwo o konflikt albo niepełny mapping.

Rekomendacja: podzielić na:

```text
src/lib/i18n/
  index.ts
  types.ts
  common.ts
  en.ts
  pl.ts
  de.ts
  it.ts
  es.ts
  dynamic.ts
```

### Średnie

`FitsIngestPanel.tsx` ma zbyt wiele odpowiedzialności.

Rekomendacja:

- `lib/fitsExport.ts`,
- `lib/archiveDrafts.ts`,
- UI zostawić w komponencie.

### Średnie

`services.py` jest centrum backendowego planowania.

Rekomendacja:

- `session_planning.py`,
- `capture_planning.py`,
- `processing_planning.py`,
- `multi_session.py`,
- `tonight_board.py`.

### Średnie

Docker Compose ma Postgres i MinIO, ale app data nadal jest w SQLite.

Rekomendacja: zostawić SQLite jako default homelab, ale opisać przyszłą migrację do Postgres zanim archive/profile urosną.

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
- test e2e głównych ścieżek UI,
- test Docker Compose w CI/local smoke.

## Priorytet Następnych Refaktorów

1. Wyciągnąć eksporty Markdown/ICS z UI do `src/lib/exports`.
2. Podzielić `i18n.ts` na folder per język.
3. Dodać testy dla `lib/sky.ts` i exportów.
4. Rozbić `services.py` według use case.
5. Rozbić `FitsIngestPanel.tsx` na UI + export helpers + archive draft helpers.
6. Dodać Playwright smoke dla trybów Planner/Sesja/Klatki/Multi.
7. Dodać dokument migracji SQLite -> Postgres.

## Kryterium Done Dla Obecnego Passa

- Pełny test runner przechodzi.
- Lint frontendu działa i przechodzi.
- README istnieje i prowadzi do dokumentów szczegółowych.
- API i homelab mają aktualne docs.
- Największe znane hot spoty są nazwane i mają rekomendowaną kolejność redukcji.
