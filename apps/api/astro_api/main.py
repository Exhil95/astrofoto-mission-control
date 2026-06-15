from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from .catalog import TARGETS
from .forecast import get_sky_forecast
from .image_cache import (
    TargetImageNotFoundError,
    TargetImageUnavailableError,
    get_cached_target_image,
)
from .profiles import create_profile, delete_profile, list_profiles, update_profile
from .schemas import (
    CapturePlanRequest,
    CapturePlanResponse,
    FovRequest,
    FovResponse,
    ProfileCreate,
    ProfileResponse,
    ProfileUpdate,
    SessionPlanRequest,
    SessionPlanResponse,
    SkyForecastRequest,
    SkyForecastResponse,
    TargetResponse,
    TonightBoardRequest,
    TonightBoardResponse,
)
from .services import build_capture_plan, calculate_fov, plan_session, rank_tonight_targets
from .settings import get_settings

settings = get_settings()

app = FastAPI(title="Astrofoto Mission Control API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/fov", response_model=FovResponse)
def fov(payload: FovRequest) -> FovResponse:
    return calculate_fov(payload)


@app.get("/api/targets", response_model=list[TargetResponse])
def targets() -> list[dict[str, object]]:
    return TARGETS


@app.get("/api/targets/{target_id}/image")
def target_image(target_id: str) -> Response:
    try:
        image = get_cached_target_image(target_id)
    except TargetImageNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Target not found") from exc
    except TargetImageUnavailableError as exc:
        raise HTTPException(status_code=502, detail="Target image unavailable") from exc

    return Response(
        content=image.content,
        media_type=image.media_type,
        headers={
            "Cache-Control": f"public, max-age={settings.target_image_cache_ttl_seconds}",
            "X-Image-Cache": image.cache_status,
        },
    )


@app.get("/api/profiles", response_model=list[ProfileResponse])
def profiles() -> list[ProfileResponse]:
    return list_profiles()


@app.post("/api/profiles", response_model=ProfileResponse)
def profile_create(payload: ProfileCreate) -> ProfileResponse:
    return create_profile(payload)


@app.put("/api/profiles/{profile_id}", response_model=ProfileResponse)
def profile_update(profile_id: int, payload: ProfileUpdate) -> ProfileResponse:
    profile = update_profile(profile_id, payload)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.delete("/api/profiles/{profile_id}", status_code=204)
def profile_delete(profile_id: int) -> Response:
    if not delete_profile(profile_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    return Response(status_code=204)


@app.post("/api/session/plan", response_model=SessionPlanResponse)
def session_plan(payload: SessionPlanRequest) -> SessionPlanResponse:
    return plan_session(payload)


@app.post("/api/session/capture-plan", response_model=CapturePlanResponse)
def capture_plan(payload: CapturePlanRequest) -> CapturePlanResponse:
    return build_capture_plan(payload)


@app.post("/api/session/tonight-board", response_model=TonightBoardResponse)
def tonight_board(payload: TonightBoardRequest) -> TonightBoardResponse:
    return rank_tonight_targets(payload)


@app.post("/api/forecast/sky", response_model=SkyForecastResponse)
def sky_forecast(payload: SkyForecastRequest) -> SkyForecastResponse:
    return get_sky_forecast(payload)
