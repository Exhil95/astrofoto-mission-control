from datetime import date
from math import atan, cos, degrees, hypot, pi

from .astro_engine import TargetProfile, build_astro_plan
from .forecast import get_sky_forecast
from .schemas import (
    AltitudePoint,
    FovRequest,
    FovResponse,
    SessionPlanRequest,
    SessionPlanResponse,
    SkyForecastRequest,
    SkyForecastResponse,
    TimelineSlot,
)


TARGETS = [
    {
        "id": "m42",
        "catalog_id": "M42",
        "name": "Orion Nebula",
        "type": "Emission nebula",
        "constellation": "Orion",
        "season": "Winter",
        "magnitude": 4.0,
        "angular_width_arcmin": 85,
        "angular_height_arcmin": 60,
        "best_months": "Dec-Mar",
        "difficulty": "Easy",
        "framing": "Medium nebula",
        "exposure_hint": "Short HDR subs",
        "ra_hours": 5.59,
        "dec_deg": -5.45,
    },
    {
        "id": "m31",
        "catalog_id": "M31",
        "name": "Andromeda",
        "type": "Galaxy",
        "constellation": "Andromeda",
        "season": "Autumn",
        "magnitude": 3.4,
        "angular_width_arcmin": 190,
        "angular_height_arcmin": 60,
        "best_months": "Sep-Dec",
        "difficulty": "Easy",
        "framing": "Wide galaxy",
        "exposure_hint": "Wide mosaic",
        "ra_hours": 0.71,
        "dec_deg": 41.27,
    },
    {
        "id": "ngc7000",
        "catalog_id": "NGC 7000",
        "name": "North America",
        "type": "Emission nebula",
        "constellation": "Cygnus",
        "season": "Summer",
        "magnitude": 4.0,
        "angular_width_arcmin": 120,
        "angular_height_arcmin": 100,
        "best_months": "Jun-Sep",
        "difficulty": "Medium",
        "framing": "Large nebula",
        "exposure_hint": "Narrowband",
        "ra_hours": 20.97,
        "dec_deg": 44.33,
    },
    {
        "id": "m45",
        "catalog_id": "M45",
        "name": "Pleiades",
        "type": "Reflection nebula",
        "constellation": "Taurus",
        "season": "Winter",
        "magnitude": 1.6,
        "angular_width_arcmin": 110,
        "angular_height_arcmin": 110,
        "best_months": "Nov-Feb",
        "difficulty": "Easy",
        "framing": "Wide cluster",
        "exposure_hint": "Protect highlights",
        "ra_hours": 3.79,
        "dec_deg": 24.12,
    },
    {
        "id": "ic1396",
        "catalog_id": "IC 1396",
        "name": "Elephant Trunk",
        "type": "Dark nebula",
        "constellation": "Cepheus",
        "season": "Autumn",
        "magnitude": 3.5,
        "angular_width_arcmin": 170,
        "angular_height_arcmin": 140,
        "best_months": "Aug-Nov",
        "difficulty": "Hard",
        "framing": "Large nebula",
        "exposure_hint": "Long narrowband",
        "ra_hours": 21.65,
        "dec_deg": 57.5,
    },
    {
        "id": "ngc1499",
        "catalog_id": "NGC 1499",
        "name": "California Nebula",
        "type": "Emission nebula",
        "constellation": "Perseus",
        "season": "Winter",
        "magnitude": 6.0,
        "angular_width_arcmin": 160,
        "angular_height_arcmin": 40,
        "best_months": "Nov-Feb",
        "difficulty": "Medium",
        "framing": "Long nebula",
        "exposure_hint": "Ha narrowband",
        "ra_hours": 4.05,
        "dec_deg": 36.37,
    },
    {
        "id": "ngc2237",
        "catalog_id": "NGC 2237",
        "name": "Rosette Nebula",
        "type": "Emission nebula",
        "constellation": "Monoceros",
        "season": "Winter",
        "magnitude": 9.0,
        "angular_width_arcmin": 80,
        "angular_height_arcmin": 60,
        "best_months": "Dec-Mar",
        "difficulty": "Medium",
        "framing": "Medium nebula",
        "exposure_hint": "Narrowband core",
        "ra_hours": 6.53,
        "dec_deg": 5.05,
    },
    {
        "id": "ic1805",
        "catalog_id": "IC 1805",
        "name": "Heart Nebula",
        "type": "Emission nebula",
        "constellation": "Cassiopeia",
        "season": "Autumn",
        "magnitude": 6.5,
        "angular_width_arcmin": 150,
        "angular_height_arcmin": 150,
        "best_months": "Sep-Jan",
        "difficulty": "Medium",
        "framing": "Large nebula",
        "exposure_hint": "Ha/OIII blend",
        "ra_hours": 2.55,
        "dec_deg": 61.46,
    },
    {
        "id": "ngc6960",
        "catalog_id": "NGC 6960",
        "name": "Veil Nebula",
        "type": "Supernova remnant",
        "constellation": "Cygnus",
        "season": "Summer",
        "magnitude": 7.0,
        "angular_width_arcmin": 180,
        "angular_height_arcmin": 120,
        "best_months": "Jun-Oct",
        "difficulty": "Medium",
        "framing": "Mosaic field",
        "exposure_hint": "OIII rich",
        "ra_hours": 20.77,
        "dec_deg": 30.72,
    },
    {
        "id": "m33",
        "catalog_id": "M33",
        "name": "Triangulum Galaxy",
        "type": "Galaxy",
        "constellation": "Triangulum",
        "season": "Autumn",
        "magnitude": 5.7,
        "angular_width_arcmin": 70,
        "angular_height_arcmin": 42,
        "best_months": "Sep-Dec",
        "difficulty": "Medium",
        "framing": "Medium galaxy",
        "exposure_hint": "Long RGB",
        "ra_hours": 1.56,
        "dec_deg": 30.66,
    },
    {
        "id": "m51",
        "catalog_id": "M51",
        "name": "Whirlpool Galaxy",
        "type": "Galaxy",
        "constellation": "Canes Venatici",
        "season": "Spring",
        "magnitude": 8.4,
        "angular_width_arcmin": 11,
        "angular_height_arcmin": 7,
        "best_months": "Mar-Jun",
        "difficulty": "Medium",
        "framing": "Small galaxy",
        "exposure_hint": "Long focal length",
        "ra_hours": 13.5,
        "dec_deg": 47.2,
    },
    {
        "id": "m101",
        "catalog_id": "M101",
        "name": "Pinwheel Galaxy",
        "type": "Galaxy",
        "constellation": "Ursa Major",
        "season": "Spring",
        "magnitude": 7.9,
        "angular_width_arcmin": 29,
        "angular_height_arcmin": 27,
        "best_months": "Mar-Jun",
        "difficulty": "Hard",
        "framing": "Small galaxy",
        "exposure_hint": "Dark sky RGB",
        "ra_hours": 14.05,
        "dec_deg": 54.35,
    },
]


