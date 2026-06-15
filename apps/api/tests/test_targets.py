import json

from astro_api.catalog import TARGET_CATALOG_PATH, load_targets
from astro_api.schemas import TargetResponse


def test_targets_have_catalog_metadata() -> None:
    targets = [TargetResponse.model_validate(target) for target in load_targets()]
    raw_targets = json.loads(TARGET_CATALOG_PATH.read_text(encoding="utf-8"))

    assert len(targets) >= 30
    assert len(raw_targets) == len(targets)
    assert all(target.catalog_id for target in targets)
    assert all(target.constellation for target in targets)
    assert all(target.angular_width_arcmin > 0 for target in targets)
    assert all(target.angular_height_arcmin > 0 for target in targets)
    assert all(len(target.position) == 3 for target in targets)
    assert all(target.tint.startswith("#") for target in targets)
    assert all(target.image_url for target in targets)
    assert all(target.image_credit for target in targets)
    assert all(target.image_source_url for target in targets)
    assert all(0 <= target.ra_hours < 24 for target in targets)
    assert {target.season for target in targets} >= {"Winter", "Spring", "Summer", "Autumn"}
    assert {"Sh2-101", "B33"} <= {target.catalog_id for target in targets}
