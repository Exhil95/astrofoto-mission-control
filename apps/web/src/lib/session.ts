import type { FovResult } from "./fov";
import type { Target } from "./targets";

export type SessionSlot = {
  time: string;
  label: string;
  value: string;
  intensity: number;
  kind: string;
};

export type AltitudePoint = {
  time: string;
  targetAltitudeDeg: number;
  sunAltitudeDeg: number;
  darkness: string;
};

export type SessionPlan = {
  targetId: string;
  targetName: string;
  nightLabel: string;
  nightKind: string;
  nightKindLabel: string;
  startTime: string;
  endTime: string;
  whiteNight: boolean;
  minSunAltitudeDeg: number;
  civilDarknessMinutes: number;
  nauticalDarknessMinutes: number;
  astronomicalDarknessMinutes: number;
  moonIlluminationPercent: number;
  maxAltitudeDeg: number;
  transparencyPercent: number;
  seeingArcsec: number;
  astronomyScore: number;
  weatherScore: number;
  weatherStatus: string;
  weatherSummary: string;
  recommendedMode: string;
  conditionScore: number;
  recommendation: string;
  slots: SessionSlot[];
  altitudeCurve: AltitudePoint[];
};

export type SessionSettings = {
  date: string;
  latitudeDeg: number;
  longitudeDeg: number;
  timezone: string;
  bortle: number;
};

export type TonightBoardItem = {
  targetId: string;
  targetName: string;
  catalogId: string;
  targetType: string;
  constellation: string;
  score: number;
  astronomyScore: number;
  weatherScore: number;
  fovScore: number;
  fovFit: string;
  startTime: string;
  endTime: string;
  bestTime: string;
  maxAltitudeDeg: number;
  recommendedMode: string;
  reason: string;
};

export type TonightBoard = {
  date: string;
  summary: string;
  weatherStatus: string;
  weatherScore: number;
  moonIlluminationPercent: number;
  whiteNight: boolean;
  items: TonightBoardItem[];
};

export type MultiSessionPlanItem = {
  date: string;
  targetId: string;
  targetName: string;
  catalogId: string;
  targetType: string;
  score: number;
  astronomyScore: number;
  weatherScore: number;
  fovScore: number;
  fovFit: string;
  moonIlluminationPercent: number;
  whiteNight: boolean;
  maxAltitudeDeg: number;
  startTime: string;
  endTime: string;
  bestTime: string;
  recommendedMode: string;
  reason: string;
};

export type MultiSessionNightSummary = {
  date: string;
  score: number;
  weatherStatus: string;
  weatherScore: number;
  moonIlluminationPercent: number;
  whiteNight: boolean;
  bestTargetId: string;
  bestTargetName: string;
  catalogId: string;
  targetType: string;
  fovFit: string;
  maxAltitudeDeg: number;
  startTime: string;
  endTime: string;
  bestTime: string;
  recommendedMode: string;
  reason: string;
  summary: string;
};

export type MultiSessionPlan = {
  startDate: string;
  endDate: string;
  nights: number;
  summary: string;
  items: MultiSessionPlanItem[];
  nightsSummary: MultiSessionNightSummary[];
  warnings: string[];
};

export type CaptureExposureStep = {
  filterName: string;
  exposureSeconds: number;
  frames: number;
  integrationMinutes: number;
  binning: string;
  gain: string;
  note: string;
};

export type CaptureCalibrationStep = {
  frameType: string;
  frames: number;
  exposure: string;
  note: string;
};

export type CapturePlan = {
  targetId: string;
  targetName: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  imagingMode: string;
  totalIntegrationMinutes: number;
  guiding: string;
  ditheringEveryFrames: number;
  autofocusEveryMinutes: number;
  meridianAction: string;
  framingNote: string;
  moonWarning: string;
  weatherNote: string;
  exposureSteps: CaptureExposureStep[];
  calibrationFrames: CaptureCalibrationStep[];
  checklist: string[];
  exportMarkdown: string;
};

export type ProcessingCalibrationMatch = {
  frameType: string;
  recommendation: string;
  priority: string;
};

export type ProcessingWorkflowStep = {
  label: string;
  action: string;
  reason: string;
};

export type ProcessingPlan = {
  targetId: string;
  targetName: string;
  integrationClass: string;
  stackStrategy: string;
  calibrationStrategy: string;
  drizzle: string;
  binning: string;
  normalization: string;
  gradientRisk: string;
  gradientScore: number;
  noiseReduction: string;
  colorStrategy: string;
  rejection: string;
  calibrationMatches: ProcessingCalibrationMatch[];
  workflow: ProcessingWorkflowStep[];
  warnings: string[];
};

