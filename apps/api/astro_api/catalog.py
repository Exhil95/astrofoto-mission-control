from __future__ import annotations

import json
from functools import lru_cache
from math import cos, pi, radians, sin
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

from .schemas import TargetResponse


TARGET_CATALOG_PATH = Path(__file__).with_name("data") / "targets.json"
SURVEY_IMAGE_ENDPOINT = "https://alasky.cds.unistra.fr/hips-image-services/hips2fits"
SURVEY_IMAGE_CREDIT = "CDS DSS2 color survey"


@lru_cache
def load_targets() -> list[dict[str, Any]]:
    raw_targets = json.loads(TARGET_CATALOG_PATH.read_text(encoding="utf-8"))
    return [TargetResponse.model_validate(_enrich_target(target)).model_dump() for target in raw_targets]


def get_target(target_id: str) -> dict[str, Any]:
    return find_target(target_id) or load_targets()[0]


def find_target(target_id: str) -> dict[str, Any] | None:
    return next((target for target in load_targets() if target["id"] == target_id), None)


def build_survey_image_url(target: dict[str, Any]) -> str:
    return _survey_image_url(
        ra_hours=float(target["ra_hours"]),
        dec_deg=float(target["dec_deg"]),
        width_arcmin=float(target["angular_width_arcmin"]),
        height_arcmin=float(target["angular_height_arcmin"]),
    )

def _enrich_target(target: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(target)
    enriched.setdefault("position", _target_position(float(enriched["ra_hours"]), float(enriched["dec_deg"])))
    enriched.setdefault("image_url", f"/api/targets/{enriched['id']}/image")
    enriched.setdefault("image_credit", SURVEY_IMAGE_CREDIT)
    enriched.setdefault("image_source_url", build_survey_image_url(enriched))
    return enriched


def _target_position(ra_hours: float, dec_deg: float) -> tuple[float, float, float]:
    ra_rad = (ra_hours / 24) * 2 * pi
    dec_rad = radians(dec_deg)
    radius = 1.95

    return (
        round(sin(ra_rad) * cos(dec_rad) * radius, 2),
        round(sin(dec_rad) * radius, 2),
        round(cos(ra_rad) * cos(dec_rad) * radius * 0.78, 2),
    )


def _survey_image_url(
    *,
    ra_hours: float,
    dec_deg: float,
    width_arcmin: float,
    height_arcmin: float,
) -> str:
    image_fov_deg = max(0.22, min(max(width_arcmin, height_arcmin) / 60 * 1.35, 4.2))
    query = urlencode(
        {
            "hips": "CDS/P/DSS2/color",
            "width": 256,
            "height": 256,
            "fov": round(image_fov_deg, 3),
            "projection": "TAN",
            "coordsys": "icrs",
            "ra": round(ra_hours * 15, 5),
            "dec": round(dec_deg, 5),
            "format": "jpg",
        }
    )
    return f"{SURVEY_IMAGE_ENDPOINT}?{query}"


TARGETS = load_targets()
