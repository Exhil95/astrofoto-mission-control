from datetime import date

from astro_api.schemas import SessionArchiveCreate, SessionArchiveUpdate
from astro_api.session_archive import (
    create_session_archive,
    delete_session_archive,
    list_session_archives,
    update_session_archive,
)
from astro_api.settings import get_settings


def test_session_archive_crud(tmp_path) -> None:
    get_settings.cache_clear()
    settings = get_settings()
    settings.profile_database_url = f"sqlite:///{tmp_path / 'archive.sqlite3'}"

    try:
        assert list_session_archives() == []

        created = create_session_archive(
            SessionArchiveCreate(
                target_id="ngc7000",
                target_name="North America",
                session_date=date(2026, 8, 12),
                status="planned",
                profile_id=1,
                profile_name="Backyard APS-C",
                site_name="Katowice",
                bortle=5,
                fov_horizontal_deg=2.8,
                fov_vertical_deg=1.87,
                pixel_scale_arcsec=1.62,
                imaging_mode="Narrowband",
                filter_names=["Ha", "OIII", "SII"],
                total_integration_minutes=180,
                planned_frames=36,
                captured_frames=0,
                window_start="22:35",
                window_end="02:25",
                weather_status="risk",
                weather_score=72,
                moon_illumination_percent=18,
                white_night=True,
                notes="White night narrowband run",
                capture_markdown="# Capture Plan: North America",
            )
        )

        assert created.id > 0
        assert created.filter_names == ["Ha", "OIII", "SII"]
        assert created.white_night is True
        assert len(list_session_archives()) == 1

        updated = update_session_archive(
            created.id,
            SessionArchiveUpdate(
                **created.model_copy(
                    update={
                        "status": "captured",
                        "captured_frames": 30,
                        "notes": "Captured before clouds rolled in",
                    }
                ).model_dump(exclude={"id", "created_at", "updated_at"})
            ),
        )

        assert updated is not None
        assert updated.status == "captured"
        assert updated.captured_frames == 30
        assert updated.notes == "Captured before clouds rolled in"
        assert delete_session_archive(created.id) is True
        assert delete_session_archive(created.id) is False
    finally:
        get_settings.cache_clear()
