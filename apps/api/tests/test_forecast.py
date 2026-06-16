from datetime import date

from astro_api.forecast import _FORECAST_CACHE, get_sky_forecast
from astro_api.schemas import SkyForecastRequest


def test_sky_forecast_maps_open_meteo_hourly_payload() -> None:
    payload = SkyForecastRequest(
        date=date(2026, 6, 14),
        latitude_deg=50.2649,
        longitude_deg=19.0238,
        timezone="Europe/Warsaw",
    )

    def fetch_json(url: str, timeout_seconds: float) -> dict:
        assert "api.open-meteo.com" in url
        assert timeout_seconds > 0
        return {
            "hourly": {
                "time": [
                    "2026-06-14T01:00",
                    "2026-06-14T17:00",
                    "2026-06-14T18:00",
                    "2026-06-14T23:00",
                    "2026-06-15T01:00",
                ],
                "temperature_2m": [12.0, 20.0, 18.0, 14.0, 13.0],
                "relative_humidity_2m": [78, 60, 74, 88, 82],
                "dew_point_2m": [8.0, 9.0, 11.0, 12.5, 10.5],
                "cloud_cover": [99, 12, 22, 76, 36],
                "cloud_cover_low": [80, 3, 6, 48, 12],
                "cloud_cover_mid": [40, 5, 14, 52, 20],
                "cloud_cover_high": [10, 18, 32, 80, 44],
                "visibility": [8000, 30000, 26000, 9000, 16000],
                "wind_speed_10m": [4.0, 5.0, 8.0, 18.0, 10.0],
                "wind_gusts_10m": [8.0, 11.0, 16.0, 33.0, 18.0],
                "precipitation_probability": [66, 0, 4, 28, 12],
                "precipitation": [0, 0, 0, 0, 0],
            }
        }

    forecast = get_sky_forecast(payload, fetch_json=fetch_json)

    assert forecast.source == "open-meteo"
    assert len(forecast.hours) == 3
    assert forecast.hours[0].time == "18:00"
    assert forecast.hours[0].cloud_cover_percent == 22
    assert forecast.hours[1].risk in {"risk", "skip"}
    assert forecast.score > 0


def test_sky_forecast_uses_offline_fallback_when_provider_fails() -> None:
    payload = SkyForecastRequest(date=date(2026, 6, 15))

    def fetch_json(url: str, timeout_seconds: float) -> dict:
        raise OSError("offline")

    forecast = get_sky_forecast(payload, fetch_json=fetch_json)

    assert forecast.source == "fallback"
    assert len(forecast.hours) == 13
    assert forecast.status in {"shoot", "risk", "skip"}
    assert forecast.warnings


def test_sky_forecast_respects_cache_ttl_and_force_refresh() -> None:
    _FORECAST_CACHE.clear()
    payload = SkyForecastRequest(
        date=date(2026, 7, 20),
        latitude_deg=50.2649,
        longitude_deg=19.0238,
        timezone="Europe/Warsaw",
        cache_ttl_minutes=15,
    )
    calls = 0

    def fetch_json(url: str, timeout_seconds: float) -> dict:
        nonlocal calls
        calls += 1
        return {
            "hourly": {
                "time": ["2026-07-20T18:00", "2026-07-20T23:00", "2026-07-21T01:00"],
                "temperature_2m": [18.0, 14.0, 13.0],
                "relative_humidity_2m": [74, 82, 79],
                "dew_point_2m": [11.0, 12.0, 10.5],
                "cloud_cover": [22 + calls, 36, 30],
                "cloud_cover_low": [6, 12, 8],
                "cloud_cover_mid": [14, 20, 18],
                "cloud_cover_high": [32, 44, 38],
                "visibility": [26000, 16000, 18000],
                "wind_speed_10m": [8.0, 10.0, 9.0],
                "wind_gusts_10m": [16.0, 18.0, 17.0],
                "precipitation_probability": [4, 12, 8],
                "precipitation": [0, 0, 0],
            }
        }

    first = get_sky_forecast(payload, fetch_json=fetch_json)
    second = get_sky_forecast(payload, fetch_json=fetch_json)
    forced = get_sky_forecast(
        payload.model_copy(update={"force_refresh": True}),
        fetch_json=fetch_json,
    )

    assert first.source == "open-meteo"
    assert second.source == "cache"
    assert forced.source == "open-meteo"
    assert calls == 2
