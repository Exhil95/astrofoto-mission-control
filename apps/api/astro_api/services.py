from . import multi_session_planning as _multi_session_planning
from . import session_planning as _session_planning
from . import tonight_board as _tonight_board
from .capture_planning import build_capture_plan as _build_capture_plan
from .forecast import get_sky_forecast
from .fov_service import calculate_fov as _calculate_fov
from .multi_session_planning import plan_multi_session as _plan_multi_session
from .processing_planning import build_processing_plan as _build_processing_plan
from .schemas import (
    CapturePlanRequest,
    CapturePlanResponse,
    FovRequest,
    FovResponse,
    MultiSessionPlanRequest,
    MultiSessionPlanResponse,
    ProcessingPlanRequest,
    ProcessingPlanResponse,
    SessionPlanRequest,
    SessionPlanResponse,
    TonightBoardRequest,
    TonightBoardResponse,
)
from .tonight_board import rank_tonight_targets as _rank_tonight_targets

MULTI_SESSION_FORECAST_BUDGET_SECONDS = _multi_session_planning.MULTI_SESSION_FORECAST_BUDGET_SECONDS


def _sync_testable_dependencies() -> None:
    _session_planning.get_sky_forecast = get_sky_forecast
    _tonight_board.get_sky_forecast = get_sky_forecast
    _multi_session_planning.get_sky_forecast = get_sky_forecast
    _multi_session_planning.MULTI_SESSION_FORECAST_BUDGET_SECONDS = MULTI_SESSION_FORECAST_BUDGET_SECONDS


def calculate_fov(payload: FovRequest) -> FovResponse:
    return _calculate_fov(payload)


def plan_session(payload: SessionPlanRequest) -> SessionPlanResponse:
    _sync_testable_dependencies()
    return _session_planning.plan_session(payload)


def build_capture_plan(payload: CapturePlanRequest) -> CapturePlanResponse:
    _sync_testable_dependencies()
    return _build_capture_plan(payload)


def build_processing_plan(payload: ProcessingPlanRequest) -> ProcessingPlanResponse:
    return _build_processing_plan(payload)


def rank_tonight_targets(payload: TonightBoardRequest) -> TonightBoardResponse:
    _sync_testable_dependencies()
    return _rank_tonight_targets(payload)


def plan_multi_session(payload: MultiSessionPlanRequest) -> MultiSessionPlanResponse:
    _sync_testable_dependencies()
    return _plan_multi_session(payload)
