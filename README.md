# Astrofoto Mission Control

Visual-first web tools for astrophotography planning, imaging setup, and data inspection.

## Stack

- Web: Vite, React, TypeScript, Three.js, React Three Fiber
- API: FastAPI, Pydantic, Astropy-ready Python services
- Homelab: Docker Compose, Caddy, PostgreSQL, Valkey, MinIO

## Local web dev

```powershell
cd apps/web
npm install
npm run dev
```

## Local API dev

```powershell
cd apps/api
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
uvicorn astro_api.main:app --reload
```

## Homelab compose

```powershell
copy .env.example .env
docker compose up --build
```

Caddy exposes the web UI on `http://localhost` and proxies API calls through `/api`.
See [docs/HOMELAB.md](docs/HOMELAB.md) for persistent SQLite profiles, healthchecks, Caddy settings, and backup/restore notes.

## First tools

- Live field-of-view simulator
- Searchable target catalog with FOV fit, size, season, and magnitude filters
- Tonight Board ranking targets by weather, altitude, Moon, white nights, and FOV
- Capture Plan runbook with lights, calibration frames, dithering, autofocus, and Markdown export
- Session timeline mock for planning panels
- API endpoints for FOV calculations and curated target data
