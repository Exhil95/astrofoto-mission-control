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

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchSessionPlan(
  targetId: string,
  settings: SessionSettings
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
      bortle: settings.bortle
    })
  });

  if (!response.ok) {
    throw new Error(`Session planner failed with ${response.status}`);
  }

  return normalizeSessionPlan((await response.json()) as ApiSessionPlan);
}

export async function fetchTonightBoard(
  settings: SessionSettings,
  fov: FovResult
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
      limit: 5
    })
  });

  if (!response.ok) {
    throw new Error(`Tonight board failed with ${response.status}`);
  }

  return normalizeTonightBoard((await response.json()) as ApiTonightBoard);
}

export async function fetchCapturePlan(
  targetId: string,
  settings: SessionSettings,
  fov: FovResult
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
      pixel_scale_arcsec: fov.pixelScaleArcsec
    })
  });

  if (!response.ok) {
    throw new Error(`Capture plan failed with ${response.status}`);
  }

  return normalizeCapturePlan((await response.json()) as ApiCapturePlan);
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
