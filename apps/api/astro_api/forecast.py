from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from math import cos, pi, sin
from typing import Any, Callable
from urllib.parse import urlencode
from urllib.request import urlopen

from .schemas import SkyForecastHour, SkyForecastRequest, SkyForecastResponse
from .settings import get_settings

FetchJson = Callable[[str, float], dict[str, Any]]

HOURLY_VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "cloud_cover",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "visibility",
    "wind_speed_10m",
    "wind_gusts_10m",
    "precipitation_probability",
    "precipitation",
]

_FORECAST_CACHE: dict[tuple[date, float, float, str], tuple[datetime, SkyForecastResponse]] = {}


@dataclass(frozen=True)
class HourSample:
    time: str
    cloud_cover_percent: int
    cloud_low_percent: int
    cloud_mid_percent: int
    cloud_high_percent: int
    humidity_percent: int
    temperature_c: float
    dew_point_c: float
    wind_speed_kmh: float
    wind_gust_kmh: float
    visibility_km: float
    precipitation_probability_percent: int
    precipitation_mm: float = 0


def get_sky_forecast(
    payload: SkyForecastRequest,
    fetch_json: FetchJson | None = None,
) -> SkyForecastResponse:
    settings = get_settings()
    session_date = payload.date or date.today()
    key = (
        session_date,
        round(payload.latitude_deg, 4),
        round(payload.longitude_deg, 4),
        payload.timezone,
    )
    cached = _FORECAST_CACHE.get(key)
    now = datetime.now(UTC)
    ttl_seconds = (
        payload.cache_ttl_minutes * 60
        if payload.cache_ttl_minutes is not None
        else settings.forecast_cache_ttl_seconds
    )
    if (
        cached
        and not payload.force_refresh
        and (now - cached[0]).total_seconds() < ttl_seconds
    ):
        return cached[1].model_copy(update={"source": "cache"})

    try:
        response = _fetch_open_meteo(payload, session_date, fetch_json or _default_fetch_json)
        source = "open-meteo"
    except Exception:
        response = _fallback_samples(payload, session_date)
        source = "fallback"

    forecast = _build_response(response, source=source)
    _FORECAST_CACHE[key] = (now, forecast)
    return forecast


def _fetch_open_meteo(
    payload: SkyForecastRequest,
    session_date: date,
    fetch_json: FetchJson,
) -> list[HourSample]:
    settings = get_settings()
    query = urlencode(
        {
            "latitude": payload.latitude_deg,
            "longitude": payload.longitude_deg,
            "timezone": payload.timezone,
            "start_date": session_date.isoformat(),
            "end_date": (session_date + timedelta(days=1)).isoformat(),
            "hourly": ",".join(HOURLY_VARIABLES),
        }
    )
    data = fetch_json(f"{settings.open_meteo_forecast_url}?{query}", settings.forecast_timeout_seconds)
    hourly = data.get("hourly")
    if not isinstance(hourly, dict):
        raise ValueError("Open-Meteo response missing hourly data")

    times = hourly.get("time")
    if not isinstance(times, list):
        raise ValueError("Open-Meteo response missing time data")

    samples: list[HourSample] = []
    for index, raw_time in enumerate(times):
        if not isinstance(raw_time, str) or not _is_session_night_hour(raw_time, session_date):
            continue
        samples.append(
            HourSample(
                time=_format_hour(raw_time),
                cloud_cover_percent=_read_percent(hourly, "cloud_cover", index),
                cloud_low_percent=_read_percent(hourly, "cloud_cover_low", index),
                cloud_mid_percent=_read_percent(hourly, "cloud_cover_mid", index),
                cloud_high_percent=_read_percent(hourly, "cloud_cover_high", index),
                humidity_percent=_read_percent(hourly, "relative_humidity_2m", index),
                temperature_c=_read_float(hourly, "temperature_2m", index),
                dew_point_c=_read_float(hourly, "dew_point_2m", index),
                wind_speed_kmh=_read_float(hourly, "wind_speed_10m", index),
                wind_gust_kmh=_read_float(hourly, "wind_gusts_10m", index),
                visibility_km=round(_read_float(hourly, "visibility", index, default=20000) / 1000, 1),
                precipitation_probability_percent=_read_percent(
                    hourly, "precipitation_probability", index
                ),
                precipitation_mm=_read_float(hourly, "precipitation", index),
            )
        )

    if not samples:
        raise ValueError("Open-Meteo response did not include night hours")
    return samples


