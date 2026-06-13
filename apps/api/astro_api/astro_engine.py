from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import astropy.units as u
from astropy.coordinates import AltAz, EarthLocation, SkyCoord, get_sun
from astropy.time import Time
from astropy.utils import iers

iers.conf.auto_download = False


@dataclass(frozen=True)
class TargetProfile:
    ra_hours: float
    dec_deg: float


@dataclass(frozen=True)
class AstroEvent:
    time: str
    label: str
    value: str
    kind: str


@dataclass(frozen=True)
class AltitudeSample:
    time: str
    target_altitude_deg: float
    sun_altitude_deg: float
    darkness: str


@dataclass(frozen=True)
class AstroPlan:
    night_kind: str
    night_kind_label: str
    white_night: bool
    min_sun_altitude_deg: float
    civil_darkness_minutes: int
    nautical_darkness_minutes: int
    astronomical_darkness_minutes: int
    max_altitude_deg: int
    meridian_time: str
    best_start_time: str
    best_end_time: str
    events: list[AstroEvent]
    altitude_curve: list[AltitudeSample]


def build_astro_plan(
    session_date: date,
    latitude_deg: float,
    longitude_deg: float,
    timezone_name: str,
    target: TargetProfile,
) -> AstroPlan:
    timezone = _load_timezone(timezone_name)
    local_datetimes = _sample_local_night(session_date, timezone)
    times = Time(local_datetimes)
    location = EarthLocation(lat=latitude_deg * u.deg, lon=longitude_deg * u.deg)
    frame = AltAz(obstime=times, location=location)

    sun_altitudes = get_sun(times).transform_to(frame).alt.degree
    target_coord = SkyCoord(ra=target.ra_hours * u.hourangle, dec=target.dec_deg * u.deg)
    target_altitudes = target_coord.transform_to(frame).alt.degree

    civil_window = _threshold_window(local_datetimes, sun_altitudes, -6)
    nautical_window = _threshold_window(local_datetimes, sun_altitudes, -12)
    astronomical_window = _threshold_window(local_datetimes, sun_altitudes, -18)
    usable_threshold = _primary_darkness_threshold(
        astronomical_window["minutes"],
        nautical_window["minutes"],
        civil_window["minutes"],
    )
    max_index = _best_altitude_index(target_altitudes, sun_altitudes, usable_threshold)
    max_altitude_deg = round(float(target_altitudes[max_index]))
    peak_time = _format_time(local_datetimes[max_index])
    min_sun_altitude_deg = round(float(min(sun_altitudes)), 1)

    darkness_minutes = {
        "civil": civil_window["minutes"],
        "nautical": nautical_window["minutes"],
        "astronomical": astronomical_window["minutes"],
    }
    night_kind, night_kind_label = _classify_night(darkness_minutes)
    white_night = darkness_minutes["astronomical"] == 0
    best_start_time, best_end_time = _best_window(
        local_datetimes,
        target_altitudes,
        sun_altitudes,
        astronomical_window,
        nautical_window,
    )

    return AstroPlan(
        night_kind=night_kind,
        night_kind_label=night_kind_label,
        white_night=white_night,
        min_sun_altitude_deg=min_sun_altitude_deg,
        civil_darkness_minutes=darkness_minutes["civil"],
        nautical_darkness_minutes=darkness_minutes["nautical"],
        astronomical_darkness_minutes=darkness_minutes["astronomical"],
        max_altitude_deg=max_altitude_deg,
        meridian_time=peak_time,
        best_start_time=best_start_time,
        best_end_time=best_end_time,
        events=_build_events(civil_window, nautical_window, astronomical_window, peak_time, max_altitude_deg),
        altitude_curve=_build_altitude_curve(local_datetimes, target_altitudes, sun_altitudes),
    )


def _load_timezone(timezone_name: str) -> ZoneInfo:
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _sample_local_night(session_date: date, timezone: ZoneInfo) -> list[datetime]:
    start = datetime.combine(session_date, time(12, 0), tzinfo=timezone)
    return [start + timedelta(minutes=5 * index) for index in range(0, 289)]


def _threshold_window(
    local_datetimes: list[datetime],
    altitudes: list[float],
    threshold_deg: float,
) -> dict[str, datetime | int | None]:
    minutes = 0.0
    downward: datetime | None = None
    upward: datetime | None = None

    for index in range(len(altitudes) - 1):
        start_altitude = float(altitudes[index])
        end_altitude = float(altitudes[index + 1])
        start_time = local_datetimes[index]
        end_time = local_datetimes[index + 1]
        interval_minutes = (end_time - start_time).total_seconds() / 60

        if start_altitude <= threshold_deg and end_altitude <= threshold_deg:
            minutes += interval_minutes
            continue

        if start_altitude > threshold_deg and end_altitude > threshold_deg:
            continue

        fraction = _crossing_fraction(start_altitude, end_altitude, threshold_deg)
        crossing_time = start_time + timedelta(minutes=interval_minutes * fraction)

        if start_altitude > threshold_deg >= end_altitude:
            downward = crossing_time
            minutes += interval_minutes * (1 - fraction)
        elif start_altitude <= threshold_deg < end_altitude:
            upward = crossing_time
            minutes += interval_minutes * fraction

    if minutes >= 23.9 * 60:
        downward = local_datetimes[0]
        upward = local_datetimes[-1]

    return {
        "start": downward,
        "end": upward,
        "minutes": round(minutes),
    }


