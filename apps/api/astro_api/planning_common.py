from datetime import date
from math import cos, pi

from .schemas import SkyForecastResponse

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

def _score_fov_fit(
    target_width_arcmin: float,
    target_height_arcmin: float,
    fov_horizontal_deg: float,
    fov_vertical_deg: float,
) -> tuple[int, str]:
    fov_width_arcmin = fov_horizontal_deg * 60
    fov_height_arcmin = fov_vertical_deg * 60
    load = max(target_width_arcmin / fov_width_arcmin, target_height_arcmin / fov_height_arcmin)

    if load <= 0.18:
        return 62, "Small"
    if load <= 0.78:
        return 96, "Fits"
    if load <= 1.05:
        return 80, "Tight"
    if load <= 1.8:
        return 58, "Mosaic"
    return 38, "Large mosaic"


def _score_board_target(
    condition_score: int,
    fov_score: int,
    max_altitude_deg: int,
    magnitude: float,
    target_type: str,
    white_night: bool,
) -> int:
    altitude_score = max(0, min(100, max_altitude_deg * 1.55))
    brightness_score = max(28, min(100, 100 - max(0, magnitude - 2) * 7.5))
    score = condition_score * 0.56 + fov_score * 0.24
    score += altitude_score * 0.14 + brightness_score * 0.06
    if white_night:
        target_type_lower = target_type.lower()
        if "nebula" in target_type_lower or "remnant" in target_type_lower:
            score += 8
        else:
            score -= 18
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
    is_nebula = "nebula" in target_type_lower or "remnant" in target_type_lower
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
