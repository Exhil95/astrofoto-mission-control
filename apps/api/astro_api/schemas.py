from datetime import date as Date

from pydantic import BaseModel, Field


class FovRequest(BaseModel):
    focal_length_mm: float = Field(gt=0)
    reducer: float = Field(default=1, gt=0)
    sensor_width_mm: float = Field(gt=0)
    sensor_height_mm: float = Field(gt=0)
    pixel_size_um: float = Field(gt=0)


class FovResponse(BaseModel):
    effective_focal_length_mm: float
    horizontal_deg: float
    vertical_deg: float
    diagonal_deg: float
    pixel_scale_arcsec: float


class TargetResponse(BaseModel):
    id: str
    catalog_id: str
    name: str
    type: str
    constellation: str
    season: str
    magnitude: float
    angular_width_arcmin: float
    angular_height_arcmin: float
    best_months: str
    difficulty: str
    framing: str
    exposure_hint: str
    ra_hours: float = Field(ge=0, lt=24)
    dec_deg: float = Field(ge=-90, le=90)
    position: tuple[float, float, float]
    tint: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    image_url: str | None = None
    image_credit: str | None = None
    image_source_url: str | None = None


class ProfileBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    site_name: str = Field(min_length=1, max_length=80)
    latitude_deg: float = Field(ge=-90, le=90)
    longitude_deg: float = Field(ge=-180, le=180)
    timezone: str = Field(min_length=1, max_length=64)
    bortle: int = Field(ge=1, le=9)
    telescope_name: str = Field(min_length=1, max_length=80)
    telescope_type: str = Field(default="Refractor", min_length=1, max_length=80)
    aperture_mm: float = Field(default=80, gt=0, le=1500)
    focal_length_mm: float = Field(gt=0, le=5000)
    reducer_name: str = Field(default="None", min_length=1, max_length=80)
    reducer: float = Field(gt=0, le=3)
    camera_name: str = Field(default="Dedicated astro camera", min_length=1, max_length=80)
    sensor_id: str = Field(min_length=1, max_length=48)
    sensor_name: str = Field(min_length=1, max_length=80)
    sensor_width_mm: float = Field(gt=0, le=80)
    sensor_height_mm: float = Field(gt=0, le=80)
    pixel_size_um: float = Field(gt=0, le=20)
    filter_set: str = Field(default="LRGB + Ha/OIII/SII", min_length=1, max_length=120)
    filter_wheel: str = Field(default="Manual drawer", min_length=1, max_length=80)
    guiding_setup: str = Field(default="50mm guide scope", min_length=1, max_length=100)
    guide_camera_name: str = Field(default="ASI120MM class", min_length=1, max_length=80)
    focuser_name: str = Field(default="Manual focuser", min_length=1, max_length=80)
    mount_name: str = Field(default="Equatorial mount", min_length=1, max_length=80)


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(ProfileBase):
    id: int
    updated_at: str


class SessionPlanRequest(BaseModel):
    target_id: str
    date: Date | None = None
    latitude_deg: float = Field(default=50.2649, ge=-90, le=90)
    longitude_deg: float = Field(default=19.0238, ge=-180, le=180)
    timezone: str = Field(default="Europe/Warsaw", min_length=1, max_length=64)
    bortle: int = Field(default=4, ge=1, le=9)
    forecast_cache_ttl_minutes: int | None = Field(default=None, ge=15, le=60)
    force_forecast_refresh: bool = False


class CapturePlanRequest(BaseModel):
    target_id: str
    date: Date | None = None
    latitude_deg: float = Field(default=50.2649, ge=-90, le=90)
    longitude_deg: float = Field(default=19.0238, ge=-180, le=180)
    timezone: str = Field(default="Europe/Warsaw", min_length=1, max_length=64)
    bortle: int = Field(default=4, ge=1, le=9)
    fov_horizontal_deg: float = Field(gt=0, le=60)
    fov_vertical_deg: float = Field(gt=0, le=60)
    pixel_scale_arcsec: float = Field(gt=0, le=20)
    forecast_cache_ttl_minutes: int | None = Field(default=None, ge=15, le=60)
    force_forecast_refresh: bool = False