export type SessionArchiveEntry = {
  id: number;
  targetId: string;
  targetName: string;
  sessionDate: string;
  status: "planned" | "captured" | "processed" | "skipped";
  profileId: number | null;
  profileName: string | null;
  siteName: string;
  bortle: number;
  fovHorizontalDeg: number;
  fovVerticalDeg: number;
  pixelScaleArcsec: number;
  imagingMode: string;
  filterNames: string[];
  totalIntegrationMinutes: number;
  plannedFrames: number;
  capturedFrames: number;
  windowStart: string;
  windowEnd: string;
  weatherStatus: string;
  weatherScore: number;
  moonIlluminationPercent: number;
  whiteNight: boolean;
  notes: string;
  captureMarkdown: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionArchivePayload = Omit<SessionArchiveEntry, "id" | "createdAt" | "updatedAt">;

export type WeatherFetchOptions = {
  cacheTtlMinutes?: 15 | 30 | 60;
  forceRefresh?: boolean;
};

export type FitsFrameMetadata = {
  fileName: string;
  relativePath: string;
  frameType: string;
  filterName: string | null;
  exposureSeconds: number | null;
  gain: number | null;
  offset: number | null;
  sensorTemperatureC: number | null;
  binning: string | null;
  objectName: string | null;
  dateObs: string | null;
  camera: string | null;
  telescope: string | null;
  widthPx: number | null;
  heightPx: number | null;
  sizeMb: number;
  qualityScore: number | null;
  starCount: number | null;
  fwhmPx: number | null;
  eccentricity: number | null;
  backgroundAdu: number | null;
  backgroundNoiseAdu: number | null;
  qualityFlags: string[];
  status: string;
  warnings: string[];
};

export type FitsGroupSummary = {
  label: string;
  frameType: string;
  filterName: string | null;
  frames: number;
  totalExposureSeconds: number;
  exposureSeconds: number[];
  temperatureRangeC: string | null;
};

export type FitsScanResult = {
  scanPath: string;
  totalFiles: number;
  parsedFiles: number;
  rejectedFiles: number;
  totalLightSeconds: number;
  filters: string[];
  frameTypes: string[];
  objects: string[];
  cameras: string[];
  exposureRangeSeconds: string | null;
  temperatureRangeC: string | null;
  groups: FitsGroupSummary[];
  frames: FitsFrameMetadata[];
  warnings: string[];
};

type ApiSessionPlan = {
  target_id: string;
  target_name: string;
  night_label: string;
  night_kind: string;
  night_kind_label: string;
  start_time: string;
  end_time: string;
  white_night: boolean;
  min_sun_altitude_deg: number;
  civil_darkness_minutes: number;
  nautical_darkness_minutes: number;
  astronomical_darkness_minutes: number;
  moon_illumination_percent: number;
  max_altitude_deg: number;
  transparency_percent: number;
  seeing_arcsec: number;
  astronomy_score: number;
  weather_score: number;
  weather_status: string;
  weather_summary: string;
  recommended_mode: string;
  condition_score: number;
  recommendation: string;
  slots: SessionSlot[];
  altitude_curve: {
    time: string;
    target_altitude_deg: number;
    sun_altitude_deg: number;
    darkness: string;
  }[];
};

type ApiTonightBoard = {
  date: string;
  summary: string;
  weather_status: string;
  weather_score: number;
  moon_illumination_percent: number;
  white_night: boolean;
  items: {
    target_id: string;
    target_name: string;
    catalog_id: string;
    target_type: string;
    constellation: string;
    score: number;
    astronomy_score: number;
    weather_score: number;
    fov_score: number;
    fov_fit: string;
    start_time: string;
    end_time: string;
    best_time: string;
    max_altitude_deg: number;
    recommended_mode: string;
    reason: string;
  }[];
};

type ApiMultiSessionPlan = {
  start_date: string;
  end_date: string;
  nights: number;
  summary: string;
  items: {
    date: string;
    target_id: string;
    target_name: string;
    catalog_id: string;
    target_type: string;
    score: number;
    astronomy_score: number;
    weather_score: number;
    fov_score: number;
    fov_fit: string;
    moon_illumination_percent: number;
    white_night: boolean;
    max_altitude_deg: number;
    start_time: string;
    end_time: string;
    best_time: string;
    recommended_mode: string;
    reason: string;
  }[];
  nights_summary: {
    date: string;
    score: number;
    weather_status: string;
    weather_score: number;
    moon_illumination_percent: number;
    white_night: boolean;
    best_target_id: string;
    best_target_name: string;
    catalog_id: string;
    target_type: string;
    fov_fit: string;
    max_altitude_deg: number;
    start_time: string;
    end_time: string;
    best_time: string;
    recommended_mode: string;
    reason: string;
    summary: string;
  }[];
  warnings: string[];
};

type ApiCapturePlan = {
  target_id: string;
  target_name: string;
  date: string;
  window_start: string;
  window_end: string;
  imaging_mode: string;
  total_integration_minutes: number;
  guiding: string;
  dithering_every_frames: number;
  autofocus_every_minutes: number;
  meridian_action: string;
  framing_note: string;
  moon_warning: string;
  weather_note: string;
  exposure_steps: {
    filter_name: string;
    exposure_seconds: number;
    frames: number;
    integration_minutes: number;
    binning: string;
    gain: string;
    note: string;
  }[];
  calibration_frames: {
    frame_type: string;
    frames: number;
    exposure: string;
    note: string;
  }[];
  checklist: string[];
  export_markdown: string;
};

type ApiSessionArchive = {
  id: number;
  target_id: string;
  target_name: string;
  session_date: string;
  status: "planned" | "captured" | "processed" | "skipped";
  profile_id: number | null;
  profile_name: string | null;
  site_name: string;
  bortle: number;
  fov_horizontal_deg: number;
  fov_vertical_deg: number;
  pixel_scale_arcsec: number;
  imaging_mode: string;
  filter_names: string[];
  total_integration_minutes: number;
  planned_frames: number;
  captured_frames: number;
  window_start: string;
  window_end: string;
  weather_status: string;
  weather_score: number;
  moon_illumination_percent: number;
  white_night: boolean;
  notes: string;
  capture_markdown: string;
  created_at: string;
  updated_at: string;
};

type ApiProcessingPlan = {
  target_id: string;
  target_name: string;
  integration_class: string;
  stack_strategy: string;
  calibration_strategy: string;
  drizzle: string;
  binning: string;
  normalization: string;
  gradient_risk: string;
  gradient_score: number;
  noise_reduction: string;
  color_strategy: string;
  rejection: string;
  calibration_matches: {
    frame_type: string;
    recommendation: string;
    priority: string;
  }[];
  workflow: {
    label: string;
    action: string;
    reason: string;
  }[];
  warnings: string[];
};

type ApiFitsFrameMetadata = {
  file_name: string;
  relative_path: string;
  frame_type: string;
  filter_name: string | null;
  exposure_seconds: number | null;
  gain: number | null;
  offset: number | null;
  sensor_temperature_c: number | null;
  binning: string | null;
  object_name: string | null;
  date_obs: string | null;
  camera: string | null;
  telescope: string | null;
  width_px: number | null;
  height_px: number | null;
  size_mb: number;
  quality_score: number | null;
  star_count: number | null;
  fwhm_px: number | null;
  eccentricity: number | null;
  background_adu: number | null;
  background_noise_adu: number | null;
  quality_flags: string[];
  status: string;
  warnings: string[];
};

type ApiFitsGroupSummary = {
  label: string;
  frame_type: string;
  filter_name: string | null;
  frames: number;
  total_exposure_seconds: number;
  exposure_seconds: number[];
  temperature_range_c: string | null;
};

type ApiFitsScanResult = {
  scan_path: string;
  total_files: number;
  parsed_files: number;
  rejected_files: number;
  total_light_seconds: number;
  filters: string[];
  frame_types: string[];
  objects: string[];
  cameras: string[];
  exposure_range_seconds: string | null;
  temperature_range_c: string | null;
  groups: ApiFitsGroupSummary[];
  frames: ApiFitsFrameMetadata[];
  warnings: string[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchSessionPlan(
  targetId: string,
  settings: SessionSettings,
  weatherOptions?: WeatherFetchOptions
): Promise<SessionPlan> {
  const response = await fetch(`${apiBaseUrl}/api/session/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_id: targetId,
      date: settings.date,
      latitude_deg: settings.latitudeDeg,
      longitude_deg: settings.longitudeDeg,
      timezone: settings.timezone,
      bortle: settings.bortle,
      forecast_cache_ttl_minutes: weatherOptions?.cacheTtlMinutes,
      force_forecast_refresh: weatherOptions?.forceRefresh ?? false
    })
  });

  if (!response.ok) {
    throw new Error(`Session planner failed with ${response.status}`);
  }

  return normalizeSessionPlan((await response.json()) as ApiSessionPlan);
}

export async function fetchTonightBoard(
  settings: SessionSettings,
  fov: FovResult,
  weatherOptions?: WeatherFetchOptions
): Promise<TonightBoard> {
  const response = await fetch(`${apiBaseUrl}/api/session/tonight-board`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: settings.date,
      latitude_deg: settings.latitudeDeg,
      longitude_deg: settings.longitudeDeg,
      timezone: settings.timezone,
      bortle: settings.bortle,
      fov_horizontal_deg: fov.horizontalDeg,
      fov_vertical_deg: fov.verticalDeg,
      limit: 5,
      forecast_cache_ttl_minutes: weatherOptions?.cacheTtlMinutes,
      force_forecast_refresh: weatherOptions?.forceRefresh ?? false
    })
  });

  if (!response.ok) {
    throw new Error(`Tonight board failed with ${response.status}`);
  }

  return normalizeTonightBoard((await response.json()) as ApiTonightBoard);
}

export async function fetchMultiSessionPlan({
  settings,
  fov,
  targetIds,
  nights,
  weatherOptions
}: {
  settings: SessionSettings;
  fov: FovResult;
  targetIds: string[];
  nights: number;
  weatherOptions?: WeatherFetchOptions;
}): Promise<MultiSessionPlan> {
  const response = await fetch(`${apiBaseUrl}/api/session/multi-session-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start_date: settings.date,
      nights,
      target_ids: targetIds,
      latitude_deg: settings.latitudeDeg,
      longitude_deg: settings.longitudeDeg,
      timezone: settings.timezone,
      bortle: settings.bortle,
      fov_horizontal_deg: fov.horizontalDeg,
      fov_vertical_deg: fov.verticalDeg,
      limit: 18,
      forecast_cache_ttl_minutes: weatherOptions?.cacheTtlMinutes,
      force_forecast_refresh: weatherOptions?.forceRefresh ?? false
    })
  });

  if (!response.ok) {
    throw new Error(`Multi-session planner failed with ${response.status}`);
  }

  return normalizeMultiSessionPlan((await response.json()) as ApiMultiSessionPlan);
}

