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
- [ ] Internationalization: translate the app into Polish, German, Italian, and Spanish.
- [x] Calibration library browser: reusable dark/flat/bias inventory with temperature/exposure/filter matching.
- [ ] Processing handoff export: PixInsight/Siril-friendly checklist generated from real captured frames.
