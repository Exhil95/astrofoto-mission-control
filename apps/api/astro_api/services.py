from datetime import date
from math import acos, asin, atan, cos, degrees, hypot, pi, radians, sin

from .schemas import FovRequest, FovResponse, SessionPlanRequest, SessionPlanResponse, TimelineSlot


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

    max_altitude_deg = _estimate_culmination_altitude(payload.latitude_deg, target["dec_deg"])
    night_darkness = _estimate_night_darkness(session_date, payload.latitude_deg)
    moon_illumination_percent = _estimate_moon_illumination(session_date)
    transparency_percent = _estimate_transparency(payload.bortle, moon_illumination_percent)
    seeing_arcsec = _estimate_seeing(payload.bortle, max_altitude_deg)
    condition_score = _score_conditions(
        max_altitude_deg=max_altitude_deg,
        moon_illumination_percent=moon_illumination_percent,
        transparency_percent=transparency_percent,
        bortle=payload.bortle,
        astronomical_darkness_minutes=night_darkness["astronomical_darkness_minutes"],
    )
    start_time, end_time = _season_window(target["season"])
    recommendation = _recommendation(
        condition_score,
        moon_illumination_percent,
        target["type"],
        night_darkness["white_night"],
        night_darkness["astronomical_darkness_minutes"],
    )

    return SessionPlanResponse(
        target_id=target["id"],
        target_name=target["name"],
        night_label=session_date.strftime("%d %b %Y"),
        night_kind=night_darkness["night_kind"],
        night_kind_label=night_darkness["night_kind_label"],
        start_time=start_time,
        end_time=end_time,
        white_night=night_darkness["white_night"],
        min_sun_altitude_deg=night_darkness["min_sun_altitude_deg"],
        civil_darkness_minutes=night_darkness["civil_darkness_minutes"],
        nautical_darkness_minutes=night_darkness["nautical_darkness_minutes"],
        astronomical_darkness_minutes=night_darkness["astronomical_darkness_minutes"],
        moon_illumination_percent=moon_illumination_percent,
        max_altitude_deg=max_altitude_deg,
        transparency_percent=transparency_percent,
        seeing_arcsec=seeing_arcsec,
        condition_score=condition_score,
        recommendation=recommendation,
        slots=[
            TimelineSlot(time=start_time, label="Acquire", value=f"{max_altitude_deg - 18:+d} deg", intensity=0.35),
            TimelineSlot(time="22:40", label="Guide", value=f"{seeing_arcsec:.1f} arcsec", intensity=0.55),
            TimelineSlot(time="00:30", label="Peak", value=f"{max_altitude_deg} deg", intensity=0.95),
            TimelineSlot(time=end_time, label="Wrap", value=f"{condition_score}/100", intensity=0.68),
        ],
    )


def _estimate_culmination_altitude(latitude_deg: float, dec_deg: float) -> int:
    return round(max(0, min(90, 90 - abs(latitude_deg - dec_deg))))


def _estimate_night_darkness(session_date: date, latitude_deg: float) -> dict[str, int | float | bool | str]:
    solar_dec_deg = _estimate_solar_declination(session_date)
    min_sun_altitude_deg = _solar_altitude_at_midnight(latitude_deg, solar_dec_deg)
    civil_darkness_minutes = _minutes_below_solar_altitude(session_date, latitude_deg, -6)
    nautical_darkness_minutes = _minutes_below_solar_altitude(session_date, latitude_deg, -12)
    astronomical_darkness_minutes = _minutes_below_solar_altitude(session_date, latitude_deg, -18)
    white_night = astronomical_darkness_minutes == 0

    if astronomical_darkness_minutes >= 90:
        night_kind = "astronomical"
        night_kind_label = "Astronomical night"
    elif nautical_darkness_minutes >= 90:
        night_kind = "nautical"
        night_kind_label = "Nautical only"
    elif civil_darkness_minutes >= 90:
        night_kind = "bright"
        night_kind_label = "Bright night"
    else:
        night_kind = "white"
        night_kind_label = "White night"

    return {
        "night_kind": night_kind,
        "night_kind_label": night_kind_label,
        "white_night": white_night,
        "min_sun_altitude_deg": round(min_sun_altitude_deg, 1),
        "civil_darkness_minutes": civil_darkness_minutes,
        "nautical_darkness_minutes": nautical_darkness_minutes,
        "astronomical_darkness_minutes": astronomical_darkness_minutes,
    }


def _estimate_solar_declination(session_date: date) -> float:
    day_of_year = session_date.timetuple().tm_yday
    return 23.44 * sin(2 * pi * (day_of_year - 81) / 365.2422)


def _solar_altitude_at_midnight(latitude_deg: float, solar_dec_deg: float) -> float:
    latitude = radians(latitude_deg)
    declination = radians(solar_dec_deg)
    sin_altitude = sin(latitude) * sin(declination) - cos(latitude) * cos(declination)
    return degrees(asin(max(-1, min(1, sin_altitude))))


def _minutes_below_solar_altitude(
    session_date: date,
    latitude_deg: float,
    threshold_altitude_deg: float,
) -> int:
    latitude = radians(latitude_deg)
    declination = radians(_estimate_solar_declination(session_date))
    threshold = radians(threshold_altitude_deg)
    denominator = cos(latitude) * cos(declination)

    if abs(denominator) < 1e-9:
        return 0

    cos_hour_angle = (sin(threshold) - sin(latitude) * sin(declination)) / denominator

    if cos_hour_angle <= -1:
        return 0
    if cos_hour_angle >= 1:
        return 24 * 60

    above_threshold_hours = (2 * acos(cos_hour_angle) / (2 * pi)) * 24
    return round((24 - above_threshold_hours) * 60)


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
) -> str:
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
