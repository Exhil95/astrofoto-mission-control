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
  raHours: number;
  decDeg: number;
  position: [number, number, number];
  tint: string;
  exposureHint: string;
  imageUrl: string;
  imageCredit: string;
  imageSourceUrl: string;
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
  position?: [number, number, number];
  tint: string;
  image_url?: string | null;
  image_credit?: string | null;
  image_source_url?: string | null;
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
    raHours: target.ra_hours,
    decDeg: target.dec_deg,
    position: target.position ?? calculateSkyPosition(target.ra_hours, target.dec_deg),
    tint: target.tint,
    exposureHint: target.exposure_hint,
    imageUrl:
      target.image_url ??
      createSurveyImageUrl(
        target.ra_hours,
        target.dec_deg,
        target.angular_width_arcmin,
        target.angular_height_arcmin
      ),
    imageCredit: target.image_credit ?? "CDS DSS2 color survey",
    imageSourceUrl: target.image_source_url ?? "https://aladin.cds.unistra.fr/hips-image-services/"
  };
}

function calculateSkyPosition(raHours: number, decDeg: number): [number, number, number] {
  const raRad = (raHours / 24) * Math.PI * 2;
  const decRad = (decDeg * Math.PI) / 180;
  const radius = 1.95;

  return [
    roundSceneValue(Math.sin(raRad) * Math.cos(decRad) * radius),
    roundSceneValue(Math.sin(decRad) * radius),
    roundSceneValue(Math.cos(raRad) * Math.cos(decRad) * radius * 0.78)
  ];
}

function createSurveyImageUrl(
  raHours: number,
  decDeg: number,
  widthArcmin: number,
  heightArcmin: number
) {
  const imageFovDeg = Math.max(0.22, Math.min((Math.max(widthArcmin, heightArcmin) / 60) * 1.35, 4.2));
  const params = new URLSearchParams({
    hips: "CDS/P/DSS2/color",
    width: "256",
    height: "256",
    fov: imageFovDeg.toFixed(3),
    projection: "TAN",
    coordsys: "icrs",
    ra: (raHours * 15).toFixed(5),
    dec: decDeg.toFixed(5),
    format: "jpg"
  });

  return `https://alasky.cds.unistra.fr/hips-image-services/hips2fits?${params.toString()}`;
}

function roundSceneValue(value: number) {
  return Math.round(value * 100) / 100;
}
