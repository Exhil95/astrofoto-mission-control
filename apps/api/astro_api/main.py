from fastapi import FastAPI, Header, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

from .auth import (
    AuthEmailExistsError,
    AuthInvalidCredentialsError,
    AuthInvalidTokenError,
    extract_bearer_token,
    get_user_for_token,
    login_user,
    register_user,
    revoke_token,
)
from .catalog import TARGETS
from .forecast import get_sky_forecast
from .fits_ingest import FitsIngestError, build_calibration_library, scan_fits_metadata
from .image_cache import (
    TargetImageNotFoundError,
    TargetImageUnavailableError,
    get_cached_target_image,
)
from .profiles import create_profile, delete_profile, list_profiles, update_profile
from .schemas import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthSessionResponse,
    AuthUserResponse,
    CalibrationLibraryRequest,
    CalibrationLibraryResponse,
    CapturePlanRequest,
    CapturePlanResponse,
    FitsScanRequest,
    FitsScanResponse,
    FovRequest,
    FovResponse,
    MultiSessionPlanRequest,
    MultiSessionPlanResponse,
    ProcessingPlanRequest,
    ProcessingPlanResponse,
    ProfileCreate,
    ProfileResponse,
    ProfileUpdate,
    SessionArchiveCreate,
    SessionArchiveResponse,
    SessionArchiveUpdate,
    SessionPlanRequest,
    SessionPlanResponse,
    SkyForecastRequest,
    SkyForecastResponse,
    TargetResponse,
    TonightBoardRequest,
    TonightBoardResponse,
)
from .session_archive import (
    create_session_archive,
    delete_session_archive,
    list_session_archives,
    update_session_archive,
)
from .services import (
    build_capture_plan,
    build_processing_plan,
    calculate_fov,
    plan_multi_session,
    plan_session,
    rank_tonight_targets,
)
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


@app.post("/api/auth/register", response_model=AuthSessionResponse)
def auth_register(payload: AuthRegisterRequest) -> AuthSessionResponse:
    try:
        return register_user(payload)
    except AuthEmailExistsError as exc:
        raise HTTPException(status_code=409, detail="Email already registered") from exc


@app.post("/api/auth/login", response_model=AuthSessionResponse)
def auth_login(payload: AuthLoginRequest) -> AuthSessionResponse:
    try:
        return login_user(payload)
    except AuthInvalidCredentialsError as exc:
        raise HTTPException(status_code=401, detail="Invalid email or password") from exc


@app.get("/api/auth/me", response_model=AuthUserResponse)
def auth_me(authorization: str | None = Header(default=None)) -> AuthUserResponse:
    try:
        token = extract_bearer_token(authorization)
        return get_user_for_token(token)
    except AuthInvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


@app.post("/api/auth/logout", status_code=204)
def auth_logout(authorization: str | None = Header(default=None)) -> Response:
    try:
        token = extract_bearer_token(authorization)
    except AuthInvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    revoke_token(token)
    return Response(status_code=204)


def require_auth_user(authorization: str | None) -> AuthUserResponse:
    try:
        token = extract_bearer_token(authorization)
        return get_user_for_token(token)
    except AuthInvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


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
def profiles(authorization: str | None = Header(default=None)) -> list[ProfileResponse]:
    user = require_auth_user(authorization)
    return list_profiles(owner_user_id=user.id)


@app.post("/api/profiles", response_model=ProfileResponse)
def profile_create(
    payload: ProfileCreate, authorization: str | None = Header(default=None)
) -> ProfileResponse:
    user = require_auth_user(authorization)
    return create_profile(payload, owner_user_id=user.id)


@app.put("/api/profiles/{profile_id}", response_model=ProfileResponse)
def profile_update(
    profile_id: int, payload: ProfileUpdate, authorization: str | None = Header(default=None)
) -> ProfileResponse:
    user = require_auth_user(authorization)
    profile = update_profile(profile_id, payload, owner_user_id=user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.delete("/api/profiles/{profile_id}", status_code=204)
def profile_delete(profile_id: int, authorization: str | None = Header(default=None)) -> Response:
    user = require_auth_user(authorization)
    if not delete_profile(profile_id, owner_user_id=user.id):
        raise HTTPException(status_code=404, detail="Profile not found")
    return Response(status_code=204)


@app.post("/api/session/plan", response_model=SessionPlanResponse)
def session_plan(payload: SessionPlanRequest) -> SessionPlanResponse:
    return plan_session(payload)


@app.post("/api/session/capture-plan", response_model=CapturePlanResponse)
def capture_plan(payload: CapturePlanRequest) -> CapturePlanResponse:
    return build_capture_plan(payload)


@app.post("/api/session/processing-plan", response_model=ProcessingPlanResponse)
def processing_plan(payload: ProcessingPlanRequest) -> ProcessingPlanResponse:
    return build_processing_plan(payload)


@app.post("/api/frames/fits-scan", response_model=FitsScanResponse)
def fits_scan(payload: FitsScanRequest) -> FitsScanResponse:
    try:
        return scan_fits_metadata(payload)
    except FitsIngestError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/frames/calibration-library", response_model=CalibrationLibraryResponse)
def calibration_library(payload: CalibrationLibraryRequest) -> CalibrationLibraryResponse:
    try:
        return build_calibration_library(payload)
    except FitsIngestError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/session/tonight-board", response_model=TonightBoardResponse)
def tonight_board(payload: TonightBoardRequest) -> TonightBoardResponse:
    return rank_tonight_targets(payload)


@app.post("/api/session/multi-session-plan", response_model=MultiSessionPlanResponse)
def multi_session_plan(payload: MultiSessionPlanRequest) -> MultiSessionPlanResponse:
    return plan_multi_session(payload)


@app.get("/api/session/archive", response_model=list[SessionArchiveResponse])
def session_archive_list(
    limit: int = Query(default=12, ge=1, le=50),
    authorization: str | None = Header(default=None),
) -> list[SessionArchiveResponse]:
    user = require_auth_user(authorization)
    return list_session_archives(limit=limit, owner_user_id=user.id)


@app.post("/api/session/archive", response_model=SessionArchiveResponse)
def session_archive_create(
    payload: SessionArchiveCreate, authorization: str | None = Header(default=None)
) -> SessionArchiveResponse:
    user = require_auth_user(authorization)
    return create_session_archive(payload, owner_user_id=user.id)


@app.put("/api/session/archive/{archive_id}", response_model=SessionArchiveResponse)
def session_archive_update(
    archive_id: int,
    payload: SessionArchiveUpdate,
    authorization: str | None = Header(default=None),
) -> SessionArchiveResponse:
    user = require_auth_user(authorization)
    archive = update_session_archive(archive_id, payload, owner_user_id=user.id)
    if archive is None:
        raise HTTPException(status_code=404, detail="Session archive not found")
    return archive


@app.delete("/api/session/archive/{archive_id}", status_code=204)
def session_archive_delete(
    archive_id: int, authorization: str | None = Header(default=None)
) -> Response:
    user = require_auth_user(authorization)
    if not delete_session_archive(archive_id, owner_user_id=user.id):
        raise HTTPException(status_code=404, detail="Session archive not found")
    return Response(status_code=204)


@app.post("/api/forecast/sky", response_model=SkyForecastResponse)
def sky_forecast(payload: SkyForecastRequest) -> SkyForecastResponse:
    return get_sky_forecast(payload)
