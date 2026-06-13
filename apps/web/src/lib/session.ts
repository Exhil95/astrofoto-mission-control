import type { Target } from "./targets";

export type SessionSlot = {
  time: string;
  label: string;
  value: string;
  intensity: number;
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
  conditionScore: number;
  recommendation: string;
  slots: SessionSlot[];
};

export type SessionSettings = {
  date: string;
  latitudeDeg: number;
  longitudeDeg: number;
  bortle: number;
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
  condition_score: number;
  recommendation: string;
  slots: SessionSlot[];
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
      bortle: settings.bortle
    })
  });

  if (!response.ok) {
    throw new Error(`Session planner failed with ${response.status}`);
  }

  return normalizeSessionPlan((await response.json()) as ApiSessionPlan);
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
    conditionScore,
    recommendation: target.exposureHint,
    slots: [
      { time: startTime, label: "Acquire", value: "+42 deg", intensity: 0.4 },
      { time: "22:40", label: "Guide", value: "1.7 arcsec", intensity: 0.6 },
      { time: "00:30", label: "Peak", value: "+61 deg", intensity: 0.95 },
      { time: endTime, label: "Wrap", value: `${conditionScore}/100`, intensity: 0.7 }
    ]
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
    conditionScore: plan.condition_score,
    recommendation: plan.recommendation,
    slots: plan.slots
  };
}
