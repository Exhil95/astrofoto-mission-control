from pathlib import Path

import pytest
from astropy.io import fits

from astro_api.fits_ingest import FitsIngestError, scan_fits_metadata
from astro_api.schemas import FitsScanRequest


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


def _write_fits(path: Path, header_values: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    hdu = fits.PrimaryHDU()
    for key, value in header_values.items():
        hdu.header[key] = value
    hdu.writeto(path)
