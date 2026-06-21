from datetime import date

import pytest
from fastapi import HTTPException

from astro_api.auth import register_user
from astro_api.main import require_auth_user
from astro_api.profiles import create_profile, delete_profile, list_profiles, update_profile
from astro_api.schemas import (
    AuthRegisterRequest,
    ProfileCreate,
    ProfileUpdate,
    SessionArchiveCreate,
    SessionArchiveUpdate,
)
from astro_api.session_archive import (
    create_session_archive,
    delete_session_archive,
    list_session_archives,
    update_session_archive,
)
from astro_api.settings import get_settings


def test_profiles_are_scoped_to_authenticated_user(tmp_path) -> None:
    get_settings.cache_clear()
    settings = get_settings()
    settings.profile_database_url = f"sqlite:///{tmp_path / 'ownership.sqlite3'}"

    try:
        first_user = register_user(register_payload("first@example.com")).user
        second_user = register_user(register_payload("second@example.com")).user

        with pytest.raises(HTTPException):
            require_auth_user(None)

        first_profiles = list_profiles(owner_user_id=first_user.id)
        second_profiles = list_profiles(owner_user_id=second_user.id)

        assert len(first_profiles) == 3
        assert len(second_profiles) == 3
        assert {profile.id for profile in first_profiles}.isdisjoint(
            {profile.id for profile in second_profiles}
        )

        created = create_profile(
            ProfileCreate(
                **first_profiles[0].model_copy(update={"name": "Private Backyard"}).model_dump(
                    exclude={"id", "updated_at"}
                )
            ),
            owner_user_id=first_user.id,
        )

        cross_user_update = update_profile(
            created.id,
            ProfileUpdate(
                **created.model_copy(update={"name": "Cross-user edit"}).model_dump(
                    exclude={"id", "updated_at"}
                )
            ),
            owner_user_id=second_user.id,
        )

        assert cross_user_update is None
        assert delete_profile(created.id, owner_user_id=second_user.id) is False
        assert delete_profile(created.id, owner_user_id=first_user.id) is True
    finally:
        get_settings.cache_clear()


def test_session_archive_is_scoped_to_authenticated_user(tmp_path) -> None:
    get_settings.cache_clear()
    settings = get_settings()
    settings.profile_database_url = f"sqlite:///{tmp_path / 'archive-ownership.sqlite3'}"

    try:
        first_user = register_user(register_payload("archive-first@example.com")).user
        second_user = register_user(register_payload("archive-second@example.com")).user

        created = create_session_archive(
            session_archive_create_payload(),
            owner_user_id=first_user.id,
        )

        assert len(list_session_archives(owner_user_id=first_user.id)) == 1
        assert list_session_archives(owner_user_id=second_user.id) == []

        update_payload = SessionArchiveUpdate(
            **created.model_copy(
                update={"status": "captured", "captured_frames": 30}
            ).model_dump(exclude={"id", "created_at", "updated_at"})
        )

        assert (
            update_session_archive(created.id, update_payload, owner_user_id=second_user.id)
            is None
        )
        assert delete_session_archive(created.id, owner_user_id=second_user.id) is False

        updated = update_session_archive(created.id, update_payload, owner_user_id=first_user.id)
        assert updated is not None
        assert updated.status == "captured"
        assert updated.captured_frames == 30
    finally:
        get_settings.cache_clear()


def register_payload(email: str) -> AuthRegisterRequest:
    return AuthRegisterRequest(
        email=email,
        display_name=email.split("@")[0],
        password="correct-horse-battery",
    )


def session_archive_create_payload() -> SessionArchiveCreate:
    return SessionArchiveCreate(
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
