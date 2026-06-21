from concurrent.futures import ThreadPoolExecutor, wait
from datetime import date, timedelta

from .astro_engine import TargetProfile, build_astro_plan
from .catalog import TARGETS
from .forecast import build_fallback_sky_forecast, get_sky_forecast
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
    MultiSessionNightSummary,
    MultiSessionPlanItem,
    MultiSessionPlanRequest,
    MultiSessionPlanResponse,
    SkyForecastRequest,
    SkyForecastResponse,
)

MULTI_SESSION_FORECAST_BUDGET_SECONDS = 3.0

def plan_multi_session(payload: MultiSessionPlanRequest) -> MultiSessionPlanResponse:
    start_date = payload.start_date or date.today()
    selected_targets = _multi_session_targets(payload.target_ids)
    session_dates = [start_date + timedelta(days=offset) for offset in range(payload.nights)]
    forecasts = _multi_session_forecasts(payload, session_dates)
    all_items: list[MultiSessionPlanItem] = []
    night_summaries: list[MultiSessionNightSummary] = []
    warnings: list[str] = []

    for session_date in session_dates:
        forecast = forecasts[session_date]
        moon_illumination_percent = _estimate_moon_illumination(session_date)
        night_items = [
            _multi_session_item(
                target=target,
                session_date=session_date,
                forecast=forecast,
                moon_illumination_percent=moon_illumination_percent,
                payload=payload,
            )
            for target in selected_targets
        ]
        ranked_night_items = sorted(night_items, key=lambda item: item.score, reverse=True)
        all_items.extend(ranked_night_items)
        best_item = ranked_night_items[0]
        night_summaries.append(
            MultiSessionNightSummary(
                date=session_date.isoformat(),
                score=best_item.score,
                weather_status=forecast.status,
                weather_score=forecast.score,
                moon_illumination_percent=moon_illumination_percent,
                white_night=best_item.white_night,
                best_target_id=best_item.target_id,
                best_target_name=best_item.target_name,
                catalog_id=best_item.catalog_id,
                target_type=best_item.target_type,
                fov_fit=best_item.fov_fit,
                max_altitude_deg=best_item.max_altitude_deg,
                start_time=best_item.start_time,
                end_time=best_item.end_time,
                best_time=best_item.best_time,
                recommended_mode=best_item.recommended_mode,
                reason=best_item.reason,
                summary=_multi_session_night_summary(best_item, forecast),
            )
        )

    ranked_items = sorted(all_items, key=lambda item: item.score, reverse=True)[: payload.limit]
    if not ranked_items:
        warnings.append("No multi-session candidates found")
    elif ranked_items[0].score < 45:
        warnings.append("No strong session in this range; keep calibration or scouting as fallback")
    if any(night.white_night for night in night_summaries):
        warnings.append("White-night range: narrowband targets get a planning bonus")

    return MultiSessionPlanResponse(
        start_date=start_date.isoformat(),
        end_date=(start_date + timedelta(days=payload.nights - 1)).isoformat(),
        nights=payload.nights,
        summary=_multi_session_summary(ranked_items, night_summaries),
        items=ranked_items,
        nights_summary=night_summaries,
        warnings=warnings,
    )


def _multi_session_forecasts(
    payload: MultiSessionPlanRequest,
    session_dates: list[date],
) -> dict[date, SkyForecastResponse]:
    def fallback_forecast(session_date: date) -> SkyForecastResponse:
        return build_fallback_sky_forecast(
            SkyForecastRequest(
                date=session_date,
                latitude_deg=payload.latitude_deg,
                longitude_deg=payload.longitude_deg,
                timezone=payload.timezone,
                cache_ttl_minutes=payload.forecast_cache_ttl_minutes,
                force_refresh=True,
            ),
            session_date,
        )

    def load_forecast(item: tuple[int, date]) -> tuple[date, SkyForecastResponse]:
        night_offset, session_date = item
        forecast = get_sky_forecast(
            SkyForecastRequest(
                date=session_date,
                latitude_deg=payload.latitude_deg,
                longitude_deg=payload.longitude_deg,
                timezone=payload.timezone,
                cache_ttl_minutes=payload.forecast_cache_ttl_minutes,
                force_refresh=payload.force_forecast_refresh and night_offset == 0,
            )
        )
        return session_date, forecast

    forecasts = {session_date: fallback_forecast(session_date) for session_date in session_dates}
    worker_count = min(6, max(1, len(session_dates)))
    executor = ThreadPoolExecutor(max_workers=worker_count)
    future_map = {
        executor.submit(load_forecast, item): item[1]
        for item in enumerate(session_dates)
    }
    try:
        done, pending = wait(future_map, timeout=MULTI_SESSION_FORECAST_BUDGET_SECONDS)
        for future in done:
            session_date = future_map[future]
            try:
                _, forecast = future.result()
            except Exception:
                continue
            forecasts[session_date] = forecast
        for future in pending:
            future.cancel()
    finally:
        executor.shutdown(wait=False, cancel_futures=True)
    return forecasts


