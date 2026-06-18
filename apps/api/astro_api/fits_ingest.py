from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from statistics import median
from typing import Any

import numpy as np
from astropy.io import fits

from .schemas import (
    CalibrationLibraryItem,
    CalibrationLibraryRequest,
    CalibrationLibraryResponse,
    FitsFrameMetadata,
    FitsGroupSummary,
    FitsScanRequest,
    FitsScanResponse,
)
from .settings import get_settings

FITS_EXTENSIONS = {".fit", ".fits", ".fts"}
CALIBRATION_FRAME_TYPES = {"Flat", "Dark", "Bias", "Dark flat"}


@dataclass
class ImageQuality:
    quality_score: int | None
    star_count: int | None
    fwhm_px: float | None
    eccentricity: float | None
    background_adu: float | None
    background_noise_adu: float | None
    quality_flags: list[str]


class FitsIngestError(ValueError):
    pass


def scan_fits_metadata(
    payload: FitsScanRequest,
    library_root: str | Path | None = None,
) -> FitsScanResponse:
    root = _library_root(library_root or get_settings().fits_library_root)
    scan_path = _resolve_scan_path(root, payload.path)
    files = _collect_fits_files(scan_path, payload.recursive, payload.max_files)

    frames: list[FitsFrameMetadata] = []
    rejected_files = 0
    warnings: list[str] = []

    for file_path in files:
        try:
            frames.append(_read_fits_frame(file_path, root))
        except OSError:
            rejected_files += 1
        except Exception as exc:
            rejected_files += 1
            warnings.append(f"{_relative_label(file_path, root)}: {exc}")

    groups = _summarize_groups(frames)
    light_frames = [frame for frame in frames if frame.frame_type == "Light"]
    all_exposures = [
        frame.exposure_seconds for frame in frames if frame.exposure_seconds is not None
    ]
    all_temperatures = [
        frame.sensor_temperature_c
        for frame in frames
        if frame.sensor_temperature_c is not None
    ]
    warnings.extend(_scan_warnings(frames, groups))

    return FitsScanResponse(
        scan_path=_relative_scan_path(scan_path, root),
        total_files=len(files),
        parsed_files=len(frames),
        rejected_files=rejected_files,
        total_light_seconds=round(
            sum(frame.exposure_seconds or 0 for frame in light_frames),
            2,
        ),
        filters=sorted(
            {
                frame.filter_name
                for frame in frames
                if frame.filter_name and frame.filter_name.lower() not in {"none", "unknown"}
            }
        ),
        frame_types=sorted({frame.frame_type for frame in frames}),
        objects=sorted({frame.object_name for frame in frames if frame.object_name}),
        cameras=sorted({frame.camera for frame in frames if frame.camera}),
        exposure_range_seconds=_range_label(all_exposures, suffix="s"),
        temperature_range_c=_range_label(all_temperatures, suffix="C"),
        groups=groups,
        frames=frames,
        warnings=warnings[:12],
    )


def build_calibration_library(
    payload: CalibrationLibraryRequest,
    library_root: str | Path | None = None,
) -> CalibrationLibraryResponse:
    scan = scan_fits_metadata(
        FitsScanRequest(
            path=payload.path,
            recursive=payload.recursive,
            max_files=payload.max_files,
        ),
        library_root=library_root,
    )
    calibration_frames = [
        frame for frame in scan.frames if frame.frame_type in CALIBRATION_FRAME_TYPES
    ]
    items = _summarize_calibration_items(calibration_frames, payload)
    warnings = [
        warning
        for warning in scan.warnings
        if not warning.startswith("No light frames") and "flagged for quality" not in warning
    ]
    warnings.extend(_calibration_library_warnings(items, payload))
    summary = _calibration_summary(calibration_frames, items)

    return CalibrationLibraryResponse(
        scan_path=scan.scan_path,
        total_files=scan.total_files,
        parsed_files=scan.parsed_files,
        calibration_frames=len(calibration_frames),
        summary=summary,
        items=items,
        warnings=warnings[:12],
    )