def _crossing_fraction(start_altitude: float, end_altitude: float, threshold_deg: float) -> float:
    if start_altitude == end_altitude:
        return 0
    return max(0, min(1, (threshold_deg - start_altitude) / (end_altitude - start_altitude)))


def _classify_night(darkness_minutes: dict[str, int]) -> tuple[str, str]:
    if darkness_minutes["astronomical"] >= 60:
        return "astronomical", "Astronomical night"
    if darkness_minutes["astronomical"] > 0:
        return "short_astro", "Short astro night"
    if darkness_minutes["nautical"] >= 90:
        return "nautical", "Nautical only"
    if darkness_minutes["civil"] >= 90:
        return "bright", "Bright night"
    return "white", "White night"


def _best_window(
    local_datetimes: list[datetime],
    target_altitudes: list[float],
    sun_altitudes: list[float],
    astronomical_window: dict[str, datetime | int | None],
    nautical_window: dict[str, datetime | int | None],
) -> tuple[str, str]:
    threshold = -18 if astronomical_window["minutes"] else -12
    candidates = [
        local_time
        for local_time, target_altitude, sun_altitude in zip(local_datetimes, target_altitudes, sun_altitudes)
        if target_altitude >= 20 and sun_altitude <= threshold
    ]

    if candidates:
        return _format_time(candidates[0]), _format_time(candidates[-1])

    fallback = astronomical_window if astronomical_window["minutes"] else nautical_window
    if fallback["start"] and fallback["end"]:
        return _format_time(fallback["start"]), _format_time(fallback["end"])

    max_index = max(range(len(target_altitudes)), key=lambda index: target_altitudes[index])
    peak_time = local_datetimes[max_index]
    return _format_time(peak_time - timedelta(minutes=45)), _format_time(peak_time + timedelta(minutes=45))


def _primary_darkness_threshold(
    astronomical_minutes: int | datetime | None,
    nautical_minutes: int | datetime | None,
    civil_minutes: int | datetime | None,
) -> float:
    if astronomical_minutes:
        return -18
    if nautical_minutes:
        return -12
    if civil_minutes:
        return -6
    return 90


def _best_altitude_index(
    target_altitudes: list[float],
    sun_altitudes: list[float],
    usable_threshold: float,
) -> int:
    candidates = [
        index
        for index, sun_altitude in enumerate(sun_altitudes)
        if sun_altitude <= usable_threshold
    ]
    if not candidates:
        candidates = list(range(len(target_altitudes)))
    return max(candidates, key=lambda index: target_altitudes[index])


def _build_events(
    civil_window: dict[str, datetime | int | None],
    nautical_window: dict[str, datetime | int | None],
    astronomical_window: dict[str, datetime | int | None],
    meridian_time: str,
    max_altitude_deg: int,
) -> list[AstroEvent]:
    events: list[AstroEvent] = []
    _append_window_event(events, astronomical_window, "Astro dark", "astro")
    _append_window_event(events, nautical_window, "Nautical", "nautical")
    _append_window_event(events, civil_window, "Civil", "civil")
    events.append(AstroEvent(time=meridian_time, label="Peak", value=f"{max_altitude_deg} deg", kind="target"))
    return sorted(events, key=lambda event: _event_sort_key(event.time))[:6]


def _append_window_event(
    events: list[AstroEvent],
    window: dict[str, datetime | int | None],
    label: str,
    kind: str,
) -> None:
    if window["start"]:
        events.append(AstroEvent(time=_format_time(window["start"]), label=f"{label} start", value="Sun down", kind=kind))
    if window["end"]:
        events.append(AstroEvent(time=_format_time(window["end"]), label=f"{label} end", value="Sun up", kind=kind))


def _build_altitude_curve(
    local_datetimes: list[datetime],
    target_altitudes: list[float],
    sun_altitudes: list[float],
) -> list[AltitudeSample]:
    samples: list[AltitudeSample] = []
    for index in range(0, len(local_datetimes), 6):
        sun_altitude = round(float(sun_altitudes[index]), 1)
        samples.append(
            AltitudeSample(
                time=_format_time(local_datetimes[index]),
                target_altitude_deg=round(float(target_altitudes[index]), 1),
                sun_altitude_deg=sun_altitude,
                darkness=_darkness_label(sun_altitude),
            )
        )
    return samples


def _darkness_label(sun_altitude_deg: float) -> str:
    if sun_altitude_deg <= -18:
        return "astronomical"
    if sun_altitude_deg <= -12:
        return "nautical"
    if sun_altitude_deg <= -6:
        return "civil"
    return "daylight"


def _format_time(value: datetime) -> str:
    return value.strftime("%H:%M")


def _event_sort_key(value: str) -> int:
    hours, minutes = [int(part) for part in value.split(":")]
    total = hours * 60 + minutes
    return total if hours >= 12 else total + 24 * 60