export async function fetchCapturePlan(
  targetId: string,
  settings: SessionSettings,
  fov: FovResult,
  weatherOptions?: WeatherFetchOptions
): Promise<CapturePlan> {
  const response = await fetch(`${apiBaseUrl}/api/session/capture-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_id: targetId,
      date: settings.date,
      latitude_deg: settings.latitudeDeg,
      longitude_deg: settings.longitudeDeg,
      timezone: settings.timezone,
      bortle: settings.bortle,
      fov_horizontal_deg: fov.horizontalDeg,
      fov_vertical_deg: fov.verticalDeg,
      pixel_scale_arcsec: fov.pixelScaleArcsec,
      forecast_cache_ttl_minutes: weatherOptions?.cacheTtlMinutes,
      force_forecast_refresh: weatherOptions?.forceRefresh ?? false
    })
  });

  if (!response.ok) {
    throw new Error(`Capture plan failed with ${response.status}`);
  }

  return normalizeCapturePlan((await response.json()) as ApiCapturePlan);
}

export async function fetchProcessingPlan({
  targetId,
  settings,
  fov,
  sessionPlan,
  capturePlan
}: {
  targetId: string;
  settings: SessionSettings;
  fov: FovResult;
  sessionPlan: SessionPlan;
  capturePlan: CapturePlan;
}): Promise<ProcessingPlan> {
  const response = await fetch(`${apiBaseUrl}/api/session/processing-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_id: targetId,
      bortle: settings.bortle,
      moon_illumination_percent: sessionPlan.moonIlluminationPercent,
      white_night: sessionPlan.whiteNight,
      weather_score: sessionPlan.weatherScore,
      fov_horizontal_deg: fov.horizontalDeg,
      fov_vertical_deg: fov.verticalDeg,
      pixel_scale_arcsec: fov.pixelScaleArcsec,
      total_integration_minutes: capturePlan.totalIntegrationMinutes,
      filter_names: capturePlan.exposureSteps.map((step) => step.filterName),
      planned_frames: capturePlan.exposureSteps.reduce((sum, step) => sum + step.frames, 0)
    })
  });

  if (!response.ok) {
    throw new Error(`Processing planner failed with ${response.status}`);
  }

  return normalizeProcessingPlan((await response.json()) as ApiProcessingPlan);
}

