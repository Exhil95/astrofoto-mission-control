from datetime import date

from .catalog import get_target
from .planning_common import _score_fov_fit
from .schemas import (
    CaptureCalibrationStep,
    CaptureExposureStep,
    CapturePlanRequest,
    CapturePlanResponse,
    SessionPlanRequest,
    SessionPlanResponse,
)
from .session_planning import plan_session

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
