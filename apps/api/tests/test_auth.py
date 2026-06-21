import sqlite3

import pytest

from astro_api.auth import (
    AuthEmailExistsError,
    AuthInvalidCredentialsError,
    AuthInvalidTokenError,
    get_user_for_token,
    login_user,
    register_user,
    revoke_token,
)
from astro_api.schemas import AuthLoginRequest, AuthRegisterRequest
from astro_api.settings import get_settings


def test_auth_register_login_and_token_lifecycle(tmp_path) -> None:
    get_settings.cache_clear()
    settings = get_settings()
    database_path = tmp_path / "auth.sqlite3"
    settings.profile_database_url = f"sqlite:///{database_path}"
    settings.auth_session_ttl_hours = 1

    try:
        registered = register_user(
            AuthRegisterRequest(
                email="Operator@Example.COM",
                display_name="  Backyard Operator  ",
                password="correct-horse-battery",
            )
        )

        assert registered.token_type == "bearer"
        assert registered.access_token
        assert registered.user.email == "operator@example.com"
        assert registered.user.display_name == "Backyard Operator"

        with sqlite3.connect(database_path) as connection:
            stored_hash = connection.execute(
                "SELECT password_hash FROM auth_users WHERE email = ?",
                ("operator@example.com",),
            ).fetchone()[0]

        assert "correct-horse-battery" not in stored_hash
        assert stored_hash.startswith("pbkdf2_sha256$")

        logged_in = login_user(
            AuthLoginRequest(email="operator@example.com", password="correct-horse-battery")
        )
        assert logged_in.access_token != registered.access_token
        assert logged_in.user.id == registered.user.id

        current_user = get_user_for_token(logged_in.access_token)
        assert current_user.email == "operator@example.com"

        revoke_token(logged_in.access_token)
        with pytest.raises(AuthInvalidTokenError):
            get_user_for_token(logged_in.access_token)
    finally:
        get_settings.cache_clear()


def test_auth_rejects_duplicate_email_and_bad_password(tmp_path) -> None:
    get_settings.cache_clear()
    settings = get_settings()
    settings.profile_database_url = f"sqlite:///{tmp_path / 'auth.sqlite3'}"

    try:
        payload = AuthRegisterRequest(
            email="operator@example.com",
            display_name="Operator",
            password="correct-horse-battery",
        )
        register_user(payload)

        with pytest.raises(AuthEmailExistsError):
            register_user(payload)

        with pytest.raises(AuthInvalidCredentialsError):
            login_user(AuthLoginRequest(email="operator@example.com", password="wrong-password"))
    finally:
        get_settings.cache_clear()
