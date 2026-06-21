# Astrofoto Mission Control

Astrofoto Mission Control to lokalna aplikacja do planowania sesji astrofotograficznych, kontroli pola widzenia, wyboru targetów, przygotowania runbooków akwizycji, analizy klatek FITS i organizacji archiwum sesji. Projekt jest budowany z myślą o homelabie: działa lokalnie, obsługuje foldery z klatkami zamontowane read-only i ma gotowy stack Docker Compose z Caddy jako wejściem.

## Co Jest W Aplikacji

- Interaktywna mapa nieba z realistycznym porównaniem rozmiaru obiektu do aktualnego FOV.
- Katalog targetów Messier, NGC, IC, Sharpless i Barnard z filtrami po typie, sezonie, skali i dopasowaniu do setupu.
- Profile sprzętu: teleskop, reduktor, kamera, sensor, filtry, guiding, focuser, montaż i miejscówka.
- Tonight Board: ranking najlepszych obiektów na daną noc z pogodą, Księżycem, wysokością, białymi nocami i FOV.
- Multi-session Planner: planowanie wielu nocy i eksport najlepszych nocy do `.ics`.
- Capture Plan: ekspozycje, liczba klatek, dithering, autofocus, kalibracja i eksport Markdown.
- Processing Planner: strategia stackowania, drizzle/binning, normalizacja, ryzyko gradientu i workflow.
- FITS ingest: skan folderu klatek, metadane z headerów, quality score, FWHM, eccentricity, star count i flagi review.
- Calibration library: dopasowanie darków, flatów, biasów po filtrze, ekspozycji, temperaturze, binningu i kamerze.
- Session Archive: zapis planowanych i zarejestrowanych sesji z notatkami oraz Markdownem.
- Tłumaczenia UI i eksportów: EN, PL, DE, IT, ES.

## Stack

- Web: Vite, React, TypeScript, Three.js, React Three Fiber, Lucide icons.
- API: FastAPI, Pydantic, Astropy/Astroplan, NumPy.
- Dane: JSON target catalog, SQLite dla profili i archiwum sesji.
- Homelab: Docker Compose, Caddy, Valkey, PostgreSQL, MinIO.
- Quality gates: pytest, ruff, TypeScript build, Vitest unit tests, ESLint.

## Szybki Start

Wymagania lokalne:

- PowerShell
- Python 3.13
- Node.js wspierany przez Vite, najlepiej 20 LTS albo 22 LTS
- npm
- Docker, jeśli uruchamiasz stack homelab

Pierwsza instalacja:

```powershell
.\scripts\dev.ps1 -Install
```

Start lokalnych serwerów:

```powershell
.\scripts\dev.ps1
```

Adresy:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8000`
- Logi dev: `.codex-logs/dev`

Jeśli porty są zajęte:

```powershell
.\scripts\dev.ps1 -Restart
```

## Walidacja

Pełny zestaw testów i buildów:

```powershell
.\scripts\test.ps1
```

Skrypt uruchamia:

- API pytest
- API ruff
- web TypeScript build
- web Vitest unit tests
- web ESLint, jeśli zależności są zainstalowane

Opcjonalnie:

```powershell
.\scripts\test.ps1 -SkipBackend
.\scripts\test.ps1 -SkipWeb
.\scripts\test.ps1 -SkipLint
```

## Homelab Deploy

Pierwsze uruchomienie:

```powershell
.\scripts\deploy.ps1
```

Domyślnie Caddy wystawia aplikację pod `http://localhost` i proxy do API przez `/api`.

Przed wystawieniem na LAN lub domenę przejrzyj `.env`:

- `CADDY_SITE_ADDRESS`
- `PUBLIC_BASE_URL`
- `CORS_ORIGINS`
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `S3_SECRET_ACCESS_KEY`
- `FITS_LIBRARY_ROOT_HOST`

Szczegóły są w [docs/HOMELAB.md](docs/HOMELAB.md).

## Najważniejsze Dokumenty

- [User Guide](docs/USER_GUIDE.md): jak używać aplikacji ekran po ekranie.
- [Development](docs/DEVELOPMENT.md): workflow developera, komendy, standardy clean code.
- [API](docs/API.md): endpointy, payloady, odpowiedzialność backendu.
- [Architecture](docs/architecture.md): granice modułów i przepływy danych.
- [Homelab](docs/HOMELAB.md): deploy, storage, backup, restore, FITS library.
- [Audit](docs/AUDIT.md): wynik aktualnego audytu jakości, ryzyka i następne kroki.
- [TODO](TODO.md): roadmapa produktu.

## Struktura Repo

```text
apps/
  api/                  FastAPI, modele Pydantic, usługi domenowe, testy
  web/                  React/Vite UI, komponenty, klient API, i18n
data/
  fits/                 domyślny hostowy folder na klatki FITS
docs/                   dokumentacja projektu
infra/
  Caddyfile             reverse proxy i health endpoint
scripts/
  dev.ps1               lokalny start API + web
  test.ps1              testy i buildy
  deploy.ps1            Docker Compose deploy
  backup-profiles.ps1   backup SQLite
  restore-profiles.ps1  restore SQLite
```

## Status Jakości

Aktualny audyt dodał:

- osobny moduł `apps/web/src/lib/sky.ts` dla reguł sceny i FOV-fit,
- ESLint dla frontendu,
- poprawki zależności hooków React,
- pełniejszą dokumentację operacyjną i developerską.

Największe świadome hot spoty do dalszej redukcji:

- `apps/web/src/App.tsx` nadal jest głównym orkiestratorem wielu workflow,
- `apps/web/src/lib/i18n.ts` jest duży, bo trzyma pięć języków i tłumaczenia eksportów,
- `apps/web/src/components/FitsIngestPanel.tsx` łączy UI, export Markdown i draft archiwum,
- `apps/api/astro_api/services.py` zawiera dużo logiki planowania w jednym module.

Te miejsca są opisane dokładniej w [docs/AUDIT.md](docs/AUDIT.md).
