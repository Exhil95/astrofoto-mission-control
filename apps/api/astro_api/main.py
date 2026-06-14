from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from .forecast import get_sky_forecast
from .profiles import create_profile, delete_profile, list_profiles, update_profile
from .schemas import (
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
)
from .services import TARGETS, calculate_fov, plan_session
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
def targets() -> list[dict[str, str | float]]:
    return TARGETS


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


@app.post("/api/forecast/sky", response_model=SkyForecastResponse)
def sky_forecast(payload: SkyForecastRequest) -> SkyForecastResponse:
    return get_sky_forecast(payload)
