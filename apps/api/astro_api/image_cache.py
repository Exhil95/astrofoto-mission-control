from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from time import time
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .catalog import build_survey_image_url, find_target
from .settings import Settings, get_settings


IMAGE_MEDIA_TYPE = "image/jpeg"


class TargetImageNotFoundError(Exception):
    pass


class TargetImageUnavailableError(Exception):
    pass


@dataclass(frozen=True)
class CachedTargetImage:
    content: bytes
    media_type: str
    cache_status: str


ImageDownloader = Callable[[str, float], bytes]


def get_cached_target_image(
    target_id: str,
    *,
    settings: Settings | None = None,
    downloader: ImageDownloader | None = None,
) -> CachedTargetImage:
    target = find_target(target_id)
    if target is None:
        raise TargetImageNotFoundError(target_id)

    resolved_settings = settings or get_settings()
    cache_path = _target_cache_path(target_id, resolved_settings)
    ttl_seconds = resolved_settings.target_image_cache_ttl_seconds

    if _is_fresh(cache_path, ttl_seconds):
        return CachedTargetImage(cache_path.read_bytes(), IMAGE_MEDIA_TYPE, "hit")

    fetch_image = downloader or _download_image
    try:
        content = fetch_image(
            build_survey_image_url(target),
            resolved_settings.target_image_timeout_seconds,
        )
    except (HTTPError, OSError, TimeoutError, URLError) as exc:
        if cache_path.exists():
            return CachedTargetImage(cache_path.read_bytes(), IMAGE_MEDIA_TYPE, "stale")
        raise TargetImageUnavailableError(str(exc)) from exc

    _write_cache_file(cache_path, content)
    return CachedTargetImage(content, IMAGE_MEDIA_TYPE, "miss")


def _target_cache_path(target_id: str, settings: Settings) -> Path:
    safe_target_id = "".join(char for char in target_id.lower() if char.isalnum() or char in "-_")
    return Path(settings.target_image_cache_dir) / f"{safe_target_id}.jpg"


def _is_fresh(path: Path, ttl_seconds: int) -> bool:
    if not path.exists():
        return False
    if ttl_seconds < 0:
        return True
    return time() - path.stat().st_mtime <= ttl_seconds


def _download_image(url: str, timeout_seconds: float) -> bytes:
    request = Request(
        url,
        headers={
            "User-Agent": "Astrofoto Mission Control/0.1 (+homelab image cache)",
            "Accept": IMAGE_MEDIA_TYPE,
        },
    )
    with urlopen(request, timeout=timeout_seconds) as response:
        return response.read()


def _write_cache_file(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(".tmp")
    temp_path.write_bytes(content)
    temp_path.replace(path)
