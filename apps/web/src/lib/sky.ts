import type { FovResult } from "./fov";
import type { SupportedLanguage } from "./i18n";
import type { Target } from "./targets";

export type SkyDisplayMode = "focus" | "tonight" | "showcase" | "catalog";
export type SkyFitFilter = "All" | "Small" | "Fits" | "Tight" | "Mosaic";

export function isSkyDisplayMode(value: string | null): value is SkyDisplayMode {
  return value === "focus" || value === "tonight" || value === "showcase" || value === "catalog";
}

export function formatObjectFootprint(target: Target, fov: FovResult) {
  const widthPercent = Math.round((target.angularWidthArcmin / (fov.horizontalDeg * 60)) * 100);
  const heightPercent = Math.round((target.angularHeightArcmin / (fov.verticalDeg * 60)) * 100);
  return `${target.angularWidthArcmin} x ${target.angularHeightArcmin}' / ${widthPercent}% x ${heightPercent}%`;
}

export function filterSkyTargets(
  targets: Target[],
  fov: FovResult,
  typeFilter: string,
  seasonFilter: string,
  fitFilter: SkyFitFilter
) {
  return targets.filter((target) => {
    const fit = calculateFitLabel(target, fov);
    return (
      (typeFilter === "All" || target.type === typeFilter) &&
      (seasonFilter === "All" || target.season === seasonFilter) &&
      (fitFilter === "All" || fit === fitFilter)
    );
  });
}

export function curateSkyTargets({
  mode,
  selectedTarget,
  allTargets,
  filteredTargets,
  tonightTargetIds,
  showcaseIndex
}: {
  mode: SkyDisplayMode;
  selectedTarget: Target;
  allTargets: Target[];
  filteredTargets: Target[];
  tonightTargetIds: string[];
  showcaseIndex: number;
}) {
  if (mode === "focus") return [selectedTarget];

  if (mode === "tonight") {
    const tonightTargets = tonightTargetIds
      .map((targetId) => allTargets.find((target) => target.id === targetId))
      .filter((target): target is Target => Boolean(target));
    return uniqueTargets([selectedTarget, ...tonightTargets]).slice(0, 6);
  }

  if (mode === "showcase") {
    const showcasedTargets = rotatingWindow(filteredTargets, showcaseIndex, 7);
    return uniqueTargets([selectedTarget, ...showcasedTargets]).slice(0, 8);
  }

  return uniqueTargets([selectedTarget, ...filteredTargets]).slice(0, 12);
}

export function sceneSummary({
  mode,
  visibleCount,
  filteredCount,
  totalCount,
  language
}: {
  mode: SkyDisplayMode;
  visibleCount: number;
  filteredCount: number;
  totalCount: number;
  language: SupportedLanguage;
}) {
  const labels = {
    en: { focus: "Focus", object: "object", objects: "objects", tonight: "Tonight", showcase: "Showcase", filtered: "Filtered", of: "of" },
    pl: { focus: "Fokus", object: "obiekt", objects: "obiektów", tonight: "Dziś", showcase: "Showcase", filtered: "Filtr", of: "z" },
    de: { focus: "Fokus", object: "Objekt", objects: "Objekte", tonight: "Heute", showcase: "Showcase", filtered: "Gefiltert", of: "von" },
    it: { focus: "Focus", object: "oggetto", objects: "oggetti", tonight: "Stasera", showcase: "Showcase", filtered: "Filtrati", of: "di" },
    es: { focus: "Foco", object: "objeto", objects: "objetos", tonight: "Hoy", showcase: "Showcase", filtered: "Filtrado", of: "de" }
  }[language];

  if (mode === "focus") return `${labels.focus} / 1 ${labels.object}`;
  if (mode === "tonight") return `${labels.tonight} / ${visibleCount} ${labels.objects}`;
  if (mode === "showcase") return `${labels.showcase} / ${visibleCount} ${labels.of} ${filteredCount}`;
  return `${labels.filtered} / ${visibleCount} ${labels.of} ${totalCount}`;
}

export function analyzeFraming(target: Target, fov: FovResult, language: SupportedLanguage) {
  const fovWidthArcmin = fov.horizontalDeg * 60;
  const fovHeightArcmin = fov.verticalDeg * 60;
  const load = Math.max(
    target.angularWidthArcmin / fovWidthArcmin,
    target.angularHeightArcmin / fovHeightArcmin
  );
  const swappedLoad = Math.max(
    target.angularWidthArcmin / fovHeightArcmin,
    target.angularHeightArcmin / fovWidthArcmin
  );

  if (load > 1.05) {
    const columns = Math.max(1, Math.ceil(target.angularWidthArcmin / (fovWidthArcmin * 0.82)));
    const rows = Math.max(1, Math.ceil(target.angularHeightArcmin / (fovHeightArcmin * 0.82)));
    const overlap = {
      en: "mosaic / 18% overlap",
      pl: "mozaika / 18% zakładki",
      de: "Mosaik / 18% Überlappung",
      it: "mosaico / 18% sovrapposizione",
      es: "mosaico / 18% solape"
    }[language];
    return `${columns} x ${rows} ${overlap}`;
  }

  if (swappedLoad + 0.05 < load) {
    return {
      en: "Rotate 90 deg for better margin",
      pl: "Obróć 90 deg dla lepszego marginesu",
      de: "90 deg drehen für besseren Rand",
      it: "Ruota 90 deg per più margine",
      es: "Gira 90 deg para mejor margen"
    }[language];
  }
  if (load > 0.78) {
    return {
      en: "Tight frame / check rotation",
      pl: "Ciasny kadr / sprawdź rotację",
      de: "Knappes Bildfeld / Rotation prüfen",
      it: "Inquadratura stretta / controlla rotazione",
      es: "Encuadre justo / revisa rotación"
    }[language];
  }

  const marginPercent = Math.round((1 - load) * 100);
  const marginLabel = {
    en: "Margin",
    pl: "Margines",
    de: "Rand",
    it: "Margine",
    es: "Margen"
  }[language];
  const singlePanel = {
    en: "single panel",
    pl: "pojedynczy panel",
    de: "Einzelpanel",
    it: "pannello singolo",
    es: "panel único"
  }[language];
  return `${marginLabel} +${marginPercent}% / ${singlePanel}`;
}

export function calculateFitLabel(target: Target, fov: FovResult): SkyFitFilter {
  const load = Math.max(
    target.angularWidthArcmin / (fov.horizontalDeg * 60),
    target.angularHeightArcmin / (fov.verticalDeg * 60)
  );
  if (load <= 0.18) return "Small";
  if (load <= 0.78) return "Fits";
  if (load <= 1.05) return "Tight";
  return "Mosaic";
}

function rotatingWindow(targets: Target[], index: number, limit: number) {
  if (!targets.length) return [];
  return Array.from({ length: Math.min(limit, targets.length) }, (_, offset) => {
    return targets[(index + offset) % targets.length];
  });
}

function uniqueTargets(targets: Target[]) {
  const seenTargetIds = new Set<string>();
  return targets.filter((target) => {
    if (seenTargetIds.has(target.id)) return false;
    seenTargetIds.add(target.id);
    return true;
  });
}
