from pathlib import Path

import numpy as np
import pytest
from astropy.io import fits

from astro_api.fits_ingest import FitsIngestError, build_calibration_library, scan_fits_metadata
from astro_api.schemas import CalibrationLibraryRequest, FitsScanRequest


def test_scan_fits_metadata_groups_lights_and_calibration(tmp_path: Path) -> None:
    _write_fits(
        tmp_path / "lights" / "ha_001.fit",
        {
            "IMAGETYP": "Light",
            "FILTER": "Ha",
            "EXPTIME": 300,
            "CCD-TEMP": -10.0,
            "GAIN": 100,
            "OFFSET": 30,
            "OBJECT": "North America",
            "DATE-OBS": "2026-06-15T22:10:00",
            "INSTRUME": "ASI2600MM",
            "XBINNING": 1,
            "YBINNING": 1,
        },
    )
    _write_fits(
        tmp_path / "lights" / "ha_002.fit",
        {
            "IMAGETYP": "Light",
            "FILTER": "Ha",
            "EXPTIME": 300,
            "CCD-TEMP": -10.2,
            "OBJECT": "North America",
            "DATE-OBS": "2026-06-15T22:15:00",
            "INSTRUME": "ASI2600MM",
        },
    )
    _write_fits(
        tmp_path / "cal" / "flat_ha.fit",
        {
            "IMAGETYP": "Flat",
            "FILTER": "Ha",
            "EXPTIME": 2.5,
            "DATE-OBS": "2026-06-16T08:00:00",
            "INSTRUME": "ASI2600MM",
        },
    )
    _write_fits(
        tmp_path / "cal" / "dark_300.fit",
        {
            "IMAGETYP": "Dark",
            "EXPTIME": 300,
            "CCD-TEMP": -10.0,
            "DATE-OBS": "2026-06-16T08:30:00",
            "INSTRUME": "ASI2600MM",
        },
    )

    result = scan_fits_metadata(
        FitsScanRequest(path=".", recursive=True, max_files=20),
        library_root=tmp_path,
    )

    assert result.total_files == 4
    assert result.parsed_files == 4
    assert result.rejected_files == 0
    assert result.total_light_seconds == 600
    assert result.filters == ["Ha"]
    assert result.objects == ["North America"]
    assert result.cameras == ["ASI2600MM"]
    assert {group.label for group in result.groups} >= {"Light / Ha", "Flat / Ha", "Dark"}
    assert result.temperature_range_c == "-10.2 to -10C"
    assert all(frame.relative_path for frame in result.frames)


def test_scan_fits_metadata_rejects_path_traversal(tmp_path: Path) -> None:
    (tmp_path / "frames").mkdir()

    with pytest.raises(FitsIngestError):
        scan_fits_metadata(
            FitsScanRequest(path="../", recursive=True),
            library_root=tmp_path / "frames",
        )


def test_scan_fits_metadata_scores_light_quality(tmp_path: Path) -> None:
    base_headers = {
        "IMAGETYP": "Light",
        "FILTER": "Ha",
        "EXPTIME": 300,
        "OBJECT": "North America",
        "DATE-OBS": "2026-06-15T22:10:00",
        "INSTRUME": "ASI2600MM",
    }
    _write_fits(
        tmp_path / "good.fit",
        base_headers,
        data=_synthetic_star_field(
            seed=1,
            star_count=16,
            background=720,
            noise=4,
            sigma_x=0.9,
            sigma_y=0.9,
        ),
    )
    _write_fits(
        tmp_path / "poor.fit",
        {**base_headers, "DATE-OBS": "2026-06-15T22:15:00"},
        data=_synthetic_star_field(
            seed=2,
            star_count=3,
            background=1450,
            noise=35,
            sigma_x=4.0,
            sigma_y=1.0,
        ),
    )

    result = scan_fits_metadata(
        FitsScanRequest(path=".", recursive=True, max_files=20),
        library_root=tmp_path,
    )

    frames = {frame.file_name: frame for frame in result.frames}
    good = frames["good.fit"]
    poor = frames["poor.fit"]

    assert good.quality_score is not None
    assert good.quality_score >= 75
    assert good.star_count is not None and good.star_count >= 12
    assert good.fwhm_px is not None and good.fwhm_px < 5
    assert good.eccentricity is not None and good.eccentricity < 0.4
    assert good.background_adu is not None and good.background_adu > 0
    assert good.status == "ready"

    assert poor.quality_score is not None
    assert poor.quality_score < good.quality_score
    assert "Sparse stars" in poor.quality_flags
    assert poor.status == "needs-review"
    assert any("flagged for quality" in warning for warning in result.warnings)


