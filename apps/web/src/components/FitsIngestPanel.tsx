import {
  Archive,
  CheckCircle2,
  Clock3,
  Database,
  FileDown,
  FileSearch,
  FolderOpen,
  Layers3,
  TriangleAlert
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { downloadTextFile, slugifyFilename } from "../lib/exports/download";
import {
  createFitsArchiveMarkdown,
  createFitsArchiveNotes,
  createProcessingHandoffMarkdown,
  formatOptionalNumber,
  summarizeQuality
} from "../lib/exports/fits";
import type { FovResult } from "../lib/fov";
import {
  translateKnownText,
  translateKnownTexts,
  translations,
  type SupportedLanguage
} from "../lib/i18n";
import type { EquipmentProfile } from "../lib/profiles";
import {
  saveSessionArchive,
  scanFitsFrames,
  type CalibrationLibraryResult,
  type FitsFrameMetadata,
  type FitsScanResult,
  type SessionArchiveEntry,
  type SessionArchivePayload,
  type SessionSettings
} from "../lib/session";
import type { Target } from "../lib/targets";

type FitsIngestPanelProps = {
  targets: Target[];
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
  calibrationLibrary: CalibrationLibraryResult | null;
  language: SupportedLanguage;
  onArchiveCreated: (archive: SessionArchiveEntry) => void;
};

export function FitsIngestPanel({
  targets,
  selectedProfile,
  settings,
  fov,
  calibrationLibrary,
  language,
  onArchiveCreated
}: FitsIngestPanelProps) {
  const text = translations[language].fitsIngest;
  const common = translations[language].common;
  const [scanPath, setScanPath] = useState(".");
  const [recursive, setRecursive] = useState(true);
  const [maxFiles, setMaxFiles] = useState(250);
  const [result, setResult] = useState<FitsScanResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [importState, setImportState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  const runScan = async () => {
    setLoading(true);
    setError("");
    setImportState("idle");
    try {
      const scan = await scanFitsFrames({
        path: scanPath.trim() || ".",
        recursive,
        maxFiles
      });
      setResult(scan);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.failed);
    } finally {
      setLoading(false);
    }
  };

  const importDraft = result
    ? createArchiveImportDraft({
        scan: result,
        targets,
        selectedProfile,
        settings,
        fov,
        language
      })
    : null;

  const importSession = async () => {
    if (!importDraft) return;
    setImportState("saving");
    try {
      const archive = await saveSessionArchive(importDraft.payload);
      onArchiveCreated(archive);
      setImportState("saved");
      window.setTimeout(() => setImportState("idle"), 1600);
    } catch {
      setImportState("failed");
    }
  };

  const downloadHandoff = () => {
    if (!result) return;
    const targetName = importDraft?.targetLabel ?? mostCommon(result.objects) ?? "captured-session";
    const sessionDate = importDraft?.payload.sessionDate ?? settings.date;
    const markdown = createProcessingHandoffMarkdown({
      scan: result,
      calibrationLibrary,
      targetName,
      sessionDate,
      selectedProfile,
      fov,
      language
    });
    downloadTextFile(
      `${sessionDate}-${slugifyFilename(targetName)}-processing-handoff.md`,
      markdown,
      "text/markdown;charset=utf-8"
    );
  };

  const lightMinutes = result ? Math.round(result.totalLightSeconds / 60) : 0;
  const qualitySummary = result ? summarizeQuality(result.frames) : null;

  return (
    <section className="fits-ingest-panel" aria-label={text.aria}>
      <div className="fits-ingest-head">
        <div>
          <span>{loading ? text.scanning : result?.scanPath ?? text.frames}</span>
          <strong>{text.title}</strong>
        </div>
        <div className="fits-head-actions">
          <button type="button" onClick={runScan} disabled={loading} title={text.scanTitle}>
            <FileSearch size={16} aria-hidden="true" />
            {text.scan}
          </button>
          <button
            type="button"
            onClick={importSession}
            disabled={!importDraft || importState === "saving"}
            title={text.importTitle}
          >
            <Archive size={16} aria-hidden="true" />
            {importLabel(importState, text)}
          </button>
          <button
            type="button"
            onClick={downloadHandoff}
            disabled={!result}
            title={text.handoffTitle}
          >
            <FileDown size={16} aria-hidden="true" />
            {text.handoff}
          </button>
        </div>
      </div>

      <div className="fits-scan-controls">
        <label className="fits-path-field">
          <span>{text.path}</span>
          <input
            value={scanPath}
            onChange={(event) => setScanPath(event.target.value)}
            placeholder="."
          />
        </label>
        <label>
          <span>{text.limit}</span>
          <input
            type="number"
            min={1}
            max={2000}
            value={maxFiles}
            onChange={(event) => setMaxFiles(Number(event.target.value))}
          />
        </label>
        <label className="fits-checkbox">
          <input
            type="checkbox"
            checked={recursive}
            onChange={(event) => setRecursive(event.target.checked)}
          />
          <span>{text.recursive}</span>
        </label>
      </div>

      {error && (
        <div className="fits-warning is-error">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="fits-metrics" aria-label={text.summary}>
        <MetricCard
          icon={<Database size={15} aria-hidden="true" />}
          label={text.parsed}
          value={result ? `${result.parsedFiles}/${result.totalFiles}` : "--"}
          detail={result ? `${result.rejectedFiles} ${text.rejected}` : common.waiting}
        />
        <MetricCard
          icon={<Clock3 size={15} aria-hidden="true" />}
          label={text.lights}
          value={result ? `${lightMinutes} min` : "--"}
          detail={result?.exposureRangeSeconds ?? text.exposure}
        />
        <MetricCard
          icon={<CheckCircle2 size={15} aria-hidden="true" />}
          label={text.quality}
          value={qualitySummary ? `Q${qualitySummary.averageScore}` : "--"}
          detail={
            qualitySummary
              ? `${qualitySummary.reviewFrames} ${text.review} / FWHM ${formatOptionalNumber(
                  qualitySummary.fwhmPx
                )}`
              : result?.cameras.join(" / ") || common.waiting
          }
        />
        <MetricCard
          icon={<Layers3 size={15} aria-hidden="true" />}
          label={text.filters}
          value={result?.filters.join(" + ") || "--"}
          detail={result?.objects.join(" / ") || text.object}
        />
      </div>

      <div className={`fits-import-card ${importDraft ? "" : "is-disabled"}`}>
        <div>
          <span>{importDraft ? importDraft.confidence : result ? text.noLightFrames : text.archiveImport}</span>
          <strong>{importDraft?.targetLabel ?? text.importUnavailable}</strong>
          <em>{importDraft?.summary ?? (result ? text.scanNeedsLight : text.scanCreateArchive)}</em>
        </div>
        <b>{importDraft ? `${importDraft.payload.capturedFrames} ${text.frames.toLowerCase()}` : "--"}</b>
      </div>

      <div className="fits-content">
        <section aria-label="FITS groups">
          <div className="fits-section-title">
            <FolderOpen size={14} aria-hidden="true" />
            <span>{text.groups}</span>
          </div>
          <div className="fits-group-list">
            {result?.groups.length ? (
              result.groups.map((group) => (
                <div key={`${group.label}-${group.totalExposureSeconds}`}>
                  <span>{group.frames} {text.frames.toLowerCase()}</span>
                  <strong>{group.label}</strong>
                  <em>
                    {formatSeconds(group.totalExposureSeconds)} /{" "}
                    {group.exposureSeconds.join(", ") || "--"}s
                  </em>
                </div>
              ))
            ) : (
              <EmptyState label={text.noGroups} />
            )}
          </div>
        </section>

        <section aria-label="FITS frame list">
          <div className="fits-section-title">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>{text.frames}</span>
          </div>
          <div className="fits-frame-list">
            {result?.frames.length ? (
              result.frames.slice(0, 12).map((frame) => (
                <FrameRow key={frame.relativePath} frame={frame} language={language} />
              ))
            ) : (
              <EmptyState label={text.noFrames} />
            )}
          </div>
        </section>
      </div>

      {result?.warnings.length ? (
        <div className="fits-warning">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{translateKnownTexts(language, result.warnings).join(" / ")}</span>
        </div>
      ) : (
        <div className="fits-warning is-clean">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>{result ? text.metadataConsistent : text.awaitingScan}</span>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </div>
  );
}

function FrameRow({ frame, language }: { frame: FitsFrameMetadata; language: SupportedLanguage }) {
  const text = translations[language].fitsIngest;
  const scoreLabel = frame.qualityScore !== null ? ` / Q${frame.qualityScore}` : "";
  const frameFlags = [...frame.warnings, ...frame.qualityFlags];
  return (
    <div className={frame.status === "ready" ? "" : "needs-review"}>
      <span>
        {frame.frameType}
        {scoreLabel}
      </span>
      <strong>{frame.fileName}</strong>
      <em>
        {frame.filterName ?? text.noFilter} / {frame.exposureSeconds ?? "--"}s /{" "}
        {frame.sensorTemperatureC ?? "--"}C / {frameQualityDetail(frame, text)}
        {frameFlags.length ? ` / ${translateKnownText(language, frameFlags[0])}` : ""}
      </em>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="fits-empty">
      <span>{label}</span>
    </div>
  );
}

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.round(seconds / 60)}m`;
}

function frameQualityDetail(
  frame: FitsFrameMetadata,
  text: (typeof translations)[SupportedLanguage]["fitsIngest"]
) {
  if (frame.qualityScore === null) {
    return frame.backgroundAdu !== null ? `BG ${formatOptionalNumber(frame.backgroundAdu)}` : text.qualityMissing;
  }
  return `${frame.starCount ?? 0} ${text.stars} / FWHM ${formatOptionalNumber(
    frame.fwhmPx
  )} / e ${formatOptionalNumber(frame.eccentricity)}`;
}

function importLabel(
  state: "idle" | "saving" | "saved" | "failed",
  text: (typeof translations)[SupportedLanguage]["fitsIngest"]
) {
  if (state === "saving") return text.saving;
  if (state === "saved") return text.saved;
  if (state === "failed") return text.retry;
  return text.import;
}

function createArchiveImportDraft({
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
}) {
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

function mostCommon(values: string[]) {
  if (!values.length) return undefined;
  const counts = values.reduce((accumulator, value) => {
    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
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
