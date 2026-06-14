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
    name: str
    type: str
    season: str
    magnitude: float


class SessionPlanRequest(BaseModel):
    target_id: str
    date: Date | None = None
    latitude_deg: float = Field(default=50.2649, ge=-90, le=90)
    longitude_deg: float = Field(default=19.0238, ge=-180, le=180)
    timezone: str = Field(default="Europe/Warsaw", min_length=1, max_length=64)
    bortle: int = Field(default=4, ge=1, le=9)


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
    condition_score: int = Field(ge=0, le=100)
    recommendation: str
    slots: list[TimelineSlot]
    altitude_curve: list[AltitudePoint]


class SkyForecastRequest(BaseModel):
    date: Date | None = None
    latitude_deg: float = Field(default=50.2649, ge=-90, le=90)
    longitude_deg: float = Field(default=19.0238, ge=-180, le=180)
    timezone: str = Field(default="Europe/Warsaw", min_length=1, max_length=64)


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
