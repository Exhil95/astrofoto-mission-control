import {
  createFitsArchiveMarkdown,
  createFitsArchiveNotes,
  summarizeQuality
} from "./exports/fits";
import type { FovResult } from "./fov";
import type { SupportedLanguage } from "./i18n";
import type { EquipmentProfile } from "./profiles";
import type {
  FitsFrameMetadata,
  FitsScanResult,
  SessionArchivePayload,
  SessionSettings
} from "./session";
import type { Target } from "./targets";

export type FitsArchiveImportDraft = {
  payload: SessionArchivePayload;
  confidence: string;
  targetLabel: string;
  summary: string;
};

export function createArchiveImportDraft({
  scan,
  targets,
  selectedProfile,
  settings,
  fov,
  language
}: {
  scan: FitsScanResult;
  targets: Target[];
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
  language: SupportedLanguage;
}): FitsArchiveImportDraft | null {
  const lightFrames = scan.frames.filter((frame) => frame.frameType === "Light");
  if (!lightFrames.length) return null;

  const objectName = mostCommon(
    lightFrames.map((frame) => frame.objectName).filter((value): value is string => Boolean(value))
  );
  const matchedTarget = findTargetMatch(targets, objectName);
  const targetName = matchedTarget?.name ?? objectName ?? "Imported FITS session";
  const targetId = matchedTarget?.id ?? normalizeTargetId(targetName);
  const filterNames = uniqueNonEmpty(lightFrames.map((frame) => frame.filterName));
  const capturedFrames = lightFrames.length;
  const totalLightSeconds = lightFrames.reduce((sum, frame) => sum + (frame.exposureSeconds ?? 0), 0);
  const totalIntegrationMinutes = Math.max(0, Math.round(totalLightSeconds / 60));
  const qualitySummary = summarizeQuality(lightFrames);
  const firstLight = earliestFrame(lightFrames);
  const lastLight = latestFrame(lightFrames);
  const sessionDate = dateFromFrame(firstLight) ?? settings.date;
  const windowStart = timeFromFrame(firstLight) ?? "00:00";
  const windowEnd = timeFromFrame(lastLight) ?? windowStart;
  const imagingMode = imagingModeFromFilters(filterNames, matchedTarget);
  const confidence = matchedTarget ? "Matched target" : objectName ? "Header target" : "Folder import";

  const payload: SessionArchivePayload = {
    targetId,
    targetName,
    sessionDate,
    status: "captured",
    profileId: selectedProfile?.id ?? null,
    profileName: selectedProfile?.name ?? null,
    siteName: selectedProfile?.siteName ?? settings.timezone,
    bortle: settings.bortle,
    fovHorizontalDeg: fov.horizontalDeg,
    fovVerticalDeg: fov.verticalDeg,
    pixelScaleArcsec: fov.pixelScaleArcsec,
    imagingMode,
    filterNames: filterNames.length ? filterNames : ["Unknown"],
    totalIntegrationMinutes,
    plannedFrames: capturedFrames,
    capturedFrames,
    windowStart,
    windowEnd,
    weatherStatus: "unknown",
    weatherScore: 0,
    moonIlluminationPercent: 0,
    whiteNight: false,
    notes: createFitsArchiveNotes(scan, lightFrames, selectedProfile, confidence, language),
    captureMarkdown: createFitsArchiveMarkdown({
      scan,
      lightFrames,
      targetName,
      sessionDate,
      windowStart,
      windowEnd,
      imagingMode,
      filterNames,
      totalIntegrationMinutes,
      selectedProfile,
      fov,
      confidence,
      language
    })
  };

  return {
    payload,
    confidence,
    targetLabel: targetName,
    summary: `${sessionDate} / ${totalIntegrationMinutes} min / ${payload.filterNames.join("+")}${
      qualitySummary ? ` / Q${qualitySummary.averageScore}` : ""
    }`
  };
}

export function mostCommon(values: string[]) {
  if (!values.length) return undefined;
  const counts = values.reduce((accumulator, value) => {
    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

function findTargetMatch(targets: Target[], objectName?: string) {
  if (!objectName) return null;
  const objectAliases = createTextAliases(objectName);
  return (
    targets.find((target) => {
      const aliases = [target.id, target.name, target.catalogId].flatMap(createTextAliases);
      return aliases.some((alias) =>
        objectAliases.some(
          (objectAlias) =>
            alias === objectAlias || objectAlias.includes(alias) || alias.includes(objectAlias)
        )
      );
    }) ?? null
  );
}

function createTextAliases(value: string) {
  const normalized = normalizeText(value);
  const withoutObjectKind = normalizeText(
    value.replace(/\b(nebula|galaxy|cluster|region|remnant|complex)\b/gi, "")
  );
  return Array.from(new Set([normalized, withoutObjectKind].filter(Boolean)));
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeTargetId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "fits-import";
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))
  );
}

function earliestFrame(frames: FitsFrameMetadata[]) {
  return [...frames].sort((left, right) => frameTime(left) - frameTime(right))[0];
}

function latestFrame(frames: FitsFrameMetadata[]) {
  return [...frames].sort((left, right) => frameTime(right) - frameTime(left))[0];
}

function frameTime(frame: FitsFrameMetadata) {
  const parsed = frame.dateObs ? Date.parse(frame.dateObs) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateFromFrame(frame?: FitsFrameMetadata) {
  const match = frame?.dateObs?.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1];
}

function timeFromFrame(frame?: FitsFrameMetadata) {
  const match = frame?.dateObs?.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : undefined;
}

function imagingModeFromFilters(filters: string[], target: Target | null) {
  const normalizedFilters = filters.map((filterName) => filterName.toLowerCase());
  const targetType = target?.type.toLowerCase() ?? "";
  const hasNarrowband = normalizedFilters.some((filterName) =>
    ["ha", "h-alpha", "oiii", "o-iii", "sii", "s-ii", "h-beta", "hbeta"].includes(filterName)
  );
  if (hasNarrowband || targetType.includes("nebula") || targetType.includes("remnant")) return "Narrowband";
  if (["l", "r", "g", "b"].every((filterName) => normalizedFilters.includes(filterName))) return "LRGB";
  if (["r", "g", "b"].every((filterName) => normalizedFilters.includes(filterName))) return "RGB";
  if (normalizedFilters.includes("l") || normalizedFilters.includes("luminance")) return "Luminance";
  return "Captured lights";
}
