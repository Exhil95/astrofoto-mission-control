# Releases

## 0.1.0-alpha.0 - 2026-06-21

Pierwsza alpha Astrofoto Mission Control. To build po domknięciu Quality Roadmap: aplikacja ma pełny lokalny planner, homelab stack, testy API, lint frontendu, unit testy web i Playwright smoke dla głównych workflow.

### User-facing

- Planner targetów z realistycznym FOV, obrazami obiektów i filtrowaniem katalogu.
- Capture workspace z Session Timeline, Capture Plan, Tonight Board i eksportem Markdown.
- Frames workspace ze skanem FITS, quality scoringiem, importem sesji i calibration library.
- Multi-session Planner z eksportem ICS i zapisem planowanych sesji.
- UI z wyborem języka: EN, PL, DE, IT, ES.

### Ops

- Docker Compose dla homelabu z Caddy, API, web, Postgres, Valkey i MinIO.
- SQLite jako domyślny runtime storage profili i Session Archive.
- Backup/restore SQLite przez PowerShell.
- Prototyp migracji SQLite -> Postgres dla `equipment_profiles` i `session_archives`.
- Quality gate: pytest, ruff, TypeScript build, Vitest, ESLint, Playwright smoke.

### Known Risks

- Runtime storage nadal używa SQLite; Postgres ma prototyp migracji, ale nie ma jeszcze produkcyjnego adaptera runtime.
- `apps/api/astro_api/fits_ingest.py` nadal łączy parser FITS, scoring i calibration matching.
- `apps/web/src/styles.css` jest globalnym arkuszem i będzie wymagał dalszego porządkowania po stabilizacji designu.
- Brak auth/access control przed wystawieniem poza LAN.
- FITS scan jest synchroniczny i powinien używać rozsądnego `max_files`.

### Beta Exit Checklist

- `.\scripts\test.ps1` przechodzi.
- `.\scripts\rehearse-deploy.ps1 -StartStack` przechodzi na homelabie.
- SQLite backup i restore są sprawdzone na aktualnym wolumenie.
- Dry-run SQLite -> Postgres pokazuje oczekiwane liczby profili i sesji.
- Znane ryzyka z alphy są albo naprawione, albo jawnie zaakceptowane w release notes bety.
