# Astrofoto Mission Control TODO

## Roadmap

- [x] Full profile manager: create, edit, duplicate, delete, and apply equipment + location profiles.
- [x] Homelab-ready deploy: persistent SQLite volume, healthchecks, Caddy routing, `.env` hardening, and backup notes.
- [x] Target catalog: searchable/filterable object library with season, size, magnitude, and setup fit.
- [x] Tonight Board: rank tonight's best targets by weather, altitude, Moon, white nights, and FOV.

## Next Roadmap

- [x] Capture Plan / Session Runbook: filters, exposure lengths, sub counts, dithering, autofocus, and calibration frames.
- [x] Export Capture Plan: Markdown-first export for phone/tablet use at the rig.
- [x] Rich optical profiles: telescopes, reducers, cameras, filters, guiding, and focuser metadata.
- [x] Target data source: move curated targets from code into JSON or SQLite-backed catalog data.
- [x] Homelab ops tasks: one-command dev/test/backup/restore/deploy scripts.

## Phase 2 Roadmap

- [x] Expand target catalog: add more Messier, NGC, IC, Sharpless, Barnard, and seasonal showcase objects.
- [x] Sky map rotation control: add an auto-rotate on/off toggle and remember the user preference.
- [x] Object imagery: replace abstract spheres/rings with real object thumbnails or generated preview plates.
- [x] Realistic object scale: render target apparent size against the current FOV so framing feels physically meaningful.
- [x] FOV/object comparison tools: add fit margin, mosaic hints, and rotation guidance in the sky view.
- [x] Homelab image cache: proxy/cache generated DSS2 target plates locally for faster offline-friendly browsing.
- [x] Session Archive / Capture Logs: save planned/captured sessions with filters, integration, weather, profile, and notes.
- [x] Processing Planner: recommend calibration matching, stack strategy, drizzle/binning, and gradient risk.
- [x] FITS metadata ingest: scan uploaded or mounted frame folders and read capture metadata from FITS headers.

## Phase 3 Roadmap

- [x] Multi-session Planner: plan several nights across targets, weather windows, Moon, white nights, and equipment profiles.
- [x] Multi-session export: save selected planner nights to Session Archive and download best-night calendar as `.ics`.
- [x] Weather cache controls: configurable 15/30/60 minute refresh with manual cache bypass from the UI.
- [x] FITS quality scoring: FWHM, eccentricity, background level, star count, and cloud rejection hints.
- [x] Frame-to-session import: turn a scanned FITS folder into a captured Session Archive entry.
- [x] Internationalization: translate the app into Polish, German, Italian, and Spanish.
  - [x] Add persisted language selection and shared dictionaries for EN/PL/DE/IT/ES.
  - [x] Translate the app shell, sky controls, frame context, and Multi-session Planner.
  - [x] Translate Capture, Process, FITS ingest, calibration library, profile, and weather panels.
  - [x] Localize target metadata, seasons, archive statuses, warnings, Markdown exports, and ICS descriptions.
- [x] Calibration library browser: reusable dark/flat/bias inventory with temperature/exposure/filter matching.
- [x] Processing handoff export: PixInsight/Siril-friendly checklist generated from real captured frames.

## Quality Roadmap

- [x] Full application audit with documentation refresh and active frontend linting.
- [x] Extract sky/FOV catalog rules from the main App component into a dedicated domain module.
- [x] Move Markdown and ICS export builders into dedicated `apps/web/src/lib/exports` modules.
- [x] Split `i18n.ts` into per-language dictionaries plus dynamic translation helpers.
- [x] Add unit tests for sky target filtering, FOV-fit labels, Markdown exports, and ICS output.
- [x] Split backend planning services by use case: session, capture, processing, tonight board, and multi-session.
- [x] Split FITS ingest UI into presentation, archive-draft, and export helpers.
- [x] Add Playwright smoke tests for Planner, Session, Frames, and Multi workflows.
- [ ] Document and prototype SQLite-to-Postgres migration path for profiles and session archive.

## Release Roadmap

- [ ] After Quality Roadmap is complete, start semantic prerelease versioning at `0.1.0-alpha.0`.
- [ ] Promote to `0.1.0-beta.0` after Playwright smoke tests, homelab deploy rehearsal, and DB migration notes are green.
- [ ] Keep release notes for each alpha/beta with user-facing changes, ops changes, and known risks.
