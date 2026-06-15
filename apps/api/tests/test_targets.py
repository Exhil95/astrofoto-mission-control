from astro_api.schemas import TargetResponse
from astro_api.services import TARGETS


def test_targets_have_catalog_metadata() -> None:
    targets = [TargetResponse.model_validate(target) for target in TARGETS]

    assert len(targets) >= 10
    assert all(target.catalog_id for target in targets)
    assert all(target.constellation for target in targets)
    assert all(target.angular_width_arcmin > 0 for target in targets)
    assert all(target.angular_height_arcmin > 0 for target in targets)
    assert {target.season for target in targets} >= {"Winter", "Spring", "Summer", "Autumn"}

