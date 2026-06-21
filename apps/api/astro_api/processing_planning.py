from .catalog import get_target
from .schemas import (
    ProcessingCalibrationMatch,
    ProcessingPlanRequest,
    ProcessingPlanResponse,
    ProcessingWorkflowStep,
)

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
