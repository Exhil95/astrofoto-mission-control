from datetime import date
from math import atan, cos, degrees, hypot, pi

from .astro_engine import TargetProfile, build_astro_plan
from .schemas import AltitudePoint, FovRequest, FovResponse, SessionPlanRequest, SessionPlanResponse, TimelineSlot


TARGETS = [
    {
        "id": "m42",
        "name": "Orion Nebula",
        "type": "Emission nebula",
        "season": "Winter",
        "magnitude": 4.0,
        "ra_hours": 5.59,
        "dec_deg": -5.45,
    },
    {
        "id": "m31",
        "name": "Andromeda",
        "type": "Galaxy",
        "season": "Autumn",
        "magnitude": 3.4,
        "ra_hours": 0.71,
        "dec_deg": 41.27,
    },
    {
        "id": "ngc7000",
        "name": "North America",
        "type": "Emission nebula",
        "season": "Summer",
        "magnitude": 4.0,
        "ra_hours": 20.97,
        "dec_deg": 44.33,
    },
    {
        "id": "m45",
        "name": "Pleiades",
        "type": "Reflection nebula",
        "season": "Winter",
        "magnitude": 1.6,
        "ra_hours": 3.79,
        "dec_deg": 24.12,
    },
    {
        "id": "ic1396",
        "name": "Elephant Trunk",
        "type": "Dark nebula",
        "season": "Autumn",
        "magnitude": 3.5,
        "ra_hours": 21.65,
        "dec_deg": 57.5,
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
    transparency_percent = _estimate_transparency(payload.bortle, moon_illumination_percent)
    seeing_arcsec = _estimate_seeing(payload.bortle, astro_plan.max_altitude_deg)
    condition_score = _score_conditions(
        max_altitude_deg=astro_plan.max_altitude_deg,
        moon_illumination_percent=moon_illumination_percent,
        transparency_percent=transparency_percent,
        bortle=payload.bortle,
        astronomical_darkness_minutes=astro_plan.astronomical_darkness_minutes,
    )
    recommendation = _recommendation(
        condition_score,
        moon_illumination_percent,
        target["type"],
        astro_plan.white_night,
        astro_plan.astronomical_darkness_minutes,
        astro_plan.max_altitude_deg,
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
        condition_score=condition_score,
        recommendation=recommendation,
        slots=_timeline_slots(astro_plan, condition_score),
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


def _score_conditions(
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
) -> str:
    if max_altitude_deg < 12:
        return "Target too low in darkness"
    if max_altitude_deg < 20:
        return "Low target: scout framing only"
    if white_night:
        if "nebula" in target_type.lower():
            return "White night: narrowband or calibration"
        return "White night: prefer lunar/planetary"
    if astronomical_darkness_minutes < 120:
        return "Short astro dark window"
    if score >= 82:
        return "Prime imaging window"
    if "nebula" in target_type.lower() and moon_illumination_percent > 45:
        return "Prefer narrowband filters"
    if score >= 64:
        return "Good session with careful framing"
    return "Scout night or calibration run"


def _timeline_slots(astro_plan, condition_score: int) -> list[TimelineSlot]:
    if astro_plan.astronomical_darkness_minutes:
        dark_label = "Astro start"
        dark_value = f"{_format_duration(astro_plan.astronomical_darkness_minutes)}"
    elif astro_plan.nautical_darkness_minutes:
        dark_label = "Nautical"
        dark_value = f"{_format_duration(astro_plan.nautical_darkness_minutes)}"
    else:
        dark_label = "Bright"
        dark_value = f"{_format_duration(astro_plan.civil_darkness_minutes)}"

    return [
        TimelineSlot(time=astro_plan.best_start_time, label=dark_label, value=dark_value, intensity=0.45, kind="sky"),
        TimelineSlot(time=astro_plan.meridian_time, label="Peak", value=f"{astro_plan.max_altitude_deg} deg", intensity=0.95, kind="target"),
        TimelineSlot(time=astro_plan.best_end_time, label="End run", value=f"{condition_score}/100", intensity=0.7, kind="target"),
        TimelineSlot(time="--:--", label=astro_plan.night_kind_label, value=f"{condition_score}/100", intensity=0.5, kind="sky"),
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