def calculate_fov(payload: FovRequest) -> FovResponse:
    effective_focal_length_mm = payload.focal_length_mm * payload.reducer
    horizontal_deg = degrees(2 * atan(payload.sensor_width_mm / (2 * effective_focal_length_mm)))
    vertical_deg = degrees(2 * atan(payload.sensor_height_mm / (2 * effective_focal_length_mm)))
    diagonal_mm = hypot(payload.sensor_width_mm, payload.sensor_height_mm)
    diagonal_deg = degrees(2 * atan(diagonal_mm / (2 * effective_focal_length_mm)))
    pixel_scale_arcsec = (206.265 * payload.pixel_size_um) / effective_focal_length_mm

    return FovResponse(
        effective_focal_length_mm=effective_focal_length_mm,
        horizontal_deg=horizontal_deg,
        vertical_deg=vertical_deg,
        diagonal_deg=diagonal_deg,
        pixel_scale_arcsec=pixel_scale_arcsec,
    )


def plan_session(payload: SessionPlanRequest) -> SessionPlanResponse:
    target = next((item for item in TARGETS if item["id"] == payload.target_id), TARGETS[0])
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


def _estimate_moon_illumination(session_date: date) -> int:
    reference_new_moon = date(2000, 1, 6)
    lunar_cycle_days = 29.53058867
    days = (session_date - reference_new_moon).days
    phase = (days % lunar_cycle_days) / lunar_cycle_days
    illumination = (1 - cos(2 * pi * phase)) / 2
    return round(illumination * 100)