def _library_root(value: str | Path) -> Path:
    root = Path(value).expanduser()
    if root.is_absolute():
        return root.resolve()
    repository_root = Path(__file__).resolve().parents[3]
    return (repository_root / root).resolve()


def _resolve_scan_path(root: Path, requested_path: str) -> Path:
    if not root.exists():
        raise FitsIngestError(f"FITS library root does not exist: {root}")

    scan_path = (root / requested_path).resolve()
    try:
        scan_path.relative_to(root)
    except ValueError as exc:
        raise FitsIngestError("Scan path must stay inside FITS library root") from exc

    if not scan_path.exists():
        raise FitsIngestError(f"FITS scan path does not exist: {requested_path}")

    return scan_path


def _collect_fits_files(scan_path: Path, recursive: bool, max_files: int) -> list[Path]:
    if scan_path.is_file():
        return [scan_path] if scan_path.suffix.lower() in FITS_EXTENSIONS else []

    pattern = "**/*" if recursive else "*"
    files = [
        file_path
        for file_path in scan_path.glob(pattern)
        if file_path.is_file() and file_path.suffix.lower() in FITS_EXTENSIONS
    ]
    return sorted(files)[:max_files]


def _read_fits_frame(file_path: Path, root: Path) -> FitsFrameMetadata:
    with fits.open(file_path, memmap=False, lazy_load_hdus=True) as hdul:
        header = hdul[0].header
        warnings = _frame_warnings(header)
        frame_type = _normalize_frame_type(_header_text(header, "IMAGETYP", "FRAME", "OBSTYPE"))
        quality = _analyze_image_quality(hdul[0].data, frame_type)
        exposure_seconds = _header_float(header, "EXPTIME", "EXPOSURE")
        filter_name = _header_text(header, "FILTER", "INSFLNAM", "FILTERID")
        sensor_temperature_c = _header_float(
            header,
            "CCD-TEMP",
            "CCDTEMP",
            "SET-TEMP",
            "SENSOR-T",
            "TEMPERAT",
        )

        return FitsFrameMetadata(
            file_name=file_path.name,
            relative_path=_relative_label(file_path, root),
            frame_type=frame_type,
            filter_name=filter_name,
            exposure_seconds=exposure_seconds,
            gain=_header_float(header, "GAIN", "EGAIN"),
            offset=_header_float(header, "OFFSET", "BLKLEVEL"),
            sensor_temperature_c=sensor_temperature_c,
            binning=_binning_label(header),
            object_name=_header_text(header, "OBJECT", "OBJNAME"),
            date_obs=_header_text(header, "DATE-OBS", "DATE"),
            camera=_header_text(header, "INSTRUME", "CAMERA"),
            telescope=_header_text(header, "TELESCOP", "SCOPE"),
            width_px=_header_int(header, "NAXIS1"),
            height_px=_header_int(header, "NAXIS2"),
            size_mb=round(file_path.stat().st_size / 1_048_576, 3),
            quality_score=quality.quality_score,
            star_count=quality.star_count,
            fwhm_px=quality.fwhm_px,
            eccentricity=quality.eccentricity,
            background_adu=quality.background_adu,
            background_noise_adu=quality.background_noise_adu,
            quality_flags=quality.quality_flags,
            status="ready" if not warnings and not quality.quality_flags else "needs-review",
            warnings=warnings,
        )


def _frame_warnings(header: Any) -> list[str]:
    warnings: list[str] = []
    if _header_float(header, "EXPTIME", "EXPOSURE") is None:
        warnings.append("Missing exposure")
    if not _header_text(header, "IMAGETYP", "FRAME", "OBSTYPE"):
        warnings.append("Missing frame type")
    if not _header_text(header, "DATE-OBS", "DATE"):
        warnings.append("Missing DATE-OBS")
    return warnings


