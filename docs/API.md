# API Reference

API jest aplikacją FastAPI z kontraktami Pydantic w `apps/api/astro_api/schemas.py`.

Domyślny adres dev:

```text
http://127.0.0.1:8000
```

W Docker Compose API jest wystawione przez Caddy pod:

```text
http://localhost/api
```

## Konwencje

- Request i response używają `snake_case`.
- Frontend mapuje dane na `camelCase` w `apps/web/src/lib`.
- Daty są w ISO `YYYY-MM-DD`.
- Godziny sesji są tekstowe, np. `22:55`.
- Błędy walidacji zwraca FastAPI/Pydantic.
- FITS scan może zwrócić `400`, jeśli ścieżka wychodzi poza `FITS_LIBRARY_ROOT` albo nie istnieje.

## Health

### `GET /health`

Zwraca:

```json
{ "status": "ok" }
```

Używane przez healthchecki i Caddy.

## Auth

### `POST /api/auth/register`

Tworzy lokalnego operatora i od razu zwraca sesje bearer.

Request:

```json
{
  "email": "operator@example.com",
  "display_name": "Backyard Operator",
  "password": "minimum-eight-chars"
}
```

Response:

```json
{
  "access_token": "opaque-token",
  "token_type": "bearer",
  "expires_at": "2026-07-21T20:00:00Z",
  "user": {
    "id": 1,
    "email": "operator@example.com",
    "display_name": "Backyard Operator",
    "created_at": "2026-06-21T20:00:00Z"
  }
}
```

Mozliwe bledy:

- `409`: e-mail jest juz zarejestrowany,
- `422`: payload nie przechodzi walidacji.

### `POST /api/auth/login`

Loguje operatora i zwraca nowa sesje bearer.

Request:

```json
{
  "email": "operator@example.com",
  "password": "minimum-eight-chars"
}
```

Mozliwe bledy:

- `401`: niepoprawny e-mail albo haslo.

### `GET /api/auth/me`

Zwraca aktualnego operatora dla naglowka:

```http
Authorization: Bearer <access_token>
```

Mozliwe bledy:

- `401`: brak tokenu, niepoprawny token albo token wygasl.

### `POST /api/auth/logout`

Uniewaznia aktualny token bearer. Zwraca `204`.

Hasla sa hashowane przez PBKDF2-SHA256, a tokeny sesji sa przechowywane w bazie jako SHA-256. TTL sesji ustawia `AUTH_SESSION_TTL_HOURS`.

## FOV

### `POST /api/fov`

Liczy efektywną ogniskową, FOV i skalę obrazu.

Request:

```json
{
  "focal_length_mm": 480,
  "reducer": 1,
  "sensor_width_mm": 23.5,
  "sensor_height_mm": 15.7,
  "pixel_size_um": 3.76
}
```

Response:

```json
{
  "effective_focal_length_mm": 480,
  "horizontal_deg": 2.8,
  "vertical_deg": 1.87,
  "diagonal_deg": 3.37,
  "pixel_scale_arcsec": 1.62
}
```

## Targets

### `GET /api/targets`

Zwraca zwalidowany katalog obiektów.

Każdy target zawiera:

- `id`,
- `catalog_id`,
- `name`,
- `type`,
- `constellation`,
- `season`,
- `magnitude`,
- `angular_width_arcmin`,
- `angular_height_arcmin`,
- `best_months`,
- `difficulty`,
- `framing`,
- `exposure_hint`,
- `ra_hours`,
- `dec_deg`,
- `position`,
- `tint`,
- `image_url`,
- `image_credit`,
- `image_source_url`.

### `GET /api/targets/{target_id}/image`

Zwraca obraz targetu z cache.

Nagłówki:

- `Cache-Control`,
- `X-Image-Cache`.

Możliwe błędy:

- `404`: target nie istnieje,
- `502`: obraz niedostępny.

## Profiles

Wszystkie endpointy profili wymagaja:

```http
Authorization: Bearer <access_token>
```

Profile sa izolowane po aktualnym operatorze. Pierwsze pobranie profili dla nowego operatora tworzy jego prywatna kopie domyslnych profili sprzetu.

### `GET /api/profiles`

Lista profili sprzętu.

### `POST /api/profiles`

Tworzy profil.

### `PUT /api/profiles/{profile_id}`

Aktualizuje profil. Zwraca `404`, jeśli profil nie istnieje.

### `DELETE /api/profiles/{profile_id}`

Usuwa profil. Zwraca `204` albo `404`.

Profil obejmuje:

- miejscówkę, koordynaty, timezone, Bortle,
- teleskop, typ, apertura, ogniskowa,
- reduktor,
- kamerę i sensor,
- filtry,
- guiding,
- focuser,
- montaż.

## Session Planning

### `POST /api/session/plan`

Tworzy plan nocy dla targetu.

Request:

```json
{
  "target_id": "ngc7000",
  "date": "2026-06-21",
  "latitude_deg": 50.2649,
  "longitude_deg": 19.0238,
  "timezone": "Europe/Warsaw",
  "bortle": 5,
  "forecast_cache_ttl_minutes": 15,
  "force_forecast_refresh": false
}
```

