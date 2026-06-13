# Architecture

Astrofoto Mission Control is a visual-first monorepo.

## Web

The web app owns the mission-control interface, 3D target map, equipment controls, and session timeline.
It calls the API for calculations that should remain canonical on the backend.

## API

The API owns astrophotography formulas, future catalog imports, FITS metadata, and long-running jobs.
Astropy-related code belongs here, not in the browser.

## Homelab

Docker Compose runs the full stack:

- Caddy for ingress
- Web for the Vite frontend
- API for FastAPI services
- PostgreSQL for relational data
- Valkey for queues/cache
- MinIO for large frames and generated assets