def _analyze_image_quality(data: Any, frame_type: str) -> ImageQuality:
    if data is None:
        return _empty_quality()

    try:
        raw_image = np.asarray(data)
        image = np.asarray(data, dtype=np.float32)
    except (TypeError, ValueError):
        return _empty_quality()

    image = np.squeeze(image)
    if image.ndim != 2 or image.size < 100:
        return _empty_quality()

    sampled_image, stride = _sample_image(image)
    finite_pixels = sampled_image[np.isfinite(sampled_image)]
    if finite_pixels.size < 100:
        return _empty_quality()

    background = float(np.median(finite_pixels))
    mad = float(np.median(np.abs(finite_pixels - background)))
    noise = 1.4826 * mad if mad > 0 else float(np.std(finite_pixels))
    noise = max(noise, 0.0001)

    if frame_type != "Light":
        return ImageQuality(
            quality_score=None,
            star_count=None,
            fwhm_px=None,
            eccentricity=None,
            background_adu=round(background, 2),
            background_noise_adu=round(noise, 2),
            quality_flags=[],
        )

    star_count, fwhm_values, eccentricity_values = _measure_stars(
        sampled_image,
        background,
        noise,
        stride,
    )
    fwhm_px = float(median(fwhm_values)) if fwhm_values else None
    eccentricity = float(median(eccentricity_values)) if eccentricity_values else None
    clipped_fraction = _clipped_fraction(raw_image)
    score, flags = _score_light_quality(
        star_count=star_count,
        fwhm_px=fwhm_px,
        eccentricity=eccentricity,
        background_adu=background,
        background_noise_adu=noise,
        clipped_fraction=clipped_fraction,
    )

    return ImageQuality(
        quality_score=score,
        star_count=star_count,
        fwhm_px=round(fwhm_px, 2) if fwhm_px is not None else None,
        eccentricity=round(eccentricity, 3) if eccentricity is not None else None,
        background_adu=round(background, 2),
        background_noise_adu=round(noise, 2),
        quality_flags=flags,
    )


def _empty_quality() -> ImageQuality:
    return ImageQuality(
        quality_score=None,
        star_count=None,
        fwhm_px=None,
        eccentricity=None,
        background_adu=None,
        background_noise_adu=None,
        quality_flags=[],
    )


def _sample_image(image: np.ndarray) -> tuple[np.ndarray, int]:
    max_pixels = 900_000
    stride = max(1, int(np.ceil(np.sqrt(image.size / max_pixels))))
    return image[::stride, ::stride], stride


def _measure_stars(
    image: np.ndarray,
    background: float,
    noise: float,
    stride: int,
) -> tuple[int, list[float], list[float]]:
    working = np.nan_to_num(image, nan=background, posinf=background, neginf=background)
    if working.shape[0] < 5 or working.shape[1] < 5:
        return 0, [], []

    threshold = background + max(noise * 5.0, 1.0)
    center = working[1:-1, 1:-1]
    peaks = center > threshold
    for y_offset in (-1, 0, 1):
        for x_offset in (-1, 0, 1):
            if y_offset == 0 and x_offset == 0:
                continue
            peaks &= center >= working[1 + y_offset : working.shape[0] - 1 + y_offset, 1 + x_offset : working.shape[1] - 1 + x_offset]

    peak_y, peak_x = np.nonzero(peaks)
    if peak_y.size == 0:
        return 0, [], []

    peak_y = peak_y + 1
    peak_x = peak_x + 1
    peak_values = working[peak_y, peak_x]
    star_count = int(peak_y.size)
    if peak_y.size > 160:
        brightest = np.argpartition(peak_values, -160)[-160:]
        peak_y = peak_y[brightest]
        peak_x = peak_x[brightest]

    fwhm_values: list[float] = []
    eccentricity_values: list[float] = []
    for y, x in zip(peak_y, peak_x, strict=False):
        measurement = _measure_star_shape(working, int(y), int(x), background, noise, stride)
        if measurement is None:
            continue
        fwhm_px, eccentricity = measurement
        fwhm_values.append(fwhm_px)
        eccentricity_values.append(eccentricity)

    return star_count, fwhm_values, eccentricity_values