def _default_fetch_json(url: str, timeout_seconds: float) -> dict[str, Any]:
    with urlopen(url, timeout=timeout_seconds) as response:
        payload = response.read().decode("utf-8")
    data = json.loads(payload)
    if not isinstance(data, dict):
        raise ValueError("Forecast response is not an object")
    return data


def _fallback_samples(payload: SkyForecastRequest, session_date: date) -> list[HourSample]:
    seed = int(abs(payload.latitude_deg) * 7 + abs(payload.longitude_deg) * 11 + session_date.timetuple().tm_yday)
    hours = list(range(18, 24)) + list(range(0, 7))
    seasonal = (sin((session_date.timetuple().tm_yday / 366) * 2 * pi) + 1) / 2
    samples: list[HourSample] = []

    for index, hour in enumerate(hours):
        wave = (sin((index + seed % 5) * 0.85) + 1) / 2
        cloud = round(18 + wave * 46 + seasonal * 12)
        high = round(max(8, min(95, cloud * (0.55 + 0.2 * cos(index)))))
        mid = round(max(4, min(90, cloud * (0.42 + 0.18 * sin(index * 0.7)))))
        low = round(max(2, min(80, cloud * (0.28 + 0.16 * cos(index * 0.5)))))
        humidity = round(max(52, min(96, 66 + seasonal * 16 + wave * 18)))
        temperature = round(12 + seasonal * 11 - max(0, index - 2) * 0.45, 1)
        dew_point = round(temperature - max(1.2, 8 - humidity * 0.065), 1)
        wind = round(5 + wave * 12 + (seed % 4), 1)
        gust = round(wind + 5 + wave * 9, 1)

        samples.append(
            HourSample(
                time=f"{hour:02d}:00",
                cloud_cover_percent=cloud,
                cloud_low_percent=low,
                cloud_mid_percent=mid,
                cloud_high_percent=high,
                humidity_percent=humidity,
                temperature_c=temperature,
                dew_point_c=dew_point,
                wind_speed_kmh=wind,
                wind_gust_kmh=gust,
                visibility_km=round(max(4, 24 - low * 0.16 - humidity * 0.04), 1),
                precipitation_probability_percent=round(max(2, min(70, cloud * 0.42 + low * 0.15 - 12))),
            )
        )
    return samples


def _build_response(samples: list[HourSample], source: str) -> SkyForecastResponse:
    hours = [_build_hour(sample) for sample in samples]
    score = round(sum(hour.imaging_score for hour in hours) / max(1, len(hours)))
    status = _status_from_score(score)
    warnings = _warnings(samples)

    return SkyForecastResponse(
        source=source,
        status=status,
        score=score,
        summary=_summary(status, samples),
        updated_at=datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
        warnings=warnings,
        hours=hours,
    )


def _build_hour(sample: HourSample) -> SkyForecastHour:
    score = _hour_score(sample)
    return SkyForecastHour(
        time=sample.time,
        cloud_cover_percent=sample.cloud_cover_percent,
        cloud_low_percent=sample.cloud_low_percent,
        cloud_mid_percent=sample.cloud_mid_percent,
        cloud_high_percent=sample.cloud_high_percent,
        humidity_percent=sample.humidity_percent,
        temperature_c=sample.temperature_c,
        dew_point_c=sample.dew_point_c,
        wind_speed_kmh=sample.wind_speed_kmh,
        wind_gust_kmh=sample.wind_gust_kmh,
        visibility_km=sample.visibility_km,
        precipitation_probability_percent=sample.precipitation_probability_percent,
        imaging_score=score,
        risk=_status_from_score(score),
    )


