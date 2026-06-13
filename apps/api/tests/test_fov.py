from datetime import date

from astro_api.schemas import FovRequest, SessionPlanRequest
from astro_api.services import calculate_fov, plan_session


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


def test_plan_session_returns_visual_timeline() -> None:
    result = plan_session(
        SessionPlanRequest(
            target_id="m42",
            date=date(2026, 1, 18),
            latitude_deg=50.2649,
            longitude_deg=19.0238,
            bortle=4,
        )
    )

    assert result.target_name == "Orion Nebula"
    assert result.condition_score > 0
    assert result.max_altitude_deg == 34
    assert len(result.slots) == 4