export async function scanFitsFrames({
  path,
  recursive,
  maxFiles
}: {
  path: string;
  recursive: boolean;
  maxFiles: number;
}): Promise<FitsScanResult> {
  const response = await fetch(`${apiBaseUrl}/api/frames/fits-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      recursive,
      max_files: maxFiles
    })
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? "";
    } catch {
      detail = "";
    }
    throw new Error(detail || `FITS scan failed with ${response.status}`);
  }

  return normalizeFitsScan((await response.json()) as ApiFitsScanResult);
}

export async function fetchSessionArchive(limit = 5): Promise<SessionArchiveEntry[]> {
  const response = await fetch(`${apiBaseUrl}/api/session/archive?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Session archive failed with ${response.status}`);
  }

  return ((await response.json()) as ApiSessionArchive[]).map(normalizeSessionArchive);
}

export async function saveSessionArchive(
  payload: SessionArchivePayload
): Promise<SessionArchiveEntry> {
  const response = await fetch(`${apiBaseUrl}/api/session/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toApiSessionArchive(payload))
  });

  if (!response.ok) {
    throw new Error(`Session archive save failed with ${response.status}`);
  }

  return normalizeSessionArchive((await response.json()) as ApiSessionArchive);
}

export function createFallbackSessionPlan(target: Target, settings?: SessionSettings): SessionPlan {
  const windows: Record<string, [string, string, number]> = {
    Winter: ["20:40", "03:35", 72],
    Spring: ["21:25", "02:45", 68],
    Summer: ["22:35", "02:25", 61],
    Autumn: ["21:10", "03:05", 77]
  };
  const [startTime, endTime, score] = windows[target.season] ?? ["21:30", "02:30", 64];
  const bortlePenalty = settings ? Math.max(0, settings.bortle - 4) * 4 : 0;
  const conditionScore = Math.max(28, score - bortlePenalty);
  const nightLabel = settings
    ? new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(`${settings.date}T12:00:00`)
      )
    : "Tonight";

  return {
    targetId: target.id,
    targetName: target.name,
    nightLabel,
    nightKind: "offline",
    nightKindLabel: "Offline estimate",
    startTime,
    endTime,
    whiteNight: false,
    minSunAltitudeDeg: -20,
    civilDarknessMinutes: 480,
    nauticalDarknessMinutes: 360,
    astronomicalDarknessMinutes: 240,
    moonIlluminationPercent: 18,
    maxAltitudeDeg: target.season === "Winter" ? 61 : 54,
    transparencyPercent: 82,
    seeingArcsec: 1.7,
    astronomyScore: conditionScore,
    weatherScore: 72,
    weatherStatus: "risk",
    weatherSummary: "Offline weather estimate",
    recommendedMode: target.season === "Summer" ? "Narrowband" : "RGB/Luminance",
    conditionScore,
    recommendation: target.exposureHint,
    slots: [
      { time: startTime, label: "Acquire", value: "+42 deg", intensity: 0.4, kind: "target" },
      { time: "22:40", label: "Guide", value: "1.7 arcsec", intensity: 0.6, kind: "target" },
      { time: "00:30", label: "Peak", value: "+61 deg", intensity: 0.95, kind: "target" },
      { time: endTime, label: "Wrap", value: `${conditionScore}/100`, intensity: 0.7, kind: "target" }
    ],
    altitudeCurve: createFallbackCurve()
  };
}

