from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from .schemas import TargetResponse


TARGET_CATALOG_PATH = Path(__file__).with_name("data") / "targets.json"


@lru_cache
def load_targets() -> list[dict[str, Any]]:
    raw_targets = json.loads(TARGET_CATALOG_PATH.read_text(encoding="utf-8"))
    return [TargetResponse.model_validate(target).model_dump() for target in raw_targets]


def get_target(target_id: str) -> dict[str, Any]:
    targets = load_targets()
    return next((target for target in targets if target["id"] == target_id), targets[0])


TARGETS = load_targets()
