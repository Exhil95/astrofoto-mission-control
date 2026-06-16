from datetime import date

from astro_api.schemas import (
    CapturePlanRequest,
    FovRequest,
    ProcessingPlanRequest,
    SessionPlanRequest,
    SkyForecastHour,
    SkyForecastResponse,
    TonightBoardRequest,
)
from astro_api.services import (
    build_capture_plan,
    build_processing_plan,
    calculate_fov,
    plan_session,
    rank_tonight_targets,
)


def _forecast(score: int = 86, status: str = "shoot") -> SkyForecastResponse:
    return SkyForecastResponse(
        source="test",
        status=status,
        score=score,
        summary="Test forecast",
        updated_at="2026-01-01T00:00:00Z",
        warnings=["No major weather flags"],
        hours=[
            SkyForecastHour(
                time="22:00",
                cloud_cover_percent=12,
                cloud_low_percent=2,
                cloud_mid_percent=4,
                cloud_high_percent=8,
                humidity_percent=64,
                temperature_c=2.0,
                dew_point_c=-4.0,
                wind_speed_kmh=8.0,
                wind_gust_kmh=14.0,
                visibility_km=24.0,
                precipitation_probability_percent=0,
                imaging_score=score,
                risk=status,
            )
        ],
    )


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


def test_plan_session_returns_visual_timeline(monkeypatch) -> None:
    monkeypatch.setattr("astro_api.services.get_sky_forecast", lambda payload: _forecast())

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
    assert result.astronomical_darkness_minutes > 0
    assert result.white_night is False
    assert result.astronomy_score > 0
    assert result.weather_score == 86
    assert result.weather_status == "shoot"
    assert result.recommended_mode
    assert len(result.slots) == 4


def test_plan_session_marks_polish_white_night(monkeypatch) -> None:
    monkeypatch.setattr("astro_api.services.get_sky_forecast", lambda payload: _forecast())

    result = plan_session(
        SessionPlanRequest(
            target_id="ngc7000",
            date=date(2026, 6, 13),
            latitude_deg=50.2649,
            longitude_deg=19.0238,
            timezone="Europe/Warsaw",
            bortle=4,
        )
    )

    assert result.white_night is True
    assert result.astronomical_darkness_minutes == 0
    assert result.night_kind_label == "Nautical only"
    assert "White night" in result.recommendation
    assert result.recommended_mode == "Narrowband"
    assert result.altitude_curve


def test_plan_session_weather_skip_overrides_good_astronomy(monkeypatch) -> None:
    monkeypatch.setattr("astro_api.services.get_sky_forecast", lambda payload: _forecast(18, "skip"))

    result = plan_session(
        SessionPlanRequest(
            target_id="m31",
            date=date(2026, 10, 12),
            latitude_deg=50.2649,
            longitude_deg=19.0238,
            timezone="Europe/Warsaw",
            bortle=3,
        )
    )

    assert result.weather_status == "skip"
    assert result.weather_score == 18
    assert result.recommended_mode == "Calibration"
    assert result.condition_score < 55
    assert result.recommendation == "Weather skip: calibration only"
    assert any(slot.label == "Weather" for slot in result.slots)


def test_tonight_board_ranks_targets_with_fov_and_weather(monkeypatch) -> None:
    monkeypatch.setattr("astro_api.services.get_sky_forecast", lambda payload: _forecast())

    result = rank_tonight_targets(
        TonightBoardRequest(
            date=date(2026, 10, 12),
            latitude_deg=50.2649,
            longitude_deg=19.0238,
            timezone="Europe/Warsaw",
            bortle=3,
            fov_horizontal_deg=2.8,
            fov_vertical_deg=1.87,
            limit=4,
        )
    )

    assert len(result.items) == 4
    assert result.weather_score == 86
    assert result.moon_illumination_percent >= 0
    assert result.items == sorted(result.items, key=lambda item: item.score, reverse=True)
    assert all(item.fov_fit for item in result.items)


def test_capture_plan_builds_runbook_and_markdown(monkeypatch) -> None:
    monkeypatch.setattr("astro_api.services.get_sky_forecast", lambda payload: _forecast())

    result = build_capture_plan(
        CapturePlanRequest(
            target_id="ngc7000",
            date=date(2026, 8, 12),
            latitude_deg=50.2649,
            longitude_deg=19.0238,
            timezone="Europe/Warsaw",
            bortle=4,
            fov_horizontal_deg=2.8,
            fov_vertical_deg=1.87,
            pixel_scale_arcsec=1.62,
        )
    )

    assert result.target_name == "North America"
    assert result.exposure_steps
    assert result.calibration_frames
    assert result.total_integration_minutes > 0
    assert "Capture Plan: North America" in result.export_markdown
    assert any(step.filter_name in {"Ha", "OIII"} for step in result.exposure_steps)


def test_processing_plan_flags_gradient_and_calibration_strategy() -> None:
    result = build_processing_plan(
        ProcessingPlanRequest(
            target_id="ngc7000",
            bortle=6,
            moon_illumination_percent=70,
            white_night=True,
            weather_score=58,
            fov_horizontal_deg=2.8,
            fov_vertical_deg=1.87,
            pixel_scale_arcsec=1.62,
            total_integration_minutes=180,
            filter_names=["Ha", "OIII", "SII"],
            planned_frames=12,
        )
    )

    assert result.target_name == "North America"
    assert result.gradient_score >= 70
    assert result.gradient_risk in {"High", "Severe"}
    assert result.drizzle.startswith("Off")
    assert "Separate masters" in result.stack_strategy
    assert {item.frame_type for item in result.calibration_matches} >= {"Flats", "Darks"}
    assert any("Low frame count" in warning for warning in result.warnings)
