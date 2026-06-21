from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from .schemas import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthSessionResponse,
    AuthUserResponse,
)
from .settings import get_settings

PASSWORD_ITERATIONS = 210_000
PASSWORD_ALGORITHM = "pbkdf2_sha256"


class AuthEmailExistsError(Exception):
    pass


class AuthInvalidCredentialsError(Exception):
    pass


class AuthInvalidTokenError(Exception):
    pass


def register_user(payload: AuthRegisterRequest) -> AuthSessionResponse:
    _ensure_store()
    now = _now()

    with _connect() as connection:
        existing = connection.execute(
            "SELECT id FROM auth_users WHERE email = ?",
            (payload.email,),
        ).fetchone()
        if existing is not None:
            raise AuthEmailExistsError("Email already registered")

        cursor = connection.execute(
            """
            INSERT INTO auth_users (email, display_name, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                payload.email,
                payload.display_name,
                hash_password(payload.password),
                _to_iso(now),
                _to_iso(now),
            ),
        )
        connection.commit()
        user_id = int(cursor.lastrowid)

    user = get_user(user_id)
    if user is None:
        raise RuntimeError("User was not persisted")
    return create_session(user)


def login_user(payload: AuthLoginRequest) -> AuthSessionResponse:
    _ensure_store()

    with _connect() as connection:
        row = connection.execute(
            "SELECT id, email, display_name, password_hash, created_at FROM auth_users WHERE email = ?",
            (payload.email,),
        ).fetchone()

    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise AuthInvalidCredentialsError("Invalid email or password")

    return create_session(_row_to_user(row))


def get_user(user_id: int) -> AuthUserResponse | None:
    _ensure_store()
    with _connect() as connection:
        row = connection.execute(
            "SELECT id, email, display_name, created_at FROM auth_users WHERE id = ?",
            (user_id,),
        ).fetchone()
    return _row_to_user(row) if row else None


def get_user_for_token(token: str) -> AuthUserResponse:
    _ensure_store()
    token_hash = hash_token(token)
    now_iso = _to_iso(_now())

    with _connect() as connection:
        _purge_expired_sessions(connection)
        row = connection.execute(
            """
            SELECT users.id, users.email, users.display_name, users.created_at
            FROM auth_sessions sessions
            JOIN auth_users users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
            """,
            (token_hash, now_iso),
        ).fetchone()
        connection.commit()

    if row is None:
        raise AuthInvalidTokenError("Invalid or expired token")

    return _row_to_user(row)


def revoke_token(token: str) -> None:
    _ensure_store()
    with _connect() as connection:
        connection.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (hash_token(token),))
        connection.commit()


def create_session(user: AuthUserResponse) -> AuthSessionResponse:
    _ensure_store()
    token = secrets.token_urlsafe(32)
    now = _now()
    expires_at = now + timedelta(hours=get_settings().auth_session_ttl_hours)

    with _connect() as connection:
        _purge_expired_sessions(connection)
        connection.execute(
            """
            INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (hash_token(token), user.id, _to_iso(now), _to_iso(expires_at)),
        )
        connection.commit()

    return AuthSessionResponse(access_token=token, expires_at=_to_iso(expires_at), user=user)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = _password_digest(password, salt, PASSWORD_ITERATIONS)
    return f"{PASSWORD_ALGORITHM}${PASSWORD_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_raw, salt, digest = stored_hash.split("$", maxsplit=3)
        iterations = int(iterations_raw)
    except ValueError:
        return False

    if algorithm != PASSWORD_ALGORITHM:
        return False

    candidate = _password_digest(password, salt, iterations)
    return hmac.compare_digest(candidate, digest)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def extract_bearer_token(authorization: str | None) -> str:
    if authorization is None:
        raise AuthInvalidTokenError("Missing authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise AuthInvalidTokenError("Invalid authorization header")

    return token.strip()


def _ensure_store() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)"
        )
        _purge_expired_sessions(connection)
        connection.commit()


def _purge_expired_sessions(connection: sqlite3.Connection) -> None:
    connection.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (_to_iso(_now()),))


def _password_digest(password: str, salt: str, iterations: int) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()


def _connect() -> sqlite3.Connection:
    path = _database_path()
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def _database_path() -> str:
    url = get_settings().profile_database_url
    if url == "sqlite:///:memory:":
        return ":memory:"
    if url.startswith("sqlite:///"):
        return url.removeprefix("sqlite:///")
    if url.startswith("sqlite://"):
        return url.removeprefix("sqlite://")
    return "./astrofoto.sqlite3"


def _row_to_user(row: sqlite3.Row) -> AuthUserResponse:
    data: dict[str, Any] = {
        "id": row["id"],
        "email": row["email"],
        "display_name": row["display_name"],
        "created_at": row["created_at"],
    }
    return AuthUserResponse(**data)


def _now() -> datetime:
    return datetime.now(UTC)


def _to_iso(value: datetime) -> str:
    return value.isoformat(timespec="seconds").replace("+00:00", "Z")
