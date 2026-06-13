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
  startTime: string;
  endTime: string;
  moonIlluminationPercent: number;
  maxAltitudeDeg: number;
  transparencyPercent: number;
  seeingArcsec: number;
  conditionScore: number;
  recommendation: string;
  slots: SessionSlot[];
};

type ApiSessionPlan = {
  target_id: string;
  target_name: string;
  night_label: string;
  start_time: string;
  end_time: string;
  moon_illumination_percent: number;
  max_altitude_deg: number;
  transparency_percent: number;
  seeing_arcsec: number;
  condition_score: number;
  recommendation: string;
  slots: SessionSlot[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchSessionPlan(targetId: string): Promise<SessionPlan> {
  const response = await fetch(`${apiBaseUrl}/api/session/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_id: targetId,
      date: new Date().toISOString().slice(0, 10),
      latitude_deg: 50.2649,
      longitude_deg: 19.0238,
      bortle: 4
    })
  });

  if (!response.ok) {
    throw new Error(`Session planner failed with ${response.status}`);
  }

  return normalizeSessionPlan((await response.json()) as ApiSessionPlan);
}

export function createFallbackSessionPlan(target: Target): SessionPlan {
  const windows: Record<string, [string, string, number]> = {
    Winter: ["20:40", "03:35", 72],
    Spring: ["21:25", "02:45", 68],
    Summer: ["22:35", "02:25", 61],
    Autumn: ["21:10", "03:05", 77]
  };
  const [startTime, endTime, score] = windows[target.season] ?? ["21:30", "02:30", 64];

  return {
    targetId: target.id,
    targetName: target.name,
    nightLabel: "Tonight",
    startTime,
    endTime,
    moonIlluminationPercent: 18,
    maxAltitudeDeg: target.season === "Winter" ? 61 : 54,
    transparencyPercent: 82,
    seeingArcsec: 1.7,
    conditionScore: score,
    recommendation: target.exposureHint,
    slots: [
      { time: startTime, label: "Acquire", value: "+42 deg", intensity: 0.4 },
      { time: "22:40", label: "Guide", value: "1.7 arcsec", intensity: 0.6 },
      { time: "00:30", label: "Peak", value: "+61 deg", intensity: 0.95 },
      { time: endTime, label: "Wrap", value: `${score}/100`, intensity: 0.7 }
    ]
  };
}

function normalizeSessionPlan(plan: ApiSessionPlan): SessionPlan {
  return {
    targetId: plan.target_id,
    targetName: plan.target_name,
    nightLabel: plan.night_label,
    startTime: plan.start_time,
    endTime: plan.end_time,
    moonIlluminationPercent: plan.moon_illumination_percent,
    maxAltitudeDeg: plan.max_altitude_deg,
    transparencyPercent: plan.transparency_percent,
    seeingArcsec: plan.seeing_arcsec,
    conditionScore: plan.condition_score,
    recommendation: plan.recommendation,
    slots: plan.slots
  };
}