export function createFallbackTonightBoard(
  targets: Target[],
  settings: SessionSettings,
  fov: FovResult
): TonightBoard {
  const moonIlluminationPercent = estimateFallbackMoon(settings.date);
  const items = targets
    .map((target) => {
      const fovFit = fallbackFovFit(target, fov);
      const seasonScore = target.season === seasonForDate(settings.date) ? 88 : 66;
      const fovScore = fovFit === "Fits" ? 94 : fovFit === "Tight" ? 78 : fovFit === "Small" ? 62 : 48;
      const score = Math.round(Math.max(18, Math.min(100, seasonScore * 0.58 + fovScore * 0.42)));
      const window = fallbackWindow(target.season);

      return {
        targetId: target.id,
        targetName: target.name,
        catalogId: target.catalogId,
        targetType: target.type,
        constellation: target.constellation,
        score,
        astronomyScore: seasonScore,
        weatherScore: 72,
        fovScore,
        fovFit,
        startTime: window[0],
        endTime: window[1],
        bestTime: window[2],
        maxAltitudeDeg: target.season === "Winter" ? 61 : 54,
        recommendedMode: target.exposureHint,
        reason: `${fovFit} frame, offline estimate`
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  return {
    date: settings.date,
    summary: `Offline board: start with ${items[0]?.targetName ?? "calibration"}`,
    weatherStatus: "risk",
    weatherScore: 72,
    moonIlluminationPercent,
    whiteNight: false,
    items
  };
}

export function createFallbackMultiSessionPlan(
  targets: Target[],
  settings: SessionSettings,
  fov: FovResult,
  nights = 7
): MultiSessionPlan {
  const items: MultiSessionPlanItem[] = [];
  const nightsSummary: MultiSessionNightSummary[] = [];

  for (let offset = 0; offset < nights; offset += 1) {
    const dateIso = addDays(settings.date, offset);
    const moonIlluminationPercent = estimateFallbackMoon(dateIso);
    const season = seasonForDate(dateIso);
    const nightItems = targets.map((target) => {
      const fovFit = fallbackFovFit(target, fov);
      const fovScore = fovFit === "Fits" ? 94 : fovFit === "Tight" ? 78 : fovFit === "Small" ? 62 : 48;
      const seasonScore = target.season === season ? 84 : 58;
      const moonPenalty = moonIlluminationPercent > 55 && !target.type.toLowerCase().includes("nebula") ? 16 : 0;
      const score = Math.round(Math.max(18, Math.min(100, seasonScore * 0.54 + fovScore * 0.32 + 52 * 0.14 - moonPenalty)));
      const window = fallbackWindow(target.season);

      return {
        date: dateIso,
        targetId: target.id,
        targetName: target.name,
        catalogId: target.catalogId,
        targetType: target.type,
        score,
        astronomyScore: seasonScore,
        weatherScore: 72,
        fovScore,
        fovFit,
        moonIlluminationPercent,
        whiteNight: season === "Summer" && settings.latitudeDeg > 48,
        maxAltitudeDeg: target.season === "Winter" ? 61 : 54,
        startTime: window[0],
        endTime: window[1],
        bestTime: window[2],
        recommendedMode: target.exposureHint,
        reason: `${fovFit} frame, offline multi-night estimate`
      };
    });
    const bestNightItem = [...nightItems].sort((left, right) => right.score - left.score)[0];
    items.push(...nightItems);
    nightsSummary.push({
      date: dateIso,
      score: bestNightItem?.score ?? 0,
      weatherStatus: "risk",
      weatherScore: 72,
      moonIlluminationPercent,
      whiteNight: bestNightItem?.whiteNight ?? false,
      bestTargetId: bestNightItem?.targetId ?? "calibration",
      bestTargetName: bestNightItem?.targetName ?? "Calibration",
      catalogId: bestNightItem?.catalogId ?? "CAL",
      targetType: bestNightItem?.targetType ?? "Calibration",
      fovFit: bestNightItem?.fovFit ?? "Fits",
      maxAltitudeDeg: bestNightItem?.maxAltitudeDeg ?? 0,
      startTime: bestNightItem?.startTime ?? "22:00",
      endTime: bestNightItem?.endTime ?? "02:00",
      bestTime: bestNightItem?.bestTime ?? "00:00",
      recommendedMode: bestNightItem?.recommendedMode ?? "Calibration",
      reason: bestNightItem?.reason ?? "Offline calibration night",
      summary: bestNightItem ? `Offline pick: ${bestNightItem.targetName}` : "Offline calibration night"
    });
  }

  const rankedItems = items.sort((left, right) => right.score - left.score).slice(0, 18);
  return {
    startDate: settings.date,
    endDate: addDays(settings.date, nights - 1),
    nights,
    summary: `${nightsSummary.filter((night) => night.score >= 70).length}/${nights} useful nights / offline estimate`,
    items: rankedItems,
    nightsSummary,
    warnings: ["Offline multi-session estimate"]
  };
}

export function createFallbackCapturePlan(
  target: Target,
  settings: SessionSettings,
  fov: FovResult
): CapturePlan {
  const window = fallbackWindow(target.season);
  const imagingMode = fallbackCaptureMode(target);
  const exposureSeconds = imagingMode.includes("Narrowband")
    ? 300
    : imagingMode === "LRGB"
      ? 180
      : 120;
  const filters = fallbackCaptureFilters(imagingMode);
  const totalIntegrationMinutes = Math.max(72, Math.min(240, filters.length * 45));
  const exposureSteps = filters.map((filterName) => {
    const integrationMinutes = Math.round(totalIntegrationMinutes / filters.length);
    const frames = Math.max(8, Math.round((integrationMinutes * 60) / exposureSeconds));
    return {
      filterName,
      exposureSeconds,
      frames,
      integrationMinutes: Math.round((frames * exposureSeconds) / 60),
      binning: "1x1",
      gain: imagingMode.includes("Narrowband") ? "unity / low read noise" : "unity",
      note: `${target.exposureHint} / offline estimate`
    };
  });
  const plan: CapturePlan = {
    targetId: target.id,
    targetName: target.name,
    date: settings.date,
    windowStart: window[0],
    windowEnd: window[1],
    imagingMode,
    totalIntegrationMinutes: exposureSteps.reduce(
      (total, step) => total + step.integrationMinutes,
      0
    ),
    guiding: `Target RMS <= ${Math.max(0.45, fov.pixelScaleArcsec * 0.65).toFixed(2)} arcsec`,
    ditheringEveryFrames: settings.bortle <= 4 ? 3 : 2,
    autofocusEveryMinutes: 75,
    meridianAction: `Check flip near ${window[2]}`,
    framingNote: `${fallbackFovFit(target, fov)}: ${target.framing}`,
    moonWarning: "Offline moon estimate: confirm before capture",
    weatherNote: "Offline weather estimate",
    exposureSteps,
    calibrationFrames: [
      { frameType: "Flats", frames: 30, exposure: "per filter", note: "Before teardown" },
      { frameType: "Dark flats", frames: 30, exposure: "flat exposure", note: "Match flats" },
      {
        frameType: "Darks",
        frames: 20,
        exposure: `${exposureSeconds}s`,
        note: "Match gain and temperature"
      }
    ],
    checklist: [
      "Polar align and plate-solve first frame",
      "Run autofocus before first light frame",
      "Enable dithering before sequence start",
      "Inspect first two subs for star shape"
    ],
    exportMarkdown: ""
  };
  return { ...plan, exportMarkdown: createCaptureMarkdown(plan) };
}

export function createFallbackProcessingPlan(
  target: Target,
  settings: SessionSettings,
  fov: FovResult,
  sessionPlan: SessionPlan,
  capturePlan: CapturePlan
): ProcessingPlan {
  const filterNames = capturePlan.exposureSteps.map((step) => step.filterName);
  const plannedFrames = capturePlan.exposureSteps.reduce((sum, step) => sum + step.frames, 0);
  const hasNarrowband = filterNames.some((filterName) =>
    ["Ha", "OIII", "SII"].includes(filterName)
  );
  const gradientScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        settings.bortle * 7 +
          sessionPlan.moonIlluminationPercent * 0.42 +
          (sessionPlan.whiteNight ? 24 : 0)
      )
    )
  );

  return {
    targetId: target.id,
    targetName: target.name,
    integrationClass:
      capturePlan.totalIntegrationMinutes >= 240
        ? "Strong stack"
        : capturePlan.totalIntegrationMinutes >= 120
          ? "Usable stack"
          : "Scout stack",
    stackStrategy: hasNarrowband
      ? "Separate masters per filter, then linear fit before combine"
      : "Register all lights, weight by FWHM/eccentricity/SNR",
    calibrationStrategy: `Flats per ${Math.max(1, filterNames.length)} filters, darks by exposure/gain/temp`,
    drizzle:
      plannedFrames >= 35 && fov.pixelScaleArcsec > 2.2
        ? "2x drizzle for undersampled stars"
        : "Off / native scale",
    binning: fov.pixelScaleArcsec < 0.75 ? "2x2 bin after calibration" : "1x1 master stack",
    normalization: gradientScore >= 52 ? "Local normalization before integration" : "Per-filter normalization",
    gradientRisk: gradientScore >= 75 ? "Severe" : gradientScore >= 52 ? "High" : "Moderate",
    gradientScore,
    noiseReduction:
      gradientScore >= 75
        ? "Gradient first, denoise after background neutralization"
        : "Multiscale linear denoise before stretch",
    colorStrategy: hasNarrowband ? "SHO/HOO preview, RGB stars if available" : "Photometric color calibration",
    rejection: plannedFrames >= 18 ? "Sigma clipping, moderate high rejection" : "Percentile clipping",
    calibrationMatches: [
      { frameType: "Flats", recommendation: `Match filters: ${filterNames.join(", ")}`, priority: "Required" },
      { frameType: "Dark flats", recommendation: "Match flat exposure and temperature", priority: "Required" },
      { frameType: "Darks", recommendation: "Match light exposure, gain, offset, and temp", priority: "Required" }
    ],
    workflow: [
      {
        label: "Calibrate",
        action: "Apply matching darks, flats, and dark-flats",
        reason: "Keeps dust and amp pattern out of the master"
      },
      {
        label: "Cull",
        action: "Reject frames by FWHM, eccentricity, clouds, and background",
        reason: "Bad subframes cost more than they contribute"
      },
      {
        label: "Integrate",
        action: "Stack per filter with weighted rejection",
        reason: "Clean masters before color work"
      }
    ],
    warnings: gradientScore >= 52 ? ["High gradient risk: inspect channel backgrounds"] : []
  };
}