def _measure_star_shape(
    image: np.ndarray,
    y: int,
    x: int,
    background: float,
    noise: float,
    stride: int,
) -> tuple[float, float] | None:
    radius = 6
    if y < radius or x < radius or y >= image.shape[0] - radius or x >= image.shape[1] - radius:
        return None

    patch = image[y - radius : y + radius + 1, x - radius : x + radius + 1] - background
    patch = np.where(np.isfinite(patch) & (patch > noise * 2), patch, 0.0)
    total = float(np.sum(patch))
    if total <= 0:
        return None

    yy, xx = np.indices(patch.shape, dtype=np.float32)
    centroid_x = float(np.sum(xx * patch) / total)
    centroid_y = float(np.sum(yy * patch) / total)
    dx = xx - centroid_x
    dy = yy - centroid_y
    cov_xx = float(np.sum(dx * dx * patch) / total)
    cov_yy = float(np.sum(dy * dy * patch) / total)
    cov_xy = float(np.sum(dx * dy * patch) / total)
    trace = cov_xx + cov_yy
    determinant = cov_xx * cov_yy - cov_xy * cov_xy
    discriminant = max(0.0, (trace * trace / 4) - determinant)
    major_variance = max(0.0, trace / 2 + discriminant**0.5)
    minor_variance = max(0.0, trace / 2 - discriminant**0.5)
    if major_variance <= 0 or minor_variance <= 0:
        return None

    sigma_major = major_variance**0.5
    sigma_minor = minor_variance**0.5
    fwhm_px = 2.355 * ((sigma_major**2 + sigma_minor**2) / 2) ** 0.5 * stride
    eccentricity = 1 - min(1.0, sigma_minor / sigma_major)
    return fwhm_px, eccentricity


def _clipped_fraction(raw_image: np.ndarray) -> float:
    if not np.issubdtype(raw_image.dtype, np.integer):
        return 0.0

    finite = raw_image[np.isfinite(raw_image)]
    if finite.size == 0:
        return 0.0

    dtype_max = np.iinfo(raw_image.dtype).max
    return float(np.count_nonzero(finite >= dtype_max) / finite.size)


def _score_light_quality(
    *,
    star_count: int,
    fwhm_px: float | None,
    eccentricity: float | None,
    background_adu: float,
    background_noise_adu: float,
    clipped_fraction: float,
) -> tuple[int, list[str]]:
    score = 100.0
    flags: list[str] = []

    if star_count == 0:
        flags.append("No stars detected")
        score -= 55
    elif star_count < 8:
        flags.append("Sparse stars")
        score -= 12 + (8 - star_count) * 4
    elif star_count < 15:
        score -= (15 - star_count) * 1.5

    if fwhm_px is None:
        if star_count > 0:
            flags.append("Could not measure FWHM")
            score -= 10
    else:
        if fwhm_px > 8:
            flags.append("Bloated stars")
        score -= min(30, max(0.0, (fwhm_px - 3.2) * 5.5))

    if eccentricity is not None:
        if eccentricity > 0.55:
            flags.append("Elongated stars")
        elif eccentricity > 0.42:
            flags.append("Mild star elongation")
        score -= min(30, max(0.0, (eccentricity - 0.35) * 85))

    noise_ratio = background_noise_adu / max(abs(background_adu), 1.0)
    if noise_ratio > 0.18:
        flags.append("Noisy background")
        score -= min(20, (noise_ratio - 0.18) * 80)

    if background_adu > 20_000:
        flags.append("Bright background")
        score -= min(18, (background_adu - 20_000) / 3000)

    if clipped_fraction > 0.001:
        flags.append("Clipped highlights")
        score -= min(25, clipped_fraction * 10_000)
    elif clipped_fraction > 0.0001:
        flags.append("Slight clipping")
        score -= 5

    return int(max(0, min(100, round(score)))), flags