def test_build_calibration_library_matches_expected_session(tmp_path: Path) -> None:
    for filter_name in ("Ha", "OIII"):
        for index in range(12):
            _write_fits(
                tmp_path / "flats" / f"flat_{filter_name.lower()}_{index:02d}.fit",
                {
                    "IMAGETYP": "Flat",
                    "FILTER": filter_name,
                    "EXPTIME": 2.2 if filter_name == "Ha" else 2.4,
                    "DATE-OBS": "2026-06-16T08:00:00",
                    "INSTRUME": "ASI2600MM",
                    "XBINNING": 1,
                    "YBINNING": 1,
                },
            )
    for index in range(10):
        _write_fits(
            tmp_path / "darks" / f"dark_300_{index:02d}.fit",
            {
                "IMAGETYP": "Dark",
                "EXPTIME": 300,
                "CCD-TEMP": -10.0,
                "DATE-OBS": "2026-06-16T09:00:00",
                "INSTRUME": "ASI2600MM",
                "XBINNING": 1,
                "YBINNING": 1,
            },
        )
    _write_fits(
        tmp_path / "darks" / "dark_60.fit",
        {
            "IMAGETYP": "Dark",
            "EXPTIME": 60,
            "CCD-TEMP": -4.0,
            "DATE-OBS": "2026-06-16T09:30:00",
            "INSTRUME": "ASI2600MM",
        },
    )
    for index in range(20):
        _write_fits(
            tmp_path / "bias" / f"bias_{index:03d}.fit",
            {
                "IMAGETYP": "Bias",
                "EXPTIME": 0.001,
                "DATE-OBS": "2026-06-16T09:35:00",
                "INSTRUME": "ASI2600MM",
                "XBINNING": 1,
                "YBINNING": 1,
            },
        )

    result = build_calibration_library(
        CalibrationLibraryRequest(
            path=".",
            recursive=True,
            max_files=80,
            target_filters=["Ha", "OIII"],
            target_exposure_seconds=[300],
            target_temperature_c=-10,
            target_binning="1x1",
            target_camera="ASI2600MM",
        ),
        library_root=tmp_path,
    )

    assert result.calibration_frames == 55
    assert result.items[0].match_status == "match"
    assert any(
        item.frame_type == "Flat" and item.filter_name == "Ha" and item.match_status == "match"
        for item in result.items
    )
    assert any(
        item.frame_type == "Dark"
        and item.exposure_seconds == 300
        and item.frames == 10
        and item.match_status == "match"
        for item in result.items
    )
    assert any(item.frame_type == "Bias" and item.match_status == "match" for item in result.items)
    assert not any("Missing reusable flats" in warning for warning in result.warnings)
    assert not any("Missing reusable darks" in warning for warning in result.warnings)


def _write_fits(
    path: Path,
    header_values: dict[str, object],
    data: np.ndarray | None = None,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    hdu = fits.PrimaryHDU(data=data)
    for key, value in header_values.items():
        hdu.header[key] = value
    hdu.writeto(path)


def _synthetic_star_field(
    *,
    seed: int,
    star_count: int,
    background: float,
    noise: float,
    sigma_x: float,
    sigma_y: float,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    image = rng.normal(background, noise, size=(96, 96)).astype(np.float32)
    yy, xx = np.indices(image.shape, dtype=np.float32)
    for _ in range(star_count):
        x = rng.uniform(9, image.shape[1] - 9)
        y = rng.uniform(9, image.shape[0] - 9)
        amplitude = rng.uniform(1200, 1800)
        image += amplitude * np.exp(
            -(((xx - x) ** 2) / (2 * sigma_x**2) + ((yy - y) ** 2) / (2 * sigma_y**2))
        )
    return image
