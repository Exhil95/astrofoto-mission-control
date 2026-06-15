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
