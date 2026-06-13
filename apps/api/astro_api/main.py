from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import FovRequest, FovResponse, SessionPlanRequest, SessionPlanResponse, TargetResponse
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


@app.post("/api/session/plan", response_model=SessionPlanResponse)
def session_plan(payload: SessionPlanRequest) -> SessionPlanResponse:
    return plan_session(payload)
