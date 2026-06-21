from __future__ import annotations

import json
import sqlite3

from astro_api.postgres_migration import (
    psycopg_connection_url,
    read_sqlite_snapshot,
    sqlite_path_from_url,
)
from astro_api.profiles import PROFILE_COLUMNS
from astro_api.session_archive import ARCHIVE_COLUMNS


def test_sqlite_path_from_url_supports_file_and_memory_urls() -> None:
    assert sqlite_path_from_url("sqlite:///:memory:") == ":memory:"
    assert sqlite_path_from_url("sqlite:///tmp/astrofoto.sqlite3") == "tmp/astrofoto.sqlite3"
    assert sqlite_path_from_url("sqlite:////data/astrofoto.sqlite3") == "/data/astrofoto.sqlite3"


def test_psycopg_connection_url_accepts_sqlalchemy_style_driver_name() -> None:
    assert (
        psycopg_connection_url("postgresql+psycopg://astrofoto:secret@postgres:5432/astrofoto")
        == "postgresql://astrofoto:secret@postgres:5432/astrofoto"
    )
    assert (
        psycopg_connection_url("postgresql://astrofoto:secret@postgres:5432/astrofoto")
        == "postgresql://astrofoto:secret@postgres:5432/astrofoto"
    )


def test_read_sqlite_snapshot_normalizes_profiles_and_session_archives(tmp_path) -> None:
    database_path = tmp_path / "astrofoto.sqlite3"
    connection = sqlite3.connect(database_path)
    try:
        create_table(connection, "equipment_profiles", PROFILE_COLUMNS)
        create_table(connection, "session_archives", ARCHIVE_COLUMNS)
        insert_row(connection, "equipment_profiles", PROFILE_COLUMNS, profile_row())
        insert_row(connection, "session_archives", ARCHIVE_COLUMNS, archive_row())
        connection.commit()
    finally:
        connection.close()

    snapshot = read_sqlite_snapshot(f"sqlite:///{database_path}")

    assert snapshot.total_rows == 2
    assert snapshot.profiles[0]["name"] == "Backyard APS-C"
    assert snapshot.session_archives[0]["target_name"] == "North America"
    assert snapshot.session_archives[0]["filter_names"] == ["Ha", "OIII", "SII"]
    assert snapshot.session_archives[0]["white_night"] is False


def test_read_sqlite_snapshot_treats_missing_tables_as_empty(tmp_path) -> None:
    database_path = tmp_path / "empty.sqlite3"
    sqlite3.connect(database_path).close()

    snapshot = read_sqlite_snapshot(f"sqlite:///{database_path}")

    assert snapshot.profiles == []
    assert snapshot.session_archives == []
    assert snapshot.total_rows == 0


def create_table(connection: sqlite3.Connection, table_name: str, columns: list[str]) -> None:
    column_defs = ["id INTEGER PRIMARY KEY", *[f"{column} TEXT" for column in columns if column != "id"]]
    connection.execute(f"CREATE TABLE {table_name} ({', '.join(column_defs)})")


def insert_row(
    connection: sqlite3.Connection,
    table_name: str,
    columns: list[str],
    row: dict[str, object],
) -> None:
    placeholders = ", ".join("?" for _ in columns)
    connection.execute(
        f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})",
        [row[column] for column in columns],
    )


def profile_row() -> dict[str, object]:
    return {
        "id": 1,
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
        "updated_at": "2026-06-21T10:00:00Z",
    }


def archive_row() -> dict[str, object]:
    return {
        "id": 7,
        "target_id": "north-america",
        "target_name": "North America",
        "session_date": "2026-06-21",
        "status": "captured",
        "profile_id": 1,
        "profile_name": "Backyard APS-C",
        "site_name": "Katowice",
        "bortle": 5,
        "fov_horizontal_deg": 2.8,
        "fov_vertical_deg": 1.87,
        "pixel_scale_arcsec": 1.62,
        "imaging_mode": "Narrowband",
        "filter_names": json.dumps(["Ha", "OIII", "SII"]),
        "total_integration_minutes": 180,
        "planned_frames": 36,
        "captured_frames": 33,
        "window_start": "22:30",
        "window_end": "02:20",
        "weather_status": "ok",
        "weather_score": 72,
        "moon_illumination_percent": 18,
        "white_night": 0,
        "notes": "Imported from FITS",
        "capture_markdown": "# Capture",
        "created_at": "2026-06-21T10:00:00Z",
        "updated_at": "2026-06-21T10:05:00Z",
    }
