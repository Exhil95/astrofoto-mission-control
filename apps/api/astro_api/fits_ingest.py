from collections import defaultdict
from pathlib import Path
from statistics import median
from typing import Any

from astropy.io import fits

from .schemas import (
    FitsFrameMetadata,
    FitsGroupSummary,
    FitsScanRequest,
    FitsScanResponse,
)
from .settings import get_settings

FITS_EXTENSIONS = {".fit", ".fits", ".fts"}


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
            status="ready" if not warnings else "needs-review",
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
