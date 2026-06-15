import json
import os
from urllib.error import URLError

from astro_api.catalog import TARGET_CATALOG_PATH, load_targets
from astro_api.image_cache import get_cached_target_image
from astro_api.schemas import TargetResponse
from astro_api.settings import Settings


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
    assert all(target.image_url.startswith(f"/api/targets/{target.id}/image") for target in targets)
    assert all(target.image_source_url.startswith("https://alasky.cds.unistra.fr") for target in targets)
    assert all(0 <= target.ra_hours < 24 for target in targets)
    assert {target.season for target in targets} >= {"Winter", "Spring", "Summer", "Autumn"}
    assert {"Sh2-101", "B33"} <= {target.catalog_id for target in targets}


def test_target_image_cache_uses_fresh_file(tmp_path) -> None:
    settings = Settings(
        target_image_cache_dir=str(tmp_path),
        target_image_cache_ttl_seconds=3600,
    )
    cache_file = tmp_path / "m42.jpg"
    cache_file.write_bytes(b"cached-jpeg")

    image = get_cached_target_image(
        "m42",
        settings=settings,
        downloader=lambda _url, _timeout: (_ for _ in ()).throw(AssertionError),
    )

    assert image.content == b"cached-jpeg"
    assert image.media_type == "image/jpeg"
    assert image.cache_status == "hit"


def test_target_image_cache_falls_back_to_stale_file(tmp_path) -> None:
    settings = Settings(
        target_image_cache_dir=str(tmp_path),
        target_image_cache_ttl_seconds=0,
    )
    cache_file = tmp_path / "m42.jpg"
    cache_file.write_bytes(b"stale-jpeg")
    os.utime(cache_file, (1, 1))

    image = get_cached_target_image(
        "m42",
        settings=settings,
        downloader=lambda _url, _timeout: (_ for _ in ()).throw(URLError("offline")),
    )

    assert image.content == b"stale-jpeg"
    assert image.cache_status == "stale"
