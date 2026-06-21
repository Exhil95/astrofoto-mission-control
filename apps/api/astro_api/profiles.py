from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .schemas import ProfileCreate, ProfileResponse, ProfileUpdate
from .settings import get_settings

PROFILE_COLUMNS = [
    "id",
    "name",
    "site_name",
    "latitude_deg",
    "longitude_deg",
    "timezone",
    "bortle",
    "telescope_name",
    "telescope_type",
    "aperture_mm",
    "focal_length_mm",
    "reducer_name",
    "reducer",
    "camera_name",
    "sensor_id",
    "sensor_name",
    "sensor_width_mm",
    "sensor_height_mm",
    "pixel_size_um",
    "filter_set",
    "filter_wheel",
    "guiding_setup",
    "guide_camera_name",
    "focuser_name",
    "mount_name",
    "updated_at",
]

PROFILE_OWNER_COLUMN = "owner_user_id"

PROFILE_COLUMN_MIGRATIONS = {
    PROFILE_OWNER_COLUMN: "INTEGER",
    "telescope_type": "TEXT NOT NULL DEFAULT 'Refractor'",
    "aperture_mm": "REAL NOT NULL DEFAULT 80",
    "reducer_name": "TEXT NOT NULL DEFAULT 'None'",
    "camera_name": "TEXT NOT NULL DEFAULT 'Dedicated astro camera'",
    "filter_set": "TEXT NOT NULL DEFAULT 'LRGB + Ha/OIII/SII'",
    "filter_wheel": "TEXT NOT NULL DEFAULT 'Manual drawer'",
    "guiding_setup": "TEXT NOT NULL DEFAULT '50mm guide scope'",
    "guide_camera_name": "TEXT NOT NULL DEFAULT 'ASI120MM class'",
    "focuser_name": "TEXT NOT NULL DEFAULT 'Manual focuser'",
    "mount_name": "TEXT NOT NULL DEFAULT 'Equatorial mount'",
}

DEFAULT_PROFILES = [
    {
        "name": "Backyard APS-C",
        "site_name": "Katowice",
        "latitude_deg": 50.2649,
        "longitude_deg": 19.0238,
        "timezone": "Europe/Warsaw",
        "bortle": 5,
        "telescope_name": "80ED Refractor",
        "telescope_type": "Doublet refractor",
        "aperture_mm": 80,
        "focal_length_mm": 480,
        "reducer_name": "1.0x field flattener",
        "reducer": 1,
        "camera_name": "ASI2600MC Pro",
        "sensor_id": "imx571",
        "sensor_name": "Sony IMX571",
        "sensor_width_mm": 23.5,
        "sensor_height_mm": 15.7,
        "pixel_size_um": 3.76,
        "filter_set": "UV/IR cut + dual narrowband",
        "filter_wheel": "2 inch filter drawer",
        "guiding_setup": "50mm guide scope",
        "guide_camera_name": "ASI120MM Mini",
        "focuser_name": "EAF on Crayford",
        "mount_name": "HEQ5 class",
    },
    {
        "name": "Dark Site Wide",
        "site_name": "Bieszczady",
        "latitude_deg": 49.2486,
        "longitude_deg": 22.5937,
        "timezone": "Europe/Warsaw",
        "bortle": 2,
        "telescope_name": "RedCat Class",
        "telescope_type": "Petzval refractor",
        "aperture_mm": 51,
        "focal_length_mm": 250,
        "reducer_name": "Native flat field",
        "reducer": 1,
        "camera_name": "ASI2600MC Pro",
        "sensor_id": "imx571",
        "sensor_name": "Sony IMX571",
        "sensor_width_mm": 23.5,
        "sensor_height_mm": 15.7,
        "pixel_size_um": 3.76,
        "filter_set": "UV/IR cut + L-eXtreme",
        "filter_wheel": "Filter drawer",
        "guiding_setup": "30mm mini guide scope",
        "guide_camera_name": "ASI120MM Mini",
        "focuser_name": "Helical focuser",
        "mount_name": "Travel harmonic mount",
    },
    {
        "name": "Tenerife Full Frame",
        "site_name": "Tenerife",
        "latitude_deg": 28.3003,
        "longitude_deg": -16.5118,
        "timezone": "Atlantic/Canary",
        "bortle": 3,
        "telescope_name": "Fast Astrograph",
        "telescope_type": "Corrected astrograph",
        "aperture_mm": 150,
        "focal_length_mm": 420,
        "reducer_name": "0.8x reducer/corrector",
        "reducer": 0.8,
        "camera_name": "ASI6200MM Pro",
        "sensor_id": "imx455",
        "sensor_name": "Sony IMX455",
        "sensor_width_mm": 36,
        "sensor_height_mm": 24,
        "pixel_size_um": 3.76,
        "filter_set": "LRGB + 3nm SHO",
        "filter_wheel": "7x2 inch EFW",
        "guiding_setup": "OAG",
        "guide_camera_name": "ASI174MM Mini",
        "focuser_name": "High-torque EAF",
        "mount_name": "EQ8 class",
    },
]


def list_profiles(owner_user_id: int | None = None) -> list[ProfileResponse]:
    _ensure_store()
    with _connect() as connection:
        if owner_user_id is not None:
            _ensure_user_profiles(connection, owner_user_id)
        rows = connection.execute(
            f"""
            SELECT {', '.join(PROFILE_COLUMNS)}
            FROM equipment_profiles
            WHERE {owner_where_clause(owner_user_id)}
            ORDER BY id
            """,
            owner_where_params(owner_user_id),
        ).fetchall()
        connection.commit()
    return [_row_to_profile(row) for row in rows]


