from datetime import date

from .astro_engine import TargetProfile, build_astro_plan
from .catalog import get_target
from .forecast import get_sky_forecast
from .planning_common import (
    _estimate_moon_illumination,
    _estimate_seeing,
    _estimate_transparency,
    _recommendation,
    _recommended_mode,
    _score_astronomy,
    _score_conditions,
)
from .schemas import (
    AltitudePoint,
    SessionPlanRequest,
    SessionPlanResponse,
    SkyForecastRequest,
    SkyForecastResponse,
    TimelineSlot,
)

def plan_session(payload: SessionPlanRequest) -> SessionPlanResponse:
    target = get_target(payload.target_id)
    session_date = payload.date or date.today()

    astro_plan = build_astro_plan(
        session_date=session_date,
        latitude_deg=payload.latitude_deg,
        longitude_deg=payload.longitude_deg,
        timezone_name=payload.timezone,
        target=TargetProfile(ra_hours=target["ra_hours"], dec_deg=target["dec_deg"]),
    )
    moon_illumination_percent = _estimate_moon_illumination(session_date)
    forecast = get_sky_forecast(
        SkyForecastRequest(
            date=session_date,
            latitude_deg=payload.latitude_deg,
            longitude_deg=payload.longitude_deg,
            timezone=payload.timezone,
            cache_ttl_minutes=payload.forecast_cache_ttl_minutes,
            force_refresh=payload.force_forecast_refresh,
        )
    )
    transparency_percent = _estimate_transparency(payload.bortle, moon_illumination_percent)
    seeing_arcsec = _estimate_seeing(payload.bortle, astro_plan.max_altitude_deg)
    astro_score = _score_astronomy(
        max_altitude_deg=astro_plan.max_altitude_deg,
        moon_illumination_percent=moon_illumination_percent,
        transparency_percent=transparency_percent,
        bortle=payload.bortle,
        astronomical_darkness_minutes=astro_plan.astronomical_darkness_minutes,
    )
    condition_score = _score_conditions(
        astro_score=astro_score,
        weather_score=forecast.score,
        weather_status=forecast.status,
    )
    recommended_mode = _recommended_mode(
        target_type=target["type"],
        white_night=astro_plan.white_night,
        astronomical_darkness_minutes=astro_plan.astronomical_darkness_minutes,
        moon_illumination_percent=moon_illumination_percent,
        weather_status=forecast.status,
        max_altitude_deg=astro_plan.max_altitude_deg,
    )
    recommendation = _recommendation(
        condition_score,
        moon_illumination_percent,
        target["type"],
        astro_plan.white_night,
        astro_plan.astronomical_darkness_minutes,
        astro_plan.max_altitude_deg,
        forecast,
        recommended_mode,
    )

    return SessionPlanResponse(
        target_id=target["id"],
        target_name=target["name"],
        night_label=session_date.strftime("%d %b %Y"),
        night_kind=astro_plan.night_kind,
        night_kind_label=astro_plan.night_kind_label,
        start_time=astro_plan.best_start_time,
        end_time=astro_plan.best_end_time,
        white_night=astro_plan.white_night,
        min_sun_altitude_deg=astro_plan.min_sun_altitude_deg,
        civil_darkness_minutes=astro_plan.civil_darkness_minutes,
        nautical_darkness_minutes=astro_plan.nautical_darkness_minutes,
        astronomical_darkness_minutes=astro_plan.astronomical_darkness_minutes,
        moon_illumination_percent=moon_illumination_percent,
        max_altitude_deg=astro_plan.max_altitude_deg,
        transparency_percent=transparency_percent,
        seeing_arcsec=seeing_arcsec,
        astronomy_score=astro_score,
        weather_score=forecast.score,
        weather_status=forecast.status,
        weather_summary=forecast.summary,
        recommended_mode=recommended_mode,
        condition_score=condition_score,
        recommendation=recommendation,
        slots=_timeline_slots(astro_plan, forecast, condition_score),
        altitude_curve=[
            AltitudePoint(
                time=point.time,
                target_altitude_deg=point.target_altitude_deg,
                sun_altitude_deg=point.sun_altitude_deg,
                darkness=point.darkness,
            )
            for point in astro_plan.altitude_curve
        ],
    )

def _timeline_slots(
    astro_plan,
    forecast: SkyForecastResponse,
    condition_score: int,
) -> list[TimelineSlot]:
    if astro_plan.astronomical_darkness_minutes:
        dark_label = "Astro start"
        dark_value = f"{_format_duration(astro_plan.astronomical_darkness_minutes)}"
    elif astro_plan.nautical_darkness_minutes:
        dark_label = "Nautical"
        dark_value = f"{_format_duration(astro_plan.nautical_darkness_minutes)}"
    else:
        dark_label = "Bright"
        dark_value = f"{_format_duration(astro_plan.civil_darkness_minutes)}"

    best_weather_hour = max(
        forecast.hours,
        key=lambda hour: hour.imaging_score,
        default=None,
    )
    weather_time = best_weather_hour.time if best_weather_hour else "--:--"
    weather_value = (
        f"{forecast.status.title()} {forecast.score}/100"
        if not best_weather_hour
        else f"{best_weather_hour.imaging_score}/100"
    )

    return [
        TimelineSlot(time=astro_plan.best_start_time, label=dark_label, value=dark_value, intensity=0.45, kind="sky"),
        TimelineSlot(time=weather_time, label="Weather", value=weather_value, intensity=forecast.score / 100, kind="weather"),
        TimelineSlot(time=astro_plan.meridian_time, label="Peak", value=f"{astro_plan.max_altitude_deg} deg", intensity=0.95, kind="target"),
        TimelineSlot(time=astro_plan.best_end_time, label="End run", value=f"{condition_score}/100", intensity=0.7, kind="target"),
    ]


def _format_duration(minutes: int) -> str:
    if minutes <= 0:
        return "0 min"
    hours = minutes // 60
    rest = minutes % 60
    if hours == 0:
        return f"{rest} min"
    if rest == 0:
        return f"{hours}h"
    return f"{hours}h {rest}m"
