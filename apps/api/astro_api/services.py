from datetime import date
from math import atan, cos, degrees, hypot, pi

from .astro_engine import TargetProfile, build_astro_plan
from .catalog import TARGETS, get_target
from .forecast import get_sky_forecast
from .schemas import (
    AltitudePoint,
    CaptureCalibrationStep,
    CaptureExposureStep,
    CapturePlanRequest,
    CapturePlanResponse,
    ProcessingCalibrationMatch,
    ProcessingPlanRequest,
    ProcessingPlanResponse,
    ProcessingWorkflowStep,
    FovRequest,
    FovResponse,
    SessionPlanRequest,
    SessionPlanResponse,
    SkyForecastRequest,
    SkyForecastResponse,
    TonightBoardItem,
    TonightBoardRequest,
    TonightBoardResponse,
    TimelineSlot,
)


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


def build_capture_plan(payload: CapturePlanRequest) -> CapturePlanResponse:
    target = get_target(payload.target_id)
    session_plan = plan_session(
        SessionPlanRequest(
            target_id=payload.target_id,
            date=payload.date,
            latitude_deg=payload.latitude_deg,
            longitude_deg=payload.longitude_deg,
            timezone=payload.timezone,
            bortle=payload.bortle,
            forecast_cache_ttl_minutes=payload.forecast_cache_ttl_minutes,
            force_forecast_refresh=payload.force_forecast_refresh,
        )
    )
    fov_fit = _capture_fov_fit(
        target_width_arcmin=float(target["angular_width_arcmin"]),
        target_height_arcmin=float(target["angular_height_arcmin"]),
        fov_horizontal_deg=payload.fov_horizontal_deg,
        fov_vertical_deg=payload.fov_vertical_deg,
    )
    available_minutes = _capture_window_minutes(session_plan.start_time, session_plan.end_time)
    total_integration_minutes = max(45, min(available_minutes - 18, 360))
    imaging_mode = _capture_mode(str(target["type"]), session_plan)
    exposure_steps = _capture_exposure_steps(
        target_type=str(target["type"]),
        imaging_mode=imaging_mode,
        total_minutes=total_integration_minutes,
        bortle=payload.bortle,
        pixel_scale_arcsec=payload.pixel_scale_arcsec,
    )
    calibration_frames = _capture_calibration_steps(exposure_steps)
    checklist = _capture_checklist(session_plan, fov_fit)

    plan = CapturePlanResponse(
        target_id=str(target["id"]),
        target_name=str(target["name"]),
        date=(payload.date or date.today()).isoformat(),
        window_start=session_plan.start_time,
        window_end=session_plan.end_time,
        imaging_mode=imaging_mode,
        total_integration_minutes=sum(step.integration_minutes for step in exposure_steps),
        guiding=_guiding_note(payload.pixel_scale_arcsec, session_plan.seeing_arcsec),
        dithering_every_frames=3 if payload.bortle <= 4 else 2,
        autofocus_every_minutes=55 if session_plan.white_night else 75,
        meridian_action=f"Pause before {session_plan.slots[2].time if len(session_plan.slots) > 2 else session_plan.end_time}",
        framing_note=f"{fov_fit}: {target['framing']}",
        moon_warning=_moon_warning(session_plan.moon_illumination_percent, str(target["type"])),
        weather_note=f"{session_plan.weather_status.title()}: {session_plan.weather_summary}",
        exposure_steps=exposure_steps,
        calibration_frames=calibration_frames,
        checklist=checklist,
        export_markdown="",
    )
    return plan.model_copy(update={"export_markdown": _capture_markdown(plan)})