def _multi_session_targets(target_ids: list[str]) -> list[dict[str, object]]:
    if not target_ids:
        return TARGETS

    requested_ids = set(target_ids)
    targets = [target for target in TARGETS if str(target["id"]) in requested_ids]
    return targets or TARGETS


def _multi_session_item(
    *,
    target: dict[str, object],
    session_date: date,
    forecast: SkyForecastResponse,
    moon_illumination_percent: int,
    payload: MultiSessionPlanRequest,
) -> MultiSessionPlanItem:
    astro_plan = build_astro_plan(
        session_date=session_date,
        latitude_deg=payload.latitude_deg,
        longitude_deg=payload.longitude_deg,
        timezone_name=payload.timezone,
        target=TargetProfile(
            ra_hours=float(target["ra_hours"]),
            dec_deg=float(target["dec_deg"]),
        ),
    )
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
    target_type = str(target["type"])
    recommended_mode = _recommended_mode(
        target_type=target_type,
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
        target_type=target_type,
        white_night=astro_plan.white_night,
    )

    return MultiSessionPlanItem(
        date=session_date.isoformat(),
        target_id=str(target["id"]),
        target_name=str(target["name"]),
        catalog_id=str(target["catalog_id"]),
        target_type=target_type,
        score=score,
        astronomy_score=astronomy_score,
        weather_score=forecast.score,
        fov_score=fov_score,
        fov_fit=fov_fit,
        moon_illumination_percent=moon_illumination_percent,
        white_night=astro_plan.white_night,
        max_altitude_deg=astro_plan.max_altitude_deg,
        start_time=astro_plan.best_start_time,
        end_time=astro_plan.best_end_time,
        best_time=astro_plan.meridian_time,
        recommended_mode=recommended_mode,
        reason=_multi_session_reason(
            score=score,
            fov_fit=fov_fit,
            weather_status=forecast.status,
            white_night=astro_plan.white_night,
            max_altitude_deg=astro_plan.max_altitude_deg,
            recommended_mode=recommended_mode,
        ),
    )


def _multi_session_reason(
    *,
    score: int,
    fov_fit: str,
    weather_status: str,
    white_night: bool,
    max_altitude_deg: int,
    recommended_mode: str,
) -> str:
    if weather_status == "skip":
        return "Weather skip: keep as backup or calibration night"
    if max_altitude_deg < 20:
        return "Low altitude: scout only"
    if white_night:
        return f"White night: {recommended_mode}, {fov_fit.lower()} frame"
    if score >= 82:
        return f"Prime session: {recommended_mode}, {fov_fit.lower()} frame"
    if weather_status == "risk":
        return f"Weather risk: {recommended_mode}, start with short block"
    return f"{recommended_mode}, {fov_fit.lower()} frame"


def _multi_session_night_summary(
    best_item: MultiSessionPlanItem,
    forecast: SkyForecastResponse,
) -> str:
    if forecast.status == "skip":
        return f"Weather favors backup plan; best candidate is {best_item.target_name}"
    if best_item.white_night:
        return f"White-night pick: {best_item.target_name}"
    return f"Best pick: {best_item.target_name} at {best_item.best_time}"


def _multi_session_summary(
    items: list[MultiSessionPlanItem],
    night_summaries: list[MultiSessionNightSummary],
) -> str:
    if not items:
        return "No multi-session plan"
    best = items[0]
    strong_nights = sum(1 for night in night_summaries if night.score >= 70)
    return (
        f"{strong_nights}/{len(night_summaries)} strong nights; "
        f"top pick {best.target_name} on {best.date}"
    )