function normalizeSessionPlan(plan: ApiSessionPlan): SessionPlan {
  return {
    targetId: plan.target_id,
    targetName: plan.target_name,
    nightLabel: plan.night_label,
    nightKind: plan.night_kind,
    nightKindLabel: plan.night_kind_label,
    startTime: plan.start_time,
    endTime: plan.end_time,
    whiteNight: plan.white_night,
    minSunAltitudeDeg: plan.min_sun_altitude_deg,
    civilDarknessMinutes: plan.civil_darkness_minutes,
    nauticalDarknessMinutes: plan.nautical_darkness_minutes,
    astronomicalDarknessMinutes: plan.astronomical_darkness_minutes,
    moonIlluminationPercent: plan.moon_illumination_percent,
    maxAltitudeDeg: plan.max_altitude_deg,
    transparencyPercent: plan.transparency_percent,
    seeingArcsec: plan.seeing_arcsec,
    astronomyScore: plan.astronomy_score,
    weatherScore: plan.weather_score,
    weatherStatus: plan.weather_status,
    weatherSummary: plan.weather_summary,
    recommendedMode: plan.recommended_mode,
    conditionScore: plan.condition_score,
    recommendation: plan.recommendation,
    slots: plan.slots,
    altitudeCurve: plan.altitude_curve.map((point) => ({
      time: point.time,
      targetAltitudeDeg: point.target_altitude_deg,
      sunAltitudeDeg: point.sun_altitude_deg,
      darkness: point.darkness
    }))
  };
}

function normalizeTonightBoard(board: ApiTonightBoard): TonightBoard {
  return {
    date: board.date,
    summary: board.summary,
    weatherStatus: board.weather_status,
    weatherScore: board.weather_score,
    moonIlluminationPercent: board.moon_illumination_percent,
    whiteNight: board.white_night,
    items: board.items.map((item) => ({
      targetId: item.target_id,
      targetName: item.target_name,
      catalogId: item.catalog_id,
      targetType: item.target_type,
      constellation: item.constellation,
      score: item.score,
      astronomyScore: item.astronomy_score,
      weatherScore: item.weather_score,
      fovScore: item.fov_score,
      fovFit: item.fov_fit,
      startTime: item.start_time,
      endTime: item.end_time,
      bestTime: item.best_time,
      maxAltitudeDeg: item.max_altitude_deg,
      recommendedMode: item.recommended_mode,
      reason: item.reason
    }))
  };
}