class TonightBoardRequest(BaseModel):
    date: Date | None = None
    latitude_deg: float = Field(default=50.2649, ge=-90, le=90)
    longitude_deg: float = Field(default=19.0238, ge=-180, le=180)
    timezone: str = Field(default="Europe/Warsaw", min_length=1, max_length=64)
    bortle: int = Field(default=4, ge=1, le=9)
    fov_horizontal_deg: float = Field(gt=0, le=60)
    fov_vertical_deg: float = Field(gt=0, le=60)
    limit: int = Field(default=5, ge=1, le=12)
    forecast_cache_ttl_minutes: int | None = Field(default=None, ge=15, le=60)
    force_forecast_refresh: bool = False


class TimelineSlot(BaseModel):
    time: str
    label: str
    value: str
    intensity: float = Field(ge=0, le=1)
    kind: str = "target"


class AltitudePoint(BaseModel):
    time: str
    target_altitude_deg: float
    sun_altitude_deg: float
    darkness: str


class SessionPlanResponse(BaseModel):
    target_id: str
    target_name: str
    night_label: str
    night_kind: str
    night_kind_label: str
    start_time: str
    end_time: str
    white_night: bool
    min_sun_altitude_deg: float
    civil_darkness_minutes: int
    nautical_darkness_minutes: int
    astronomical_darkness_minutes: int
    moon_illumination_percent: int
    max_altitude_deg: int
    transparency_percent: int
    seeing_arcsec: float
    astronomy_score: int = Field(ge=0, le=100)
    weather_score: int = Field(ge=0, le=100)
    weather_status: str
    weather_summary: str
    recommended_mode: str
    condition_score: int = Field(ge=0, le=100)
    recommendation: str
    slots: list[TimelineSlot]
    altitude_curve: list[AltitudePoint]


class CaptureExposureStep(BaseModel):
    filter_name: str
    exposure_seconds: int
    frames: int
    integration_minutes: int
    binning: str
    gain: str
    note: str


class CaptureCalibrationStep(BaseModel):
    frame_type: str
    frames: int
    exposure: str
    note: str


class CapturePlanResponse(BaseModel):
    target_id: str
    target_name: str
    date: str
    window_start: str
    window_end: str
    imaging_mode: str
    total_integration_minutes: int
    guiding: str
    dithering_every_frames: int
    autofocus_every_minutes: int
    meridian_action: str
    framing_note: str
    moon_warning: str
    weather_note: str
    exposure_steps: list[CaptureExposureStep]
    calibration_frames: list[CaptureCalibrationStep]
    checklist: list[str]
    export_markdown: str


class ProcessingPlanRequest(BaseModel):
    target_id: str
    bortle: int = Field(default=4, ge=1, le=9)
    moon_illumination_percent: int = Field(default=0, ge=0, le=100)
    white_night: bool = False
    weather_score: int = Field(default=72, ge=0, le=100)
    fov_horizontal_deg: float = Field(gt=0, le=60)
    fov_vertical_deg: float = Field(gt=0, le=60)
    pixel_scale_arcsec: float = Field(gt=0, le=20)
    total_integration_minutes: int = Field(ge=0, le=100000)
    filter_names: list[str] = Field(default_factory=list, max_length=16)
    planned_frames: int = Field(default=0, ge=0, le=100000)


class ProcessingCalibrationMatch(BaseModel):
    frame_type: str
    recommendation: str
    priority: str


class ProcessingWorkflowStep(BaseModel):
    label: str
    action: str
    reason: str


class ProcessingPlanResponse(BaseModel):
    target_id: str
    target_name: str
    integration_class: str
    stack_strategy: str
    calibration_strategy: str
    drizzle: str
    binning: str
    normalization: str
    gradient_risk: str
    gradient_score: int = Field(ge=0, le=100)
    noise_reduction: str
    color_strategy: str
    rejection: str
    calibration_matches: list[ProcessingCalibrationMatch]
    workflow: list[ProcessingWorkflowStep]
    warnings: list[str]


class FitsScanRequest(BaseModel):
    path: str = Field(default=".", min_length=1, max_length=500)
    recursive: bool = True
    max_files: int = Field(default=250, ge=1, le=2000)


class FitsFrameMetadata(BaseModel):
    file_name: str
    relative_path: str
    frame_type: str
    filter_name: str | None = None
    exposure_seconds: float | None = None
    gain: float | None = None
    offset: float | None = None
    sensor_temperature_c: float | None = None
    binning: str | None = None
    object_name: str | None = None
    date_obs: str | None = None
    camera: str | None = None
    telescope: str | None = None
    width_px: int | None = None
    height_px: int | None = None
    size_mb: float
    status: str
    warnings: list[str]


