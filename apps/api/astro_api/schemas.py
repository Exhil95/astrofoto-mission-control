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