function normalizeMultiSessionPlan(plan: ApiMultiSessionPlan): MultiSessionPlan {
  return {
    startDate: plan.start_date,
    endDate: plan.end_date,
    nights: plan.nights,
    summary: plan.summary,
    items: plan.items.map((item) => ({
      date: item.date,
      targetId: item.target_id,
      targetName: item.target_name,
      catalogId: item.catalog_id,
      targetType: item.target_type,
      score: item.score,
      astronomyScore: item.astronomy_score,
      weatherScore: item.weather_score,
      fovScore: item.fov_score,
      fovFit: item.fov_fit,
      moonIlluminationPercent: item.moon_illumination_percent,
      whiteNight: item.white_night,
      maxAltitudeDeg: item.max_altitude_deg,
      startTime: item.start_time,
      endTime: item.end_time,
      bestTime: item.best_time,
      recommendedMode: item.recommended_mode,
      reason: item.reason
    })),
    nightsSummary: plan.nights_summary.map((night) => ({
      date: night.date,
      score: night.score,
      weatherStatus: night.weather_status,
      weatherScore: night.weather_score,
      moonIlluminationPercent: night.moon_illumination_percent,
      whiteNight: night.white_night,
      bestTargetId: night.best_target_id,
      bestTargetName: night.best_target_name,
      catalogId: night.catalog_id,
      targetType: night.target_type,
      fovFit: night.fov_fit,
      maxAltitudeDeg: night.max_altitude_deg,
      startTime: night.start_time,
      endTime: night.end_time,
      bestTime: night.best_time,
      recommendedMode: night.recommended_mode,
      reason: night.reason,
      summary: night.summary
    })),
    warnings: plan.warnings
  };
}

function normalizeCapturePlan(plan: ApiCapturePlan): CapturePlan {
  return {
    targetId: plan.target_id,
    targetName: plan.target_name,
    date: plan.date,
    windowStart: plan.window_start,
    windowEnd: plan.window_end,
    imagingMode: plan.imaging_mode,
    totalIntegrationMinutes: plan.total_integration_minutes,
    guiding: plan.guiding,
    ditheringEveryFrames: plan.dithering_every_frames,
    autofocusEveryMinutes: plan.autofocus_every_minutes,
    meridianAction: plan.meridian_action,
    framingNote: plan.framing_note,
    moonWarning: plan.moon_warning,
    weatherNote: plan.weather_note,
    exposureSteps: plan.exposure_steps.map((step) => ({
      filterName: step.filter_name,
      exposureSeconds: step.exposure_seconds,
      frames: step.frames,
      integrationMinutes: step.integration_minutes,
      binning: step.binning,
      gain: step.gain,
      note: step.note
    })),
    calibrationFrames: plan.calibration_frames.map((step) => ({
      frameType: step.frame_type,
      frames: step.frames,
      exposure: step.exposure,
      note: step.note
    })),
    checklist: plan.checklist,
    exportMarkdown: plan.export_markdown
  };
}

function normalizeProcessingPlan(plan: ApiProcessingPlan): ProcessingPlan {
  return {
    targetId: plan.target_id,
    targetName: plan.target_name,
    integrationClass: plan.integration_class,
    stackStrategy: plan.stack_strategy,
    calibrationStrategy: plan.calibration_strategy,
    drizzle: plan.drizzle,
    binning: plan.binning,
    normalization: plan.normalization,
    gradientRisk: plan.gradient_risk,
    gradientScore: plan.gradient_score,
    noiseReduction: plan.noise_reduction,
    colorStrategy: plan.color_strategy,
    rejection: plan.rejection,
    calibrationMatches: plan.calibration_matches.map((item) => ({
      frameType: item.frame_type,
      recommendation: item.recommendation,
      priority: item.priority
    })),
    workflow: plan.workflow,
    warnings: plan.warnings
  };
}

function normalizeSessionArchive(archive: ApiSessionArchive): SessionArchiveEntry {
  return {
    id: archive.id,
    targetId: archive.target_id,
    targetName: archive.target_name,
    sessionDate: archive.session_date,
    status: archive.status,
    profileId: archive.profile_id,
    profileName: archive.profile_name,
    siteName: archive.site_name,
    bortle: archive.bortle,
    fovHorizontalDeg: archive.fov_horizontal_deg,
    fovVerticalDeg: archive.fov_vertical_deg,
    pixelScaleArcsec: archive.pixel_scale_arcsec,
    imagingMode: archive.imaging_mode,
    filterNames: archive.filter_names,
    totalIntegrationMinutes: archive.total_integration_minutes,
    plannedFrames: archive.planned_frames,
    capturedFrames: archive.captured_frames,
    windowStart: archive.window_start,
    windowEnd: archive.window_end,
    weatherStatus: archive.weather_status,
    weatherScore: archive.weather_score,
    moonIlluminationPercent: archive.moon_illumination_percent,
    whiteNight: archive.white_night,
    notes: archive.notes,
    captureMarkdown: archive.capture_markdown,
    createdAt: archive.created_at,
    updatedAt: archive.updated_at
  };
}

function normalizeFitsScan(scan: ApiFitsScanResult): FitsScanResult {
  return {
    scanPath: scan.scan_path,
    totalFiles: scan.total_files,
    parsedFiles: scan.parsed_files,
    rejectedFiles: scan.rejected_files,
    totalLightSeconds: scan.total_light_seconds,
    filters: scan.filters,
    frameTypes: scan.frame_types,
    objects: scan.objects,
    cameras: scan.cameras,
    exposureRangeSeconds: scan.exposure_range_seconds,
    temperatureRangeC: scan.temperature_range_c,
    groups: scan.groups.map((group) => ({
      label: group.label,
      frameType: group.frame_type,
      filterName: group.filter_name,
      frames: group.frames,
      totalExposureSeconds: group.total_exposure_seconds,
      exposureSeconds: group.exposure_seconds,
      temperatureRangeC: group.temperature_range_c
    })),
    frames: scan.frames.map((frame) => ({
      fileName: frame.file_name,
      relativePath: frame.relative_path,
      frameType: frame.frame_type,
      filterName: frame.filter_name,
      exposureSeconds: frame.exposure_seconds,
      gain: frame.gain,
      offset: frame.offset,
      sensorTemperatureC: frame.sensor_temperature_c,
      binning: frame.binning,
      objectName: frame.object_name,
      dateObs: frame.date_obs,
      camera: frame.camera,
      telescope: frame.telescope,
      widthPx: frame.width_px,
      heightPx: frame.height_px,
      sizeMb: frame.size_mb,
      qualityScore: frame.quality_score ?? null,
      starCount: frame.star_count ?? null,
      fwhmPx: frame.fwhm_px ?? null,
      eccentricity: frame.eccentricity ?? null,
      backgroundAdu: frame.background_adu ?? null,
      backgroundNoiseAdu: frame.background_noise_adu ?? null,
      qualityFlags: frame.quality_flags ?? [],
      status: frame.status,
      warnings: frame.warnings
    })),
    warnings: scan.warnings
  };
}