def build_processing_plan(payload: ProcessingPlanRequest) -> ProcessingPlanResponse:
    target = get_target(payload.target_id)
    target_type = str(target["type"])
    filters = payload.filter_names or ["Luminance"]
    planned_frames = payload.planned_frames or _estimate_frame_count(
        payload.total_integration_minutes,
        filters,
    )
    integration_class = _integration_class(payload.total_integration_minutes)
    gradient_score = _gradient_score(
        bortle=payload.bortle,
        moon_illumination_percent=payload.moon_illumination_percent,
        white_night=payload.white_night,
        weather_score=payload.weather_score,
        target_type=target_type,
    )
    gradient_risk = _gradient_label(gradient_score)
    drizzle = _drizzle_recommendation(
        pixel_scale_arcsec=payload.pixel_scale_arcsec,
        planned_frames=planned_frames,
        integration_minutes=payload.total_integration_minutes,
    )
    binning = _binning_recommendation(
        pixel_scale_arcsec=payload.pixel_scale_arcsec,
        gradient_score=gradient_score,
        planned_frames=planned_frames,
    )
    stack_strategy = _stack_strategy(target_type, filters, planned_frames)
    calibration_matches = _processing_calibration_matches(filters)
    workflow = _processing_workflow(
        target_type=target_type,
        filters=filters,
        gradient_score=gradient_score,
        drizzle=drizzle,
        binning=binning,
    )

    return ProcessingPlanResponse(
        target_id=str(target["id"]),
        target_name=str(target["name"]),
        integration_class=integration_class,
        stack_strategy=stack_strategy,
        calibration_strategy=_calibration_strategy(filters, payload.total_integration_minutes),
        drizzle=drizzle,
        binning=binning,
        normalization=_normalization_strategy(filters, gradient_score),
        gradient_risk=gradient_risk,
        gradient_score=gradient_score,
        noise_reduction=_noise_reduction_strategy(integration_class, gradient_score, target_type),
        color_strategy=_color_strategy(target_type, filters),
        rejection=_rejection_strategy(planned_frames),
        calibration_matches=calibration_matches,
        workflow=workflow,
        warnings=_processing_warnings(
            gradient_score=gradient_score,
            planned_frames=planned_frames,
            white_night=payload.white_night,
            filters=filters,
        ),
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


def _capture_mode(target_type: str, session_plan: SessionPlanResponse) -> str:
    target_type_lower = target_type.lower()
    is_nebula = "nebula" in target_type_lower or "remnant" in target_type_lower
    if session_plan.weather_status == "skip":
        return "Calibration / scout"
    if session_plan.max_altitude_deg < 20:
        return "Scout framing"
    if is_nebula and (session_plan.white_night or session_plan.moon_illumination_percent > 40):
        return "Narrowband"
    if "galaxy" in target_type_lower:
        return "LRGB"
    if "reflection" in target_type_lower:
        return "RGB"
    if is_nebula:
        return "Narrowband + RGB stars"
    return session_plan.recommended_mode


def _capture_exposure_steps(
    target_type: str,
    imaging_mode: str,
    total_minutes: int,
    bortle: int,
    pixel_scale_arcsec: float,
) -> list[CaptureExposureStep]:
    base_seconds = _base_exposure_seconds(imaging_mode, bortle, pixel_scale_arcsec)
    target_type_lower = target_type.lower()
    if "Narrowband" in imaging_mode:
        filters = [("Ha", 0.5), ("OIII", 0.35), ("SII", 0.15)]
        if "remnant" in target_type_lower:
            filters = [("OIII", 0.45), ("Ha", 0.4), ("SII", 0.15)]
    elif imaging_mode == "LRGB":
        filters = [("L", 0.45), ("R", 0.18), ("G", 0.18), ("B", 0.19)]
    elif imaging_mode == "RGB":
        filters = [("R", 0.34), ("G", 0.33), ("B", 0.33)]
    else:
        filters = [("Luminance", 1.0)]

    steps: list[CaptureExposureStep] = []
    for filter_name, share in filters:
        integration_minutes = max(12, round(total_minutes * share))
        frames = max(6, round((integration_minutes * 60) / base_seconds))
        adjusted_minutes = round((frames * base_seconds) / 60)
        steps.append(
            CaptureExposureStep(
                filter_name=filter_name,
                exposure_seconds=base_seconds,
                frames=frames,
                integration_minutes=adjusted_minutes,
                binning="1x1",
                gain=_gain_note(imaging_mode),
                note=_filter_note(filter_name, imaging_mode),
            )
        )
    return steps


def _base_exposure_seconds(imaging_mode: str, bortle: int, pixel_scale_arcsec: float) -> int:
    if "Narrowband" in imaging_mode:
        seconds = 300 if bortle <= 4 else 240
    elif imaging_mode == "LRGB":
        seconds = 180 if bortle <= 4 else 120
    elif imaging_mode == "RGB":
        seconds = 120 if bortle <= 4 else 90
    else:
        seconds = 60
    if pixel_scale_arcsec < 0.9:
        seconds = round(seconds * 0.75)
    return max(30, seconds)


def _gain_note(imaging_mode: str) -> str:
    if "Narrowband" in imaging_mode:
        return "unity / low read noise"
    if imaging_mode in {"LRGB", "RGB"}:
        return "unity, protect highlights"
    return "unity"


def _filter_note(filter_name: str, imaging_mode: str) -> str:
    if filter_name == "L":
        return "Prioritize during best transparency"
    if filter_name in {"Ha", "OIII", "SII"}:
        return f"{filter_name} for {imaging_mode.lower()} signal"
    if filter_name in {"R", "G", "B"}:
        return "Keep star color balanced"
    return "Use for framing or backup signal"


def _capture_calibration_steps(
    exposure_steps: list[CaptureExposureStep],
) -> list[CaptureCalibrationStep]:
    dark_exposures = sorted({step.exposure_seconds for step in exposure_steps})
    calibration = [
        CaptureCalibrationStep(
            frame_type="Bias",
            frames=50,
            exposure="shortest",
            note="Only if your camera workflow uses bias",
        ),
        CaptureCalibrationStep(
            frame_type="Flats",
            frames=30,
            exposure="per filter",
            note="Shoot before tearing down the optical train",
        ),
        CaptureCalibrationStep(
            frame_type="Dark flats",
            frames=30,
            exposure="flat exposure",
            note="Match flat exposure and temperature",
        ),
    ]
    for exposure in dark_exposures:
        calibration.append(
            CaptureCalibrationStep(
                frame_type="Darks",
                frames=20,
                exposure=f"{exposure}s",
                note="Match gain, offset, and temperature",
            )
        )
    return calibration


def _capture_checklist(session_plan: SessionPlanResponse, fov_fit: str) -> list[str]:
    checklist = [
        "Polar align and plate-solve first frame",
        "Run autofocus before first light frame",
        "Guide calibration after target slew",
        "Enable dithering before sequence start",
        "Inspect first two subs for tilt, clouds, and star shape",
    ]
    if fov_fit in {"Mosaic", "Large mosaic"}:
        checklist.insert(1, "Confirm panel overlap and mosaic rotation")
    if session_plan.weather_status == "risk":
        checklist.append("Use shorter first block and watch cloud trend")
    if session_plan.white_night:
        checklist.append("Prefer narrowband and skip weak broadband color")
    return checklist


def _capture_fov_fit(
    target_width_arcmin: float,
    target_height_arcmin: float,
    fov_horizontal_deg: float,
    fov_vertical_deg: float,
) -> str:
    _score, label = _score_fov_fit(
        target_width_arcmin,
        target_height_arcmin,
        fov_horizontal_deg,
        fov_vertical_deg,
    )
    return label


def _capture_window_minutes(start_time: str, end_time: str) -> int:
    start = _time_to_minutes(start_time)
    end = _time_to_minutes(end_time)
    if end <= start:
        end += 24 * 60
    return max(60, end - start)


def _time_to_minutes(value: str) -> int:
    hours, minutes = [int(part) for part in value.split(":")]
    return hours * 60 + minutes


def _guiding_note(pixel_scale_arcsec: float, seeing_arcsec: float) -> str:
    target_rms = max(0.45, min(1.2, pixel_scale_arcsec * 0.65))
    return f"Target RMS <= {target_rms:.2f} arcsec; seeing estimate {seeing_arcsec:.1f} arcsec"


def _moon_warning(moon_illumination_percent: int, target_type: str) -> str:
    if moon_illumination_percent < 25:
        return "Moon is not a major constraint"
    if "nebula" in target_type.lower() or "remnant" in target_type.lower():
        return "Moon present: favor narrowband filters"
    return "Moon present: delay broadband color if possible"


def _capture_markdown(plan: CapturePlanResponse) -> str:
    exposure_lines = "\n".join(
        f"- {step.filter_name}: {step.frames} x {step.exposure_seconds}s "
        f"({step.integration_minutes} min), {step.gain}"
        for step in plan.exposure_steps
    )
    calibration_lines = "\n".join(
        f"- {step.frame_type}: {step.frames} x {step.exposure} - {step.note}"
        for step in plan.calibration_frames
    )
    checklist_lines = "\n".join(f"- [ ] {item}" for item in plan.checklist)
    return "\n".join(
        [
            f"# Capture Plan: {plan.target_name}",
            "",
            f"- Date: {plan.date}",
            f"- Window: {plan.window_start} - {plan.window_end}",
            f"- Mode: {plan.imaging_mode}",
            f"- Integration: {plan.total_integration_minutes} min",
            f"- Framing: {plan.framing_note}",
            f"- Guiding: {plan.guiding}",
            f"- Dither: every {plan.dithering_every_frames} frames",
            f"- Autofocus: every {plan.autofocus_every_minutes} min",
            f"- Meridian: {plan.meridian_action}",
            "",
            "## Lights",
            exposure_lines,
            "",
            "## Calibration",
            calibration_lines,
            "",
            "## Checklist",
            checklist_lines,
            "",
            f"Weather: {plan.weather_note}",
            f"Moon: {plan.moon_warning}",
        ]
    )


def _estimate_frame_count(total_integration_minutes: int, filters: list[str]) -> int:
    exposure_minutes = 5 if any(_is_narrowband_filter(item) for item in filters) else 2
    return max(1, round(total_integration_minutes / max(1, exposure_minutes)))


def _integration_class(total_integration_minutes: int) -> str:
    if total_integration_minutes >= 480:
        return "Deep stack"
    if total_integration_minutes >= 240:
        return "Strong stack"
    if total_integration_minutes >= 120:
        return "Usable stack"
    return "Scout stack"


def _gradient_score(
    bortle: int,
    moon_illumination_percent: int,
    white_night: bool,
    weather_score: int,
    target_type: str,
) -> int:
    score = bortle * 7 + moon_illumination_percent * 0.42 + max(0, 72 - weather_score) * 0.34
    if white_night:
        score += 24
    target_type_lower = target_type.lower()
    if "reflection" in target_type_lower or "galaxy" in target_type_lower:
        score += 10
    if "nebula" in target_type_lower or "remnant" in target_type_lower:
        score -= 5
    return round(max(0, min(100, score)))


def _gradient_label(score: int) -> str:
    if score >= 75:
        return "Severe"
    if score >= 52:
        return "High"
    if score >= 30:
        return "Moderate"
    return "Low"


def _drizzle_recommendation(
    pixel_scale_arcsec: float,
    planned_frames: int,
    integration_minutes: int,
) -> str:
    if planned_frames < 18:
        return "Off / too few dithered frames"
    if pixel_scale_arcsec > 2.2 and planned_frames >= 35:
        return "2x drizzle for undersampled stars"
    if pixel_scale_arcsec > 1.6 and integration_minutes >= 240:
        return "1.5x drizzle if dithered"
    return "Off / native scale"


def _binning_recommendation(pixel_scale_arcsec: float, gradient_score: int, planned_frames: int) -> str:
    if gradient_score >= 75 and planned_frames < 24:
        return "2x2 preview bin for gradient removal"
    if pixel_scale_arcsec < 0.75:
        return "2x2 bin after calibration"
    return "1x1 master stack"


def _stack_strategy(target_type: str, filters: list[str], planned_frames: int) -> str:
    if any(_is_narrowband_filter(item) for item in filters):
        return "Separate masters per filter, then linear fit before combine"
    if "galaxy" in target_type.lower():
        return "Luminance-first stack with protected RGB stars"
    if planned_frames < 18:
        return "Conservative stack, inspect every rejected frame"
    return "Register all lights, weight by FWHM/eccentricity/SNR"


def _calibration_strategy(filters: list[str], total_integration_minutes: int) -> str:
    filter_count = max(1, len(filters))
    if total_integration_minutes >= 240:
        return f"Strict match: flats and dark-flats per {filter_count} filters, darks by exposure/gain/temp"
    return f"Basic match: flats per {filter_count} filters, reuse dark library only if temp/gain match"


def _normalization_strategy(filters: list[str], gradient_score: int) -> str:
    if gradient_score >= 52:
        return "Local normalization before integration"
    if len(filters) > 1:
        return "Per-filter normalization, linear fit after masters"
    return "Global additive/multiplicative normalization"


def _noise_reduction_strategy(integration_class: str, gradient_score: int, target_type: str) -> str:
    if integration_class == "Scout stack":
        return "Light linear denoise, preserve star profiles"
    if gradient_score >= 75:
        return "Gradient first, denoise after background neutralization"
    if "galaxy" in target_type.lower():
        return "Mask core and arms, denoise background separately"
    return "Multiscale linear denoise before stretch"


def _color_strategy(target_type: str, filters: list[str]) -> str:
    if {"Ha", "OIII", "SII"}.issubset(set(filters)):
        return "SHO/HOO preview, RGB stars if available"
    if any(_is_narrowband_filter(item) for item in filters):
        return "HOO or narrowband luminance with synthetic green"
    if "galaxy" in target_type.lower():
        return "Photometric color, protect star saturation"
    return "Photometric color calibration"


def _rejection_strategy(planned_frames: int) -> str:
    if planned_frames >= 40:
        return "Winsorized sigma clipping with FWHM/SNR weighting"
    if planned_frames >= 18:
        return "Sigma clipping, moderate high rejection"
    return "Percentile clipping, manual review required"


def _processing_calibration_matches(filters: list[str]) -> list[ProcessingCalibrationMatch]:
    filter_label = ", ".join(filters)
    return [
        ProcessingCalibrationMatch(
            frame_type="Flats",
            recommendation=f"Match each optical path and filter: {filter_label}",
            priority="Required",
        ),
        ProcessingCalibrationMatch(
            frame_type="Dark flats",
            recommendation="Match flat exposure, gain, offset, and temperature",
            priority="Required",
        ),
        ProcessingCalibrationMatch(
            frame_type="Darks",
            recommendation="Match light exposure, gain, offset, and sensor temperature",
            priority="Required",
        ),
        ProcessingCalibrationMatch(
            frame_type="Bias",
            recommendation="Use only if your camera calibration workflow expects bias frames",
            priority="Optional",
        ),
    ]


def _processing_workflow(
    target_type: str,
    filters: list[str],
    gradient_score: int,
    drizzle: str,
    binning: str,
) -> list[ProcessingWorkflowStep]:
    workflow = [
        ProcessingWorkflowStep(
            label="Calibrate",
            action="Apply matching darks, flats, and dark-flats",
            reason="Keeps dust motes and amp pattern out of the master",
        ),
        ProcessingWorkflowStep(
            label="Cull",
            action="Reject frames by FWHM, eccentricity, clouds, and background",
            reason="Bad subframes cost more than they contribute",
        ),
        ProcessingWorkflowStep(
            label="Register",
            action=f"Align at {binning}, then integrate per filter",
            reason="Stable star shapes before channel combination",
        ),
    ]
    if "Off" not in drizzle:
        workflow.append(
            ProcessingWorkflowStep(
                label="Drizzle",
                action=drizzle,
                reason="Recover sampling only when dithering and frame count support it",
            )
        )
    if gradient_score >= 52:
        workflow.append(
            ProcessingWorkflowStep(
                label="Gradient",
                action="Run dynamic/background extraction on linear masters",
                reason="Light pollution and Moon gradients are easier before stretch",
            )
        )
    if any(_is_narrowband_filter(item) for item in filters):
        workflow.append(
            ProcessingWorkflowStep(
                label="Combine",
                action="Linear fit narrowband masters before palette mapping",
                reason="Balances Ha/OIII/SII signal before color work",
            )
        )
    elif "galaxy" in target_type.lower():
        workflow.append(
            ProcessingWorkflowStep(
                label="Combine",
                action="Build luminance detail, then add RGB color gently",
                reason="Galaxy cores and stars need restrained saturation",
            )
        )
    return workflow


def _processing_warnings(
    gradient_score: int,
    planned_frames: int,
    white_night: bool,
    filters: list[str],
) -> list[str]:
    warnings: list[str] = []
    if gradient_score >= 75:
        warnings.append("Severe gradient risk: capture sky flats and keep background extraction conservative")
    elif gradient_score >= 52:
        warnings.append("High gradient risk: use local normalization and inspect channel backgrounds")
    if planned_frames < 18:
        warnings.append("Low frame count: rejection and drizzle will be fragile")
    if white_night and not any(_is_narrowband_filter(item) for item in filters):
        warnings.append("White night broadband: expect weak color and stronger gradients")
    return warnings


def _is_narrowband_filter(filter_name: str) -> bool:
    return filter_name.upper() in {"HA", "OIII", "SII", "H-BETA", "HBETA"}


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