def create_profile(payload: ProfileCreate, owner_user_id: int | None = None) -> ProfileResponse:
    _ensure_store()
    values = payload.model_dump()
    values[PROFILE_OWNER_COLUMN] = owner_user_id
    values["updated_at"] = _now_iso()
    fields = list(values)
    placeholders = ", ".join("?" for _ in fields)

    with _connect() as connection:
        cursor = connection.execute(
            f"INSERT INTO equipment_profiles ({', '.join(fields)}) VALUES ({placeholders})",
            [values[field] for field in fields],
        )
        connection.commit()
        profile_id = int(cursor.lastrowid)
    profile = get_profile(profile_id, owner_user_id)
    if profile is None:
        raise RuntimeError("Profile was not persisted")
    return profile


def update_profile(
    profile_id: int, payload: ProfileUpdate, owner_user_id: int | None = None
) -> ProfileResponse | None:
    _ensure_store()
    values = payload.model_dump()
    values["updated_at"] = _now_iso()
    assignments = ", ".join(f"{field} = ?" for field in values)

    with _connect() as connection:
        cursor = connection.execute(
            f"""
            UPDATE equipment_profiles
            SET {assignments}
            WHERE id = ? AND {owner_where_clause(owner_user_id)}
            """,
            [*values.values(), profile_id, *owner_where_params(owner_user_id)],
        )
        connection.commit()
        if cursor.rowcount == 0:
            return None
    return get_profile(profile_id, owner_user_id)


def delete_profile(profile_id: int, owner_user_id: int | None = None) -> bool:
    _ensure_store()
    with _connect() as connection:
        cursor = connection.execute(
            f"DELETE FROM equipment_profiles WHERE id = ? AND {owner_where_clause(owner_user_id)}",
            (profile_id, *owner_where_params(owner_user_id)),
        )
        connection.commit()
    return cursor.rowcount > 0


def get_profile(profile_id: int, owner_user_id: int | None = None) -> ProfileResponse | None:
    _ensure_store()
    with _connect() as connection:
        row = connection.execute(
            f"""
            SELECT {', '.join(PROFILE_COLUMNS)}
            FROM equipment_profiles
            WHERE id = ? AND {owner_where_clause(owner_user_id)}
            """,
            (profile_id, *owner_where_params(owner_user_id)),
        ).fetchone()
    return _row_to_profile(row) if row else None


def _ensure_store() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS equipment_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_user_id INTEGER,
                name TEXT NOT NULL,
                site_name TEXT NOT NULL,
                latitude_deg REAL NOT NULL,
                longitude_deg REAL NOT NULL,
                timezone TEXT NOT NULL,
                bortle INTEGER NOT NULL,
                telescope_name TEXT NOT NULL,
                telescope_type TEXT NOT NULL,
                aperture_mm REAL NOT NULL,
                focal_length_mm REAL NOT NULL,
                reducer_name TEXT NOT NULL,
                reducer REAL NOT NULL,
                camera_name TEXT NOT NULL,
                sensor_id TEXT NOT NULL,
                sensor_name TEXT NOT NULL,
                sensor_width_mm REAL NOT NULL,
                sensor_height_mm REAL NOT NULL,
                pixel_size_um REAL NOT NULL,
                filter_set TEXT NOT NULL,
                filter_wheel TEXT NOT NULL,
                guiding_setup TEXT NOT NULL,
                guide_camera_name TEXT NOT NULL,
                focuser_name TEXT NOT NULL,
                mount_name TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        _ensure_columns(connection)
        count = connection.execute(
            "SELECT COUNT(*) FROM equipment_profiles WHERE owner_user_id IS NULL"
        ).fetchone()[0]
        if count == 0:
            _seed_defaults(connection, owner_user_id=None)
        connection.commit()


def _ensure_columns(connection: sqlite3.Connection) -> None:
    existing_columns = {
        row["name"] for row in connection.execute("PRAGMA table_info(equipment_profiles)")
    }
    for column, definition in PROFILE_COLUMN_MIGRATIONS.items():
        if column not in existing_columns:
            connection.execute(f"ALTER TABLE equipment_profiles ADD COLUMN {column} {definition}")


def _ensure_user_profiles(connection: sqlite3.Connection, owner_user_id: int) -> None:
    count = connection.execute(
        "SELECT COUNT(*) FROM equipment_profiles WHERE owner_user_id = ?",
        (owner_user_id,),
    ).fetchone()[0]
    if count == 0:
        _seed_defaults(connection, owner_user_id=owner_user_id)


def _seed_defaults(connection: sqlite3.Connection, owner_user_id: int | None) -> None:
    for profile in DEFAULT_PROFILES:
        values = {**profile, PROFILE_OWNER_COLUMN: owner_user_id, "updated_at": _now_iso()}
        fields = list(values)
        placeholders = ", ".join("?" for _ in fields)
        connection.execute(
            f"INSERT INTO equipment_profiles ({', '.join(fields)}) VALUES ({placeholders})",
            [values[field] for field in fields],
        )


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


def _row_to_profile(row: sqlite3.Row) -> ProfileResponse:
    data: dict[str, Any] = {column: row[column] for column in PROFILE_COLUMNS}
    return ProfileResponse(**data)


def owner_where_clause(owner_user_id: int | None) -> str:
    return "owner_user_id IS NULL" if owner_user_id is None else "owner_user_id = ?"


def owner_where_params(owner_user_id: int | None) -> tuple[int, ...]:
    return () if owner_user_id is None else (owner_user_id,)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
