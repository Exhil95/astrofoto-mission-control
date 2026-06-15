# Architecture

Astrofoto Mission Control is a visual-first monorepo.

## Web

The web app owns the mission-control interface, 3D target map, rich equipment profiles, and session timeline.
It calls the API for calculations that should remain canonical on the backend.

## API

The API owns astrophotography formulas, persisted equipment profile metadata, future catalog imports, FITS metadata, and long-running jobs.
Astropy-related code belongs here, not in the browser.
The curated target catalog lives in `apps/api/astro_api/data/targets.json`; API services validate it with Pydantic and the web app imports the same file for its offline fallback.

## Homelab

Docker Compose runs the full stack:

- Caddy for ingress
- Web for the Vite frontend
- API for FastAPI services
- PostgreSQL for relational data
- Valkey for queues/cache
- MinIO for large frames and generated assets