def _summarize_calibration_items(
    frames: list[FitsFrameMetadata],
    payload: CalibrationLibraryRequest,
) -> list[CalibrationLibraryItem]:
    grouped: dict[tuple[str, str | None, float | None, str | None, str | None], list[FitsFrameMetadata]] = defaultdict(list)
    for frame in frames:
        exposure = round(frame.exposure_seconds, 3) if frame.exposure_seconds is not None else None
        grouped[
            (
                frame.frame_type,
                _normalized_optional(frame.filter_name),
                exposure,
                _normalized_optional(frame.binning),
                _normalized_optional(frame.camera),
            )
        ].append(frame)

    items: list[CalibrationLibraryItem] = []
    for (frame_type, filter_name, exposure_seconds, binning, camera), group_frames in grouped.items():
        temperatures = [
            frame.sensor_temperature_c
            for frame in group_frames
            if frame.sensor_temperature_c is not None
        ]
        score, status, reason = _score_calibration_match(
            frame_type=frame_type,
            filter_name=filter_name,
            exposure_seconds=exposure_seconds,
            binning=binning,
            camera=camera,
            frames=len(group_frames),
            median_temperature_c=round(float(median(temperatures)), 2) if temperatures else None,
            payload=payload,
        )
        items.append(
            CalibrationLibraryItem(
                frame_type=frame_type,
                filter_name=filter_name,
                exposure_seconds=exposure_seconds,
                binning=binning,
                camera=camera,
                frames=len(group_frames),
                temperature_range_c=_range_label(temperatures, suffix="C"),
                median_temperature_c=round(float(median(temperatures)), 2) if temperatures else None,
                match_score=score,
                match_status=status,
                reason=reason,
                sample_files=[frame.relative_path for frame in group_frames[:5]],
            )
        )

    return sorted(
        items,
        key=lambda item: (
            -item.match_score,
            _frame_type_order(item.frame_type),
            item.filter_name or "",
            item.exposure_seconds or 0,
        ),
    )


def _score_calibration_match(
    *,
    frame_type: str,
    filter_name: str | None,
    exposure_seconds: float | None,
    binning: str | None,
    camera: str | None,
    frames: int,
    median_temperature_c: float | None,
    payload: CalibrationLibraryRequest,
) -> tuple[int, str, str]:
    score = min(28, frames * 2)
    reasons: list[str] = [f"{frames} frames"]
    target_filters = [_normalize_text(value) for value in payload.target_filters]
    target_exposures = [value for value in payload.target_exposure_seconds if value > 0]
    target_binning = _normalized_optional(payload.target_binning)
    target_camera = _normalized_optional(payload.target_camera)

    if frame_type == "Flat":
        score += _filter_match_score(filter_name, target_filters, reasons)
    elif frame_type in {"Dark", "Dark flat"}:
        score += _exposure_match_score(exposure_seconds, target_exposures, reasons)
        score += _temperature_match_score(median_temperature_c, payload.target_temperature_c, reasons)
    elif frame_type == "Bias":
        score += 32
        reasons.append("reusable bias")

    if target_binning:
        if _normalize_text(binning or "") == _normalize_text(target_binning):
            score += 12
            reasons.append(f"binning {binning}")
        elif binning:
            score -= 18
            reasons.append(f"binning mismatch {binning}")
        else:
            score -= 4
            reasons.append("binning unknown")

    if target_camera:
        if _normalize_text(camera or "") == _normalize_text(target_camera):
            score += 8
            reasons.append("camera match")
        elif camera:
            score -= 12
            reasons.append(f"camera mismatch {camera}")
        else:
            score -= 3
            reasons.append("camera unknown")

    score = int(max(0, min(100, round(score))))
    if score >= 78:
        status = "match"
    elif score >= 52:
        status = "usable"
    else:
        status = "review"

    return score, status, ", ".join(reasons[:4])


def _filter_match_score(
    filter_name: str | None,
    target_filters: list[str],
    reasons: list[str],
) -> int:
    if not target_filters:
        reasons.append("no filter target")
        return 32

    normalized_filter = _normalize_text(filter_name or "")
    if normalized_filter in target_filters:
        reasons.append(f"filter {filter_name}")
        return 42
    if not normalized_filter:
        reasons.append("filter unknown")
        return 4
    reasons.append(f"filter mismatch {filter_name}")
    return -34