Response zawiera m.in.:

- `night_kind`,
- `white_night`,
- czasy start/end,
- minuty ciemności cywilnej, nautycznej i astronomicznej,
- Księżyc,
- seeing/transparency/weather,
- recommendation,
- `slots`,
- `altitude_curve`.

### `POST /api/session/capture-plan`

Buduje runbook akwizycji z ekspozycjami, kalibracją i checklistą.

Wymaga danych FOV:

- `fov_horizontal_deg`,
- `fov_vertical_deg`,
- `pixel_scale_arcsec`.

### `POST /api/session/processing-plan`

Buduje plan obróbki dla targetu i warunków sesji.

Request obejmuje:

- Bortle,
- Księżyc,
- white night,
- weather score,
- FOV,
- integrację,
- filtry,
- planned frames.

Response obejmuje:

- stack strategy,
- calibration strategy,
- drizzle,
- binning,
- normalization,
- gradient risk,
- noise reduction,
- color strategy,
- rejection,
- workflow,
- warnings.

## Tonight Board

### `POST /api/session/tonight-board`

Ranking targetów na jedną noc.

Request:

```json
{
  "date": "2026-06-21",
  "latitude_deg": 50.2649,
  "longitude_deg": 19.0238,
  "timezone": "Europe/Warsaw",
  "bortle": 5,
  "fov_horizontal_deg": 2.8,
  "fov_vertical_deg": 1.87,
  "limit": 5,
  "forecast_cache_ttl_minutes": 15,
  "force_forecast_refresh": false
}
```

Response:

- summary pogody,
- weather score,
- Księżyc,
- white night,
- lista targetów z astronomy/weather/FOV score.

## Multi-session

### `POST /api/session/multi-session-plan`

Planuje wiele nocy.

Request:

```json
{
  "start_date": "2026-06-21",
  "nights": 7,
  "target_ids": ["ngc7000", "m31"],
  "latitude_deg": 50.2649,
  "longitude_deg": 19.0238,
  "timezone": "Europe/Warsaw",
  "bortle": 5,
  "fov_horizontal_deg": 2.8,
  "fov_vertical_deg": 1.87,
  "limit": 18
}
```

Response:

- `start_date`,
- `end_date`,
- `summary`,
- `items`,
- `nights_summary`,
- `warnings`.

## Forecast

### `POST /api/forecast/sky`

Zwraca godzinową prognozę astrofoto.

Request:

```json
{
  "date": "2026-06-21",
  "latitude_deg": 50.2649,
  "longitude_deg": 19.0238,
  "timezone": "Europe/Warsaw",
  "cache_ttl_minutes": 15,
  "force_refresh": false
}
```

Response zawiera:

- source,
- status,
- score,
- summary,
- updated_at,
- warnings,
- hours z cloud cover, humidity, dew point, wind, visibility, precipitation, imaging score i risk.

## FITS Frames

### `POST /api/frames/fits-scan`

Skanuje folder FITS pod `FITS_LIBRARY_ROOT`.

Request:

```json
{
  "path": ".",
  "recursive": true,
  "max_files": 250
}
```

Response:

- liczba plików,
- parsed/rejected,
- total light seconds,
- filtry,
- frame types,
- obiekty,
- kamery,
- zakresy ekspozycji i temperatur,
- grupy,
- metadane klatek,
- warnings.

Metadane klatki obejmują m.in. FWHM, eccentricity, star count, quality score i quality flags.

### `POST /api/frames/calibration-library`

Skanuje bibliotekę kalibracji i ocenia dopasowanie.

Request:

```json
{
  "path": ".",
  "recursive": true,
  "max_files": 500,
  "target_filters": ["Ha", "OIII"],
  "target_exposure_seconds": [180],
  "target_temperature_c": -10,
  "target_binning": "1x1",
  "target_camera": "ASI2600MM"
}
```

Response:

- summary,
- items z `match_score`, `match_status`, `reason`,
- warnings o brakujących flatach, darkach albo biasach.

## Session Archive

Wszystkie endpointy archiwum wymagaja:

```http
Authorization: Bearer <access_token>
```

Wpisy archiwum sa izolowane po aktualnym operatorze. Obcy wpis zwraca `404`, a brak albo wygasly token zwraca `401`.

### `GET /api/session/archive?limit=12`

Lista ostatnich wpisów archiwum.

### `POST /api/session/archive`

Tworzy wpis archiwum.

### `PUT /api/session/archive/{archive_id}`

Aktualizuje wpis archiwum.

### `DELETE /api/session/archive/{archive_id}`

Usuwa wpis archiwum.

Status wpisu:

- `planned`,
- `captured`,
- `processed`,
- `skipped`.

## OpenAPI

FastAPI wystawia automatyczną dokumentację:

```text
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/openapi.json
```

W homelabie przez Caddy:

```text
http://localhost/api/docs
http://localhost/api/openapi.json
```