def _hour_score(sample: HourSample) -> int:
    dew_spread = sample.temperature_c - sample.dew_point_c
    score = 100.0
    score -= sample.cloud_cover_percent * 0.58
    score -= sample.cloud_low_percent * 0.18
    score -= sample.cloud_high_percent * 0.08
    score -= sample.precipitation_probability_percent * 0.35
    score -= max(0, sample.humidity_percent - 82) * 0.8
    score -= max(0, 3 - dew_spread) * 8
    score -= max(0, sample.wind_speed_kmh - 16) * 1.2
    score -= max(0, sample.wind_gust_kmh - 28) * 1.4
    score -= max(0, 12 - sample.visibility_km) * 3.2
    if sample.precipitation_mm > 0:
        score -= 30
    return round(max(0, min(100, score)))


def _warnings(samples: list[HourSample]) -> list[str]:
    if not samples:
        return ["Forecast unavailable"]

    warnings: list[str] = []
    average_cloud = _average(sample.cloud_cover_percent for sample in samples)
    average_high_cloud = _average(sample.cloud_high_percent for sample in samples)
    max_low_cloud = max(sample.cloud_low_percent for sample in samples)
    max_gust = max(sample.wind_gust_kmh for sample in samples)
    max_precip = max(sample.precipitation_probability_percent for sample in samples)
    min_dew_spread = min(sample.temperature_c - sample.dew_point_c for sample in samples)
    min_visibility = min(sample.visibility_km for sample in samples)

    if average_cloud >= 70:
        warnings.append("Heavy cloud cover")
    elif average_cloud >= 45:
        warnings.append("Patchy cloud risk")
    if average_high_cloud >= 55:
        warnings.append("High cloud can soften contrast")
    if max_low_cloud >= 65:
        warnings.append("Low cloud or fog risk")
    if min_dew_spread <= 2.0:
        warnings.append("Dew heaters recommended")
    if max_gust >= 36:
        warnings.append("Wind gusts can hurt guiding")
    if max_precip >= 35:
        warnings.append("Precipitation risk")
    if min_visibility < 8:
        warnings.append("Reduced visibility")

    return warnings[:5] or ["No major weather flags"]


def _summary(status: str, samples: list[HourSample]) -> str:
    average_cloud = _average(sample.cloud_cover_percent for sample in samples)
    if status == "shoot" and average_cloud < 25:
        return "Clear imaging window"
    if status == "shoot":
        return "Good sky with manageable clouds"
    if status == "risk":
        return "Usable with weather risk"
    return "Skip or run calibration"


def _status_from_score(score: int) -> str:
    if score >= 72:
        return "shoot"
    if score >= 45:
        return "risk"
    return "skip"


def _is_session_night_hour(raw_time: str, session_date: date) -> bool:
    sample_date = date.fromisoformat(raw_time[:10])
    hour = int(raw_time[11:13])
    if sample_date == session_date:
        return hour >= 18
    if sample_date == session_date + timedelta(days=1):
        return hour <= 6
    return False


def _format_hour(raw_time: str) -> str:
    return raw_time[11:16]


def _read_percent(hourly: dict[str, Any], field: str, index: int) -> int:
    return round(max(0, min(100, _read_float(hourly, field, index))))


def _read_float(hourly: dict[str, Any], field: str, index: int, default: float = 0) -> float:
    values = hourly.get(field)
    if not isinstance(values, list) or index >= len(values):
        return default
    value = values[index]
    if value is None:
        return default
    return float(value)


def _average(values) -> float:
    items = list(values)
    return sum(items) / max(1, len(items))