def _exposure_match_score(
    exposure_seconds: float | None,
    target_exposures: list[float],
    reasons: list[str],
) -> int:
    if not target_exposures:
        reasons.append("no exposure target")
        return 30
    if exposure_seconds is None:
        reasons.append("exposure unknown")
        return -18

    closest = min(target_exposures, key=lambda target: abs(target - exposure_seconds))
    delta = abs(closest - exposure_seconds)
    tolerance = max(2.0, closest * 0.05)
    if delta <= 0.5:
        reasons.append(f"{_number_label(exposure_seconds)}s exact")
        return 42
    if delta <= tolerance:
        reasons.append(f"{_number_label(exposure_seconds)}s close to {_number_label(closest)}s")
        return 30
    reasons.append(f"{_number_label(exposure_seconds)}s vs {_number_label(closest)}s")
    return -28


def _temperature_match_score(
    temperature_c: float | None,
    target_temperature_c: float | None,
    reasons: list[str],
) -> int:
    if target_temperature_c is None:
        reasons.append("no temp target")
        return 10
    if temperature_c is None:
        reasons.append("temperature unknown")
        return -8

    delta = abs(temperature_c - target_temperature_c)
    if delta <= 1.5:
        reasons.append(f"{_number_label(temperature_c)}C exact")
        return 24
    if delta <= 4:
        reasons.append(f"{_number_label(temperature_c)}C close")
        return 14
    reasons.append(f"{_number_label(temperature_c)}C temp gap")
    return -18


def _calibration_library_warnings(
    items: list[CalibrationLibraryItem],
    payload: CalibrationLibraryRequest,
) -> list[str]:
    warnings: list[str] = []
    target_filters = [_normalize_text(value) for value in payload.target_filters]
    for target_filter in target_filters:
        matching_flats = [
            item
            for item in items
            if item.frame_type == "Flat"
            and _normalize_text(item.filter_name or "") == target_filter
            and item.match_status in {"match", "usable"}
        ]
        if not matching_flats:
            warnings.append(f"Missing reusable flats for {target_filter}")

    target_exposures = [value for value in payload.target_exposure_seconds if value > 0]
    for target_exposure in target_exposures:
        matching_darks = [
            item
            for item in items
            if item.frame_type == "Dark"
            and item.exposure_seconds is not None
            and abs(item.exposure_seconds - target_exposure) <= max(2.0, target_exposure * 0.05)
            and item.match_status in {"match", "usable"}
        ]
        if not matching_darks:
            warnings.append(f"Missing reusable darks for {_number_label(target_exposure)}s")

    if not any(item.frame_type == "Bias" and item.match_status in {"match", "usable"} for item in items):
        warnings.append("No reusable bias frames found")

    return warnings


def _calibration_summary(
    frames: list[FitsFrameMetadata],
    items: list[CalibrationLibraryItem],
) -> str:
    if not frames:
        return "No calibration frames found"

    matches = sum(1 for item in items if item.match_status == "match")
    usable = sum(1 for item in items if item.match_status == "usable")
    return f"{len(frames)} calibration frames, {matches} strong matches, {usable} usable groups"