def _estimate_transparency(bortle: int, moon_illumination_percent: int) -> int:
    return round(max(38, min(96, 96 - bortle * 4.7 - moon_illumination_percent * 0.18)))


def _estimate_seeing(bortle: int, max_altitude_deg: int) -> float:
    altitude_penalty = max(0, 60 - max_altitude_deg) * 0.018
    return round(1.35 + bortle * 0.08 + altitude_penalty, 2)


def _score_astronomy(
    max_altitude_deg: int,
    moon_illumination_percent: int,
    transparency_percent: int,
    bortle: int,
    astronomical_darkness_minutes: int,
) -> int:
    score = transparency_percent
    score += min(18, max_altitude_deg * 0.22)
    score -= moon_illumination_percent * 0.22
    score -= max(0, bortle - 4) * 5
    if astronomical_darkness_minutes == 0:
        score -= 24
    elif astronomical_darkness_minutes < 120:
        score -= 12
    if max_altitude_deg < 20:
        score -= (20 - max_altitude_deg) * 2.5
    return round(max(0, min(100, score)))


def _score_conditions(astro_score: int, weather_score: int, weather_status: str) -> int:
    score = astro_score * 0.58 + weather_score * 0.42
    if weather_status == "skip":
        score -= 18
    elif weather_status == "risk":
        score -= 6
    return round(max(0, min(100, score)))


def _season_window(season: str) -> tuple[str, str]:
    windows = {
        "Winter": ("20:40", "03:35"),
        "Spring": ("21:25", "02:45"),
        "Summer": ("22:35", "02:25"),
        "Autumn": ("21:10", "03:05"),
    }
    return windows.get(season, ("21:30", "02:30"))


def _recommendation(
    score: int,
    moon_illumination_percent: int,
    target_type: str,
    white_night: bool,
    astronomical_darkness_minutes: int,
    max_altitude_deg: int,
    forecast: SkyForecastResponse,
    recommended_mode: str,
) -> str:
    if max_altitude_deg < 12:
        return "Target too low in darkness"
    if max_altitude_deg < 20:
        return "Low target: scout framing only"
    if forecast.status == "skip":
        return "Weather skip: calibration only"
    if white_night:
        if "nebula" in target_type.lower():
            return f"White night: {recommended_mode}"
        return "White night: prefer lunar/planetary"
    if astronomical_darkness_minutes < 120:
        return f"Short astro dark: {recommended_mode}"
    if score >= 82:
        return f"Prime window: {recommended_mode}"
    if "nebula" in target_type.lower() and moon_illumination_percent > 45:
        return "Prefer narrowband filters"
    if forecast.status == "risk":
        return f"Weather risk: {recommended_mode}"
    if score >= 64:
        return f"Good session: {recommended_mode}"
    return "Scout night or calibration run"


def _recommended_mode(
    target_type: str,
    white_night: bool,
    astronomical_darkness_minutes: int,
    moon_illumination_percent: int,
    weather_status: str,
    max_altitude_deg: int,
) -> str:
    target_type_lower = target_type.lower()
    is_nebula = "nebula" in target_type_lower
    is_lunar_or_planetary = "lunar" in target_type_lower or "planetary" in target_type_lower

    if weather_status == "skip":
        return "Calibration"
    if max_altitude_deg < 20:
        return "Scout framing"
    if is_lunar_or_planetary:
        return "Lunar/planetary"
    if white_night and is_nebula:
        return "Narrowband"
    if white_night:
        return "Calibration"
    if astronomical_darkness_minutes < 120 and is_nebula:
        return "Narrowband"
    if moon_illumination_percent > 45 and is_nebula:
        return "Narrowband"
    if moon_illumination_percent > 55:
        return "Luminance later"
    if weather_status == "risk":
        return "Short subs"
    return "RGB/Luminance"


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
