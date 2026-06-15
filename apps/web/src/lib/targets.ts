import rawTargets from "../../../api/astro_api/data/targets.json";

export type Target = {
  id: string;
  catalogId: string;
  name: string;
  type: string;
  constellation: string;
  season: string;
  magnitude: number;
  angularWidthArcmin: number;
  angularHeightArcmin: number;
  bestMonths: string;
  difficulty: "Easy" | "Medium" | "Hard";
  framing: string;
  position: [number, number, number];
  tint: string;
  exposureHint: string;
};

type ApiTarget = {
  id: string;
  catalog_id: string;
  name: string;
  type: string;
  constellation: string;
  season: string;
  magnitude: number;
  angular_width_arcmin: number;
  angular_height_arcmin: number;
  best_months: string;
  difficulty: "Easy" | "Medium" | "Hard";
  framing: string;
  exposure_hint: string;
  ra_hours: number;
  dec_deg: number;
  position: [number, number, number];
  tint: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchTargets(): Promise<Target[]> {
  const response = await fetch(`${apiBaseUrl}/api/targets`);
  if (!response.ok) throw new Error(`Target catalog failed with ${response.status}`);
  return ((await response.json()) as ApiTarget[]).map(normalizeTarget);
}

export const fallbackTargets = (rawTargets as ApiTarget[]).map(normalizeTarget);

function normalizeTarget(target: ApiTarget): Target {
  return {
    id: target.id,
    catalogId: target.catalog_id,
    name: target.name,
    type: target.type,
    constellation: target.constellation,
    season: target.season,
    magnitude: target.magnitude,
    angularWidthArcmin: target.angular_width_arcmin,
    angularHeightArcmin: target.angular_height_arcmin,
    bestMonths: target.best_months,
    difficulty: target.difficulty,
    framing: target.framing,
    position: target.position,
    tint: target.tint,
    exposureHint: target.exposure_hint
  };
}
