from datetime import date

from .astro_engine import TargetProfile, build_astro_plan
from .catalog import TARGETS
from .forecast import get_sky_forecast
from .planning_common import (
    _estimate_moon_illumination,
    _estimate_transparency,
    _recommended_mode,
    _score_astronomy,
    _score_board_target,
    _score_conditions,
    _score_fov_fit,
)
from .schemas import (
    SkyForecastRequest,
    TonightBoardItem,
    TonightBoardRequest,
    TonightBoardResponse,
)

def rank_tonight_targets(payload: TonightBoardRequest) -> TonightBoardResponse:
    session_date = payload.date or date.today()
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

    items: list[TonightBoardItem] = []
    white_night = False
    for target in TARGETS:
        astro_plan = build_astro_plan(
            session_date=session_date,
            latitude_deg=payload.latitude_deg,
            longitude_deg=payload.longitude_deg,
            timezone_name=payload.timezone,
            target=TargetProfile(ra_hours=target["ra_hours"], dec_deg=target["dec_deg"]),
        )
        white_night = white_night or astro_plan.white_night
        transparency_percent = _estimate_transparency(payload.bortle, moon_illumination_percent)
        astronomy_score = _score_astronomy(
            max_altitude_deg=astro_plan.max_altitude_deg,
            moon_illumination_percent=moon_illumination_percent,
            transparency_percent=transparency_percent,
            bortle=payload.bortle,
            astronomical_darkness_minutes=astro_plan.astronomical_darkness_minutes,
        )
        condition_score = _score_conditions(
            astro_score=astronomy_score,
            weather_score=forecast.score,
            weather_status=forecast.status,
        )
        fov_score, fov_fit = _score_fov_fit(
            target_width_arcmin=float(target["angular_width_arcmin"]),
            target_height_arcmin=float(target["angular_height_arcmin"]),
            fov_horizontal_deg=payload.fov_horizontal_deg,
            fov_vertical_deg=payload.fov_vertical_deg,
        )
        recommended_mode = _recommended_mode(
            target_type=str(target["type"]),
            white_night=astro_plan.white_night,
            astronomical_darkness_minutes=astro_plan.astronomical_darkness_minutes,
            moon_illumination_percent=moon_illumination_percent,
            weather_status=forecast.status,
            max_altitude_deg=astro_plan.max_altitude_deg,
        )
        score = _score_board_target(
            condition_score=condition_score,
            fov_score=fov_score,
            max_altitude_deg=astro_plan.max_altitude_deg,
            magnitude=float(target["magnitude"]),
            target_type=str(target["type"]),
            white_night=astro_plan.white_night,
        )
        items.append(
            TonightBoardItem(
                target_id=str(target["id"]),
                target_name=str(target["name"]),
                catalog_id=str(target["catalog_id"]),
                target_type=str(target["type"]),
                constellation=str(target["constellation"]),
                score=score,
                astronomy_score=astronomy_score,
                weather_score=forecast.score,
                fov_score=fov_score,
                fov_fit=fov_fit,
                start_time=astro_plan.best_start_time,
                end_time=astro_plan.best_end_time,
                best_time=astro_plan.meridian_time,
                max_altitude_deg=astro_plan.max_altitude_deg,
                recommended_mode=recommended_mode,
                reason=_board_reason(
                    astro_plan.white_night,
                    forecast.status,
                    fov_fit,
                    astro_plan.max_altitude_deg,
                    recommended_mode,
                ),
            )
        )

    ranked_items = sorted(items, key=lambda item: item.score, reverse=True)[: payload.limit]
    return TonightBoardResponse(
        date=session_date.isoformat(),
        summary=_board_summary(ranked_items, forecast.status, white_night),
        weather_status=forecast.status,
        weather_score=forecast.score,
        moon_illumination_percent=moon_illumination_percent,
        white_night=white_night,
        items=ranked_items,
    )

def _board_reason(
    white_night: bool,
    weather_status: str,
    fov_fit: str,
    max_altitude_deg: int,
    recommended_mode: str,
) -> str:
    if weather_status == "skip":
        return "Weather skip, keep as backup"
    if max_altitude_deg < 20:
        return "Low altitude: scout framing"
    if white_night:
        return f"White night: {recommended_mode}"
    if fov_fit in {"Mosaic", "Large mosaic"}:
        return f"{fov_fit} plan, {recommended_mode}"
    if fov_fit == "Small":
        return f"Small target, {recommended_mode}"
    return f"{fov_fit} frame, {recommended_mode}"


def _board_summary(
    items: list[TonightBoardItem],
    weather_status: str,
    white_night: bool,
) -> str:
    if not items:
        return "No ranked targets"
    prefix = "White-night board" if white_night else "Tonight board"
    if weather_status == "skip":
        return f"{prefix}: weather favors calibration"
    if weather_status == "risk":
        return f"{prefix}: weather risk, start with {items[0].target_name}"
    return f"{prefix}: start with {items[0].target_name}"
