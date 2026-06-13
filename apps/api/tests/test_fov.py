from astro_api.schemas import FovRequest
from astro_api.services import calculate_fov


def test_calculate_fov_returns_expected_scale() -> None:
    result = calculate_fov(
        FovRequest(
            focal_length_mm=480,
            reducer=1,
            sensor_width_mm=23.5,
            sensor_height_mm=15.7,
            pixel_size_um=3.76,
        )
    )

    assert round(result.horizontal_deg, 2) == 2.80
    assert round(result.vertical_deg, 2) == 1.87
    assert round(result.pixel_scale_arcsec, 2) == 1.62