class FitsGroupSummary(BaseModel):
    label: str
    frame_type: str
    filter_name: str | None = None
    frames: int
    total_exposure_seconds: float
    exposure_seconds: list[float]
    temperature_range_c: str | None = None


class FitsScanResponse(BaseModel):
    scan_path: str
    total_files: int
    parsed_files: int
    rejected_files: int
    total_light_seconds: float
    filters: list[str]
    frame_types: list[str]
    objects: list[str]
    cameras: list[str]
    exposure_range_seconds: str | None = None
    temperature_range_c: str | None = None
    groups: list[FitsGroupSummary]
    frames: list[FitsFrameMetadata]
    warnings: list[str]


class TonightBoardItem(BaseModel):
    target_id: str
    target_name: str
    catalog_id: str
    target_type: str
    constellation: str
    score: int = Field(ge=0, le=100)
    astronomy_score: int = Field(ge=0, le=100)
    weather_score: int = Field(ge=0, le=100)
    fov_score: int = Field(ge=0, le=100)
    fov_fit: str
    start_time: str
    end_time: str
    best_time: str
    max_altitude_deg: int
    recommended_mode: str
    reason: str


class TonightBoardResponse(BaseModel):
    date: str
    summary: str
    weather_status: str
    weather_score: int = Field(ge=0, le=100)
    moon_illumination_percent: int
    white_night: bool
    items: list[TonightBoardItem]


class SessionArchiveBase(BaseModel):
    target_id: str = Field(min_length=1, max_length=80)
    target_name: str = Field(min_length=1, max_length=120)
    session_date: Date
    status: str = Field(default="planned", pattern=r"^(planned|captured|processed|skipped)$")
    profile_id: int | None = Field(default=None, ge=1)
    profile_name: str | None = Field(default=None, max_length=80)
    site_name: str = Field(min_length=1, max_length=80)
    bortle: int = Field(ge=1, le=9)
    fov_horizontal_deg: float = Field(gt=0, le=60)
    fov_vertical_deg: float = Field(gt=0, le=60)
    pixel_scale_arcsec: float = Field(gt=0, le=20)
    imaging_mode: str = Field(min_length=1, max_length=80)
    filter_names: list[str] = Field(default_factory=list, max_length=16)
    total_integration_minutes: int = Field(ge=0, le=100000)
    planned_frames: int = Field(default=0, ge=0, le=100000)
    captured_frames: int = Field(default=0, ge=0, le=100000)
    window_start: str = Field(min_length=1, max_length=16)
    window_end: str = Field(min_length=1, max_length=16)
    weather_status: str = Field(min_length=1, max_length=24)
    weather_score: int = Field(ge=0, le=100)
    moon_illumination_percent: int = Field(ge=0, le=100)
    white_night: bool
    notes: str = Field(default="", max_length=1600)
    capture_markdown: str = Field(default="", max_length=20000)


class SessionArchiveCreate(SessionArchiveBase):
    pass


class SessionArchiveUpdate(SessionArchiveBase):
    pass


class SessionArchiveResponse(SessionArchiveBase):
    id: int
    created_at: str
    updated_at: str


class SkyForecastRequest(BaseModel):
    date: Date | None = None
    latitude_deg: float = Field(default=50.2649, ge=-90, le=90)
    longitude_deg: float = Field(default=19.0238, ge=-180, le=180)
    timezone: str = Field(default="Europe/Warsaw", min_length=1, max_length=64)
    cache_ttl_minutes: int | None = Field(default=None, ge=15, le=60)
    force_refresh: bool = False


class SkyForecastHour(BaseModel):
    time: str
    cloud_cover_percent: int
    cloud_low_percent: int
    cloud_mid_percent: int
    cloud_high_percent: int
    humidity_percent: int
    temperature_c: float
    dew_point_c: float
    wind_speed_kmh: float
    wind_gust_kmh: float
    visibility_km: float
    precipitation_probability_percent: int
    imaging_score: int = Field(ge=0, le=100)
    risk: str


class SkyForecastResponse(BaseModel):
    source: str
    status: str
    score: int = Field(ge=0, le=100)
    summary: str
    updated_at: str
    warnings: list[str]
    hours: list[SkyForecastHour]
