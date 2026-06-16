from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .schemas import SessionArchiveCreate, SessionArchiveResponse, SessionArchiveUpdate
from .settings import get_settings

ARCHIVE_COLUMNS = [
    "id",
    "target_id",
    "target_name",
    "session_date",
    "status",
    "profile_id",
    "profile_name",
    "site_name",
    "bortle",
    "fov_horizontal_deg",
    "fov_vertical_deg",
    "pixel_scale_arcsec",
    "imaging_mode",
    "filter_names",
    "total_integration_minutes",
    "planned_frames",
    "captured_frames",
    "window_start",
    "window_end",
    "weather_status",
    "weather_score",
    "moon_illumination_percent",
    "white_night",
    "notes",
    "capture_markdown",
    "created_at",
    "updated_at",
]


def list_session_archives(limit: int = 12) -> list[SessionArchiveResponse]:
    _ensure_store()
    with _connect() as connection:
        rows = connection.execute(
            f"""
            SELECT {', '.join(ARCHIVE_COLUMNS)}
            FROM session_archives
            ORDER BY session_date DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [_row_to_archive(row) for row in rows]


def create_session_archive(payload: SessionArchiveCreate) -> SessionArchiveResponse:
    _ensure_store()
    values = _payload_to_row(payload)
    now = _now_iso()
    values["created_at"] = now
    values["updated_at"] = now
    fields = list(values)
    placeholders = ", ".join("?" for _ in fields)

    with _connect() as connection:
        cursor = connection.execute(
            f"INSERT INTO session_archives ({', '.join(fields)}) VALUES ({placeholders})",
            [values[field] for field in fields],
        )
        connection.commit()
        archive_id = int(cursor.lastrowid)

    archive = get_session_archive(archive_id)
    if archive is None:
        raise RuntimeError("Session archive was not persisted")
    return archive


def update_session_archive(
    archive_id: int, payload: SessionArchiveUpdate
) -> SessionArchiveResponse | None:
    _ensure_store()
    values = _payload_to_row(payload)
    values["updated_at"] = _now_iso()
    assignments = ", ".join(f"{field} = ?" for field in values)

    with _connect() as connection:
        cursor = connection.execute(
            f"UPDATE session_archives SET {assignments} WHERE id = ?",
            [*values.values(), archive_id],
        )
        connection.commit()
        if cursor.rowcount == 0:
            return None
    return get_session_archive(archive_id)


def delete_session_archive(archive_id: int) -> bool:
    _ensure_store()
    with _connect() as connection:
        cursor = connection.execute("DELETE FROM session_archives WHERE id = ?", (archive_id,))
        connection.commit()
    return cursor.rowcount > 0


def get_session_archive(archive_id: int) -> SessionArchiveResponse | None:
    _ensure_store()
    with _connect() as connection:
        row = connection.execute(
            f"SELECT {', '.join(ARCHIVE_COLUMNS)} FROM session_archives WHERE id = ?",
            (archive_id,),
        ).fetchone()
    return _row_to_archive(row) if row else None


def _ensure_store() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS session_archives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target_id TEXT NOT NULL,
                target_name TEXT NOT NULL,
                session_date TEXT NOT NULL,
                status TEXT NOT NULL,
                profile_id INTEGER,
                profile_name TEXT,
                site_name TEXT NOT NULL,
                bortle INTEGER NOT NULL,
                fov_horizontal_deg REAL NOT NULL,
                fov_vertical_deg REAL NOT NULL,
                pixel_scale_arcsec REAL NOT NULL,
                imaging_mode TEXT NOT NULL,
                filter_names TEXT NOT NULL,
                total_integration_minutes INTEGER NOT NULL,
                planned_frames INTEGER NOT NULL,
                captured_frames INTEGER NOT NULL,
                window_start TEXT NOT NULL,
                window_end TEXT NOT NULL,
                weather_status TEXT NOT NULL,
                weather_score INTEGER NOT NULL,
                moon_illumination_percent INTEGER NOT NULL,
                white_night INTEGER NOT NULL,
                notes TEXT NOT NULL,
                capture_markdown TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.commit()


def _payload_to_row(payload: SessionArchiveCreate | SessionArchiveUpdate) -> dict[str, Any]:
    values = payload.model_dump()
    values["session_date"] = payload.session_date.isoformat()
    values["filter_names"] = json.dumps(payload.filter_names, ensure_ascii=True)
    values["white_night"] = 1 if payload.white_night else 0
    return values


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


def _row_to_archive(row: sqlite3.Row) -> SessionArchiveResponse:
    data: dict[str, Any] = {column: row[column] for column in ARCHIVE_COLUMNS}
    data["filter_names"] = json.loads(data["filter_names"])
    data["white_night"] = bool(data["white_night"])
    return SessionArchiveResponse(**data)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