def _normalized_optional(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    return text or None


def _normalize_text(value: str) -> str:
    return "".join(character for character in value.lower() if character.isalnum())


def _summarize_groups(frames: list[FitsFrameMetadata]) -> list[FitsGroupSummary]:
    grouped: dict[tuple[str, str | None], list[FitsFrameMetadata]] = defaultdict(list)
    for frame in frames:
        grouped[(frame.frame_type, frame.filter_name)].append(frame)

    summaries: list[FitsGroupSummary] = []
    for (frame_type, filter_name), items in grouped.items():
        exposures = sorted(
            {
                round(item.exposure_seconds, 3)
                for item in items
                if item.exposure_seconds is not None
            }
        )
        temperatures = [
            item.sensor_temperature_c
            for item in items
            if item.sensor_temperature_c is not None
        ]
        label = frame_type if not filter_name else f"{frame_type} / {filter_name}"
        summaries.append(
            FitsGroupSummary(
                label=label,
                frame_type=frame_type,
                filter_name=filter_name,
                frames=len(items),
                total_exposure_seconds=round(
                    sum(item.exposure_seconds or 0 for item in items),
                    2,
                ),
                exposure_seconds=exposures,
                temperature_range_c=_range_label(temperatures, suffix="C"),
            )
        )

    return sorted(
        summaries,
        key=lambda item: (_frame_type_order(item.frame_type), item.filter_name or ""),
    )


def _scan_warnings(
    frames: list[FitsFrameMetadata],
    groups: list[FitsGroupSummary],
) -> list[str]:
    warnings: list[str] = []
    frame_types = {frame.frame_type for frame in frames}
    light_filters = {
        frame.filter_name
        for frame in frames
        if frame.frame_type == "Light" and frame.filter_name
    }

    if not frames:
        warnings.append("No FITS files parsed")
        return warnings
    if "Light" not in frame_types:
        warnings.append("No light frames found")
    if "Flat" not in frame_types:
        warnings.append("No flats found")
    if "Dark" not in frame_types:
        warnings.append("No darks found")
    if len(light_filters) > 1 and "Flat" in frame_types:
        flat_filters = {
            frame.filter_name
            for frame in frames
            if frame.frame_type == "Flat" and frame.filter_name
        }
        missing_flats = sorted(filter_name for filter_name in light_filters - flat_filters if filter_name)
        if missing_flats:
            warnings.append(f"Missing flats for filters: {', '.join(missing_flats)}")

    for group in groups:
        if group.frame_type in {"Light", "Dark"} and len(group.exposure_seconds) > 1:
            warnings.append(f"Mixed exposures in {group.label}")

    quality_review_frames = [
        frame
        for frame in frames
        if frame.frame_type == "Light" and frame.quality_score is not None and frame.quality_score < 60
    ]
    if quality_review_frames:
        warnings.append(f"{len(quality_review_frames)} light frames flagged for quality")

    return warnings


def _header_text(header: Any, *keys: str) -> str | None:
    for key in keys:
        value = header.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def _header_float(header: Any, *keys: str) -> float | None:
    for key in keys:
        value = header.get(key)
        if value is None or value == "":
            continue
        try:
            return round(float(value), 4)
        except (TypeError, ValueError):
            continue
    return None


def _header_int(header: Any, key: str) -> int | None:
    value = header.get(key)
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_frame_type(value: str | None) -> str:
    if not value:
        return "Unknown"

    normalized = value.lower().replace("-", " ").replace("_", " ")
    if "dark flat" in normalized or "flat dark" in normalized:
        return "Dark flat"
    if "flat" in normalized:
        return "Flat"
    if "bias" in normalized or "offset" in normalized:
        return "Bias"
    if "dark" in normalized:
        return "Dark"
    if "light" in normalized or "object" in normalized:
        return "Light"
    return value.strip().title()


def _binning_label(header: Any) -> str | None:
    binning = _header_text(header, "BINNING")
    if binning:
        return binning

    x_binning = _header_int(header, "XBINNING")
    y_binning = _header_int(header, "YBINNING")
    if x_binning and y_binning:
        return f"{x_binning}x{y_binning}"
    return None


def _relative_label(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.name


def _relative_scan_path(scan_path: Path, root: Path) -> str:
    if scan_path == root:
        return "."
    return _relative_label(scan_path, root)


def _range_label(values: list[float], suffix: str) -> str | None:
    if not values:
        return None

    low = min(values)
    high = max(values)
    if round(low, 3) == round(high, 3):
        return f"{_number_label(low)}{suffix}"
    return f"{_number_label(low)} to {_number_label(high)}{suffix}"


def _number_label(value: float) -> str:
    rounded = round(value, 2)
    if rounded.is_integer():
        return str(int(rounded))
    return str(rounded)


def _frame_type_order(frame_type: str) -> int:
    order = {"Light": 0, "Flat": 1, "Dark flat": 2, "Dark": 3, "Bias": 4}
    return order.get(frame_type, 9)


def median_temperature(frames: list[FitsFrameMetadata]) -> float | None:
    temperatures = [
        frame.sensor_temperature_c
        for frame in frames
        if frame.sensor_temperature_c is not None
    ]
    if not temperatures:
        return None
    return round(float(median(temperatures)), 2)
