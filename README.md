# Astrofoto Mission Control

Visual-first web tools for astrophotography planning, imaging setup, and data inspection.

## Stack

- Web: Vite, React, TypeScript, Three.js, React Three Fiber
- API: FastAPI, Pydantic, Astropy-ready Python services
- Data: JSON target catalog, SQLite equipment profiles
- Homelab: Docker Compose, Caddy, PostgreSQL, Valkey, MinIO

## Local dev

```powershell
.\scripts\dev.ps1 -Install
```

After dependencies are installed, start both dev servers with:

```powershell
.\scripts\dev.ps1
```

The dev script starts the API on `http://127.0.0.1:8000` and the web app on
`http://127.0.0.1:5173`. Logs are written to `.codex-logs/dev`.

## Checks

```powershell
.\scripts\test.ps1
```

## Homelab compose

```powershell
.\scripts\deploy.ps1
```

Caddy exposes the web UI on `http://localhost` and proxies API calls through `/api`.
See [docs/HOMELAB.md](docs/HOMELAB.md) for persistent SQLite profiles, healthchecks, Caddy settings, and backup/restore notes.

## First tools

- Live field-of-view simulator
- Searchable target catalog with FOV fit, size, season, and magnitude filters
- JSON-backed target catalog shared by the API and web fallback
- Rich optical profiles for telescope, reducer, camera, filters, guiding, focuser, and mount metadata
- Tonight Board ranking targets by weather, altitude, Moon, white nights, and FOV
- Capture Plan runbook with lights, calibration frames, dithering, autofocus, and Markdown export
- Session Archive for saved planned/captured runs with filters, integration, weather, profile, and notes
- Homelab target image proxy/cache for generated DSS2 object plates
- Session timeline mock for planning panels
- API endpoints for FOV calculations and curated target data