function toApiSessionArchive(archive: SessionArchivePayload) {
  return {
    target_id: archive.targetId,
    target_name: archive.targetName,
    session_date: archive.sessionDate,
    status: archive.status,
    profile_id: archive.profileId,
    profile_name: archive.profileName,
    site_name: archive.siteName,
    bortle: archive.bortle,
    fov_horizontal_deg: archive.fovHorizontalDeg,
    fov_vertical_deg: archive.fovVerticalDeg,
    pixel_scale_arcsec: archive.pixelScaleArcsec,
    imaging_mode: archive.imagingMode,
    filter_names: archive.filterNames,
    total_integration_minutes: archive.totalIntegrationMinutes,
    planned_frames: archive.plannedFrames,
    captured_frames: archive.capturedFrames,
    window_start: archive.windowStart,
    window_end: archive.windowEnd,
    weather_status: archive.weatherStatus,
    weather_score: archive.weatherScore,
    moon_illumination_percent: archive.moonIlluminationPercent,
    white_night: archive.whiteNight,
    notes: archive.notes,
    capture_markdown: archive.captureMarkdown
  };
}

function createFallbackCurve(): AltitudePoint[] {
  return [
    { time: "18:00", targetAltitudeDeg: 16, sunAltitudeDeg: -4, darkness: "civil" },
    { time: "20:00", targetAltitudeDeg: 28, sunAltitudeDeg: -10, darkness: "nautical" },
    { time: "22:00", targetAltitudeDeg: 44, sunAltitudeDeg: -18, darkness: "astronomical" },
    { time: "00:00", targetAltitudeDeg: 58, sunAltitudeDeg: -23, darkness: "astronomical" },
    { time: "02:00", targetAltitudeDeg: 48, sunAltitudeDeg: -19, darkness: "astronomical" },
    { time: "04:00", targetAltitudeDeg: 25, sunAltitudeDeg: -9, darkness: "nautical" }
  ];
}

function fallbackFovFit(target: Target, fov: FovResult) {
  const load = Math.max(
    target.angularWidthArcmin / (fov.horizontalDeg * 60),
    target.angularHeightArcmin / (fov.verticalDeg * 60)
  );
  if (load <= 0.18) return "Small";
  if (load <= 0.78) return "Fits";
  if (load <= 1.05) return "Tight";
  return "Mosaic";
}

function fallbackWindow(season: string): [string, string, string] {
  const windows: Record<string, [string, string, string]> = {
    Winter: ["20:40", "03:35", "00:30"],
    Spring: ["21:25", "02:45", "00:20"],
    Summer: ["22:35", "02:25", "00:45"],
    Autumn: ["21:10", "03:05", "00:15"]
  };
  return windows[season] ?? ["21:30", "02:30", "00:00"];
}

function fallbackCaptureMode(target: Target) {
  const targetType = target.type.toLowerCase();
  if (targetType.includes("galaxy")) return "LRGB";
  if (targetType.includes("reflection")) return "RGB";
  if (targetType.includes("nebula") || targetType.includes("remnant")) return "Narrowband";
  return "RGB/Luminance";
}

function fallbackCaptureFilters(imagingMode: string) {
  if (imagingMode === "LRGB") return ["L", "R", "G", "B"];
  if (imagingMode === "RGB") return ["R", "G", "B"];
  if (imagingMode.includes("Narrowband")) return ["Ha", "OIII", "SII"];
  return ["Luminance"];
}

function createCaptureMarkdown(plan: CapturePlan) {
  const exposureLines = plan.exposureSteps
    .map(
      (step) =>
        `- ${step.filterName}: ${step.frames} x ${step.exposureSeconds}s (${step.integrationMinutes} min)`
    )
    .join("\n");
  const calibrationLines = plan.calibrationFrames
    .map((step) => `- ${step.frameType}: ${step.frames} x ${step.exposure} - ${step.note}`)
    .join("\n");
  const checklistLines = plan.checklist.map((item) => `- [ ] ${item}`).join("\n");
  return [
    `# Capture Plan: ${plan.targetName}`,
    "",
    `- Date: ${plan.date}`,
    `- Window: ${plan.windowStart} - ${plan.windowEnd}`,
    `- Mode: ${plan.imagingMode}`,
    `- Integration: ${plan.totalIntegrationMinutes} min`,
    "",
    "## Lights",
    exposureLines,
    "",
    "## Calibration",
    calibrationLines,
    "",
    "## Checklist",
    checklistLines
  ].join("\n");
}

function seasonForDate(dateIso: string) {
  const month = new Date(`${dateIso}T12:00:00`).getMonth() + 1;
  if (month <= 2 || month === 12) return "Winter";
  if (month <= 5) return "Spring";
  if (month <= 8) return "Summer";
  return "Autumn";
}

function estimateFallbackMoon(dateIso: string) {
  const reference = new Date("2000-01-06T12:00:00Z").getTime();
  const current = new Date(`${dateIso}T12:00:00Z`).getTime();
  const days = (current - reference) / 86_400_000;
  const phase = ((days % 29.53058867) + 29.53058867) % 29.53058867;
  const illumination = (1 - Math.cos((phase / 29.53058867) * Math.PI * 2)) / 2;
  return Math.round(illumination * 100);
}

function addDays(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
