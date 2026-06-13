from math import atan, degrees, hypot

from .schemas import FovRequest, FovResponse


TARGETS = [
    {"id": "m42", "name": "Orion Nebula", "type": "Emission nebula", "season": "Winter", "magnitude": 4.0},
    {"id": "m31", "name": "Andromeda", "type": "Galaxy", "season": "Autumn", "magnitude": 3.4},
    {"id": "ngc7000", "name": "North America", "type": "Emission nebula", "season": "Summer", "magnitude": 4.0},
    {"id": "m45", "name": "Pleiades", "type": "Reflection nebula", "season": "Winter", "magnitude": 1.6},
    {"id": "ic1396", "name": "Elephant Trunk", "type": "Dark nebula", "season": "Autumn", "magnitude": 3.5},
]


def calculate_fov(payload: FovRequest) -> FovResponse:
    effective_focal_length_mm = payload.focal_length_mm * payload.reducer
    horizontal_deg = degrees(2 * atan(payload.sensor_width_mm / (2 * effective_focal_length_mm)))
    vertical_deg = degrees(2 * atan(payload.sensor_height_mm / (2 * effective_focal_length_mm)))
    diagonal_mm = hypot(payload.sensor_width_mm, payload.sensor_height_mm)
    diagonal_deg = degrees(2 * atan(diagonal_mm / (2 * effective_focal_length_mm)))
    pixel_scale_arcsec = (206.265 * payload.pixel_size_um) / effective_focal_length_mm

    return FovResponse(
        effective_focal_length_mm=effective_focal_length_mm,
        horizontal_deg=horizontal_deg,
        vertical_deg=vertical_deg,
        diagonal_deg=diagonal_deg,
        pixel_scale_arcsec=pixel_scale_arcsec,
    )

