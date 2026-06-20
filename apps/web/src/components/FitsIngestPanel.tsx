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
import type { FovResult } from "../lib/fov";
import type { EquipmentProfile } from "../lib/profiles";
import {
  saveSessionArchive,
  scanFitsFrames,
  type CalibrationLibraryItem,
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
  onArchiveCreated: (archive: SessionArchiveEntry) => void;
};

export function FitsIngestPanel({
  targets,
  selectedProfile,
  settings,
  fov,
  calibrationLibrary,
  onArchiveCreated
}: FitsIngestPanelProps) {
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
      setError(caught instanceof Error ? caught.message : "FITS scan failed");
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
        fov
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
      fov
    });
    downloadTextFile(
      `${sessionDate}-${slugify(targetName)}-processing-handoff.md`,
      markdown,
      "text/markdown;charset=utf-8"
    );
  };

  const lightMinutes = result ? Math.round(result.totalLightSeconds / 60) : 0;
  const qualitySummary = result ? summarizeQuality(result.frames) : null;

  return (
    <section className="fits-ingest-panel" aria-label="FITS metadata ingest">
      <div className="fits-ingest-head">
        <div>
          <span>{loading ? "Scanning" : result?.scanPath ?? "Frames"}</span>
          <strong>FITS Ingest</strong>
        </div>
        <div className="fits-head-actions">
          <button type="button" onClick={runScan} disabled={loading} title="Scan FITS metadata">
            <FileSearch size={16} aria-hidden="true" />
            {loading ? "Scan" : "Scan"}
          </button>
          <button
            type="button"
            onClick={importSession}
            disabled={!importDraft || importState === "saving"}
            title="Import captured session"
          >
            <Archive size={16} aria-hidden="true" />
            {importLabel(importState)}
          </button>
          <button
            type="button"
            onClick={downloadHandoff}
            disabled={!result}
            title="Download processing handoff"
          >
            <FileDown size={16} aria-hidden="true" />
            Handoff
          </button>
        </div>
      </div>

      <div className="fits-scan-controls">
        <label className="fits-path-field">
          <span>Path</span>
          <input
            value={scanPath}
            onChange={(event) => setScanPath(event.target.value)}
            placeholder="."
          />
        </label>
        <label>
          <span>Limit</span>
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
          <span>Recursive</span>
        </label>
      </div>

      {error && (
        <div className="fits-warning is-error">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="fits-metrics" aria-label="FITS summary">
        <MetricCard
          icon={<Database size={15} aria-hidden="true" />}
          label="Parsed"
          value={result ? `${result.parsedFiles}/${result.totalFiles}` : "--"}
          detail={result ? `${result.rejectedFiles} rejected` : "waiting"}
        />
        <MetricCard
          icon={<Clock3 size={15} aria-hidden="true" />}
          label="Lights"
          value={result ? `${lightMinutes} min` : "--"}
          detail={result?.exposureRangeSeconds ?? "exposure"}
        />
        <MetricCard
          icon={<CheckCircle2 size={15} aria-hidden="true" />}
          label="Quality"
          value={qualitySummary ? `Q${qualitySummary.averageScore}` : "--"}
          detail={
            qualitySummary
              ? `${qualitySummary.reviewFrames} review / FWHM ${formatOptionalNumber(
                  qualitySummary.fwhmPx
                )}`
              : result?.cameras.join(" / ") || "waiting"
          }
        />
        <MetricCard
          icon={<Layers3 size={15} aria-hidden="true" />}
          label="Filters"
          value={result?.filters.join(" + ") || "--"}
          detail={result?.objects.join(" / ") || "object"}
        />
      </div>

      <div className={`fits-import-card ${importDraft ? "" : "is-disabled"}`}>
        <div>
          <span>{importDraft ? importDraft.confidence : result ? "No light frames" : "Archive import"}</span>
          <strong>{importDraft?.targetLabel ?? "Import unavailable"}</strong>
          <em>{importDraft?.summary ?? (result ? "Scan needs at least one Light frame" : "Scan a folder to create a captured session")}</em>
        </div>
        <b>{importDraft ? `${importDraft.payload.capturedFrames} frames` : "--"}</b>
      </div>

      <div className="fits-content">
        <section aria-label="FITS groups">
          <div className="fits-section-title">
            <FolderOpen size={14} aria-hidden="true" />
            <span>Groups</span>
          </div>
          <div className="fits-group-list">
            {result?.groups.length ? (
              result.groups.map((group) => (
                <div key={`${group.label}-${group.totalExposureSeconds}`}>
                  <span>{group.frames} frames</span>
                  <strong>{group.label}</strong>
                  <em>
                    {formatSeconds(group.totalExposureSeconds)} /{" "}
                    {group.exposureSeconds.join(", ") || "--"}s
                  </em>
                </div>
              ))
            ) : (
              <EmptyState label="No groups" />
            )}
          </div>
        </section>

        <section aria-label="FITS frame list">
          <div className="fits-section-title">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>Frames</span>
          </div>
          <div className="fits-frame-list">
            {result?.frames.length ? (
              result.frames.slice(0, 12).map((frame) => (
                <FrameRow key={frame.relativePath} frame={frame} />
              ))
            ) : (
              <EmptyState label="No frames" />
            )}
          </div>
        </section>
      </div>

      {result?.warnings.length ? (
        <div className="fits-warning">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{result.warnings.join(" / ")}</span>
        </div>
      ) : (
        <div className="fits-warning is-clean">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>{result ? "Metadata set looks consistent" : "Awaiting scan"}</span>
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

function FrameRow({ frame }: { frame: FitsFrameMetadata }) {
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
        {frame.filterName ?? "No filter"} / {frame.exposureSeconds ?? "--"}s /{" "}
        {frame.sensorTemperatureC ?? "--"}C / {frameQualityDetail(frame)}
        {frameFlags.length ? ` / ${frameFlags[0]}` : ""}
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

function frameQualityDetail(frame: FitsFrameMetadata) {
  if (frame.qualityScore === null) {
    return frame.backgroundAdu !== null ? `BG ${formatOptionalNumber(frame.backgroundAdu)}` : "quality --";
  }
  return `${frame.starCount ?? 0} stars / FWHM ${formatOptionalNumber(
    frame.fwhmPx
  )} / e ${formatOptionalNumber(frame.eccentricity)}`;
}

function summarizeQuality(frames: FitsFrameMetadata[]) {
  const lightFrames = frames.filter((frame) => frame.frameType === "Light");
  const scoredFrames = lightFrames.filter((frame) => frame.qualityScore !== null);
  if (!scoredFrames.length) return null;

  const averageScore = Math.round(
    scoredFrames.reduce((sum, frame) => sum + (frame.qualityScore ?? 0), 0) / scoredFrames.length
  );
  const fwhmPx = medianNumber(scoredFrames.map((frame) => frame.fwhmPx));
  const eccentricity = medianNumber(scoredFrames.map((frame) => frame.eccentricity));
  const starCount = Math.round(
    scoredFrames.reduce((sum, frame) => sum + (frame.starCount ?? 0), 0) / scoredFrames.length
  );
  const reviewFrames = scoredFrames.filter(
    (frame) => frame.status !== "ready" || (frame.qualityScore ?? 100) < 60
  ).length;
  const flags = Array.from(new Set(scoredFrames.flatMap((frame) => frame.qualityFlags)));

  return {
    averageScore,
    fwhmPx,
    eccentricity,
    starCount,
    reviewFrames,
    flags
  };
}

function qualitySummaryLabel(frames: FitsFrameMetadata[]) {
  const summary = summarizeQuality(frames);
  if (!summary) return "Quality: not measured";
  return `Quality: Q${summary.averageScore}, ${summary.starCount} stars avg, FWHM ${formatOptionalNumber(
    summary.fwhmPx
  )}, e ${formatOptionalNumber(summary.eccentricity)}${
    summary.reviewFrames ? `, ${summary.reviewFrames} review` : ""
  }`;
}

function medianNumber(values: Array<number | null>) {
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function formatOptionalNumber(value: number | null) {
  if (value === null) return "--";
  return Number.isInteger(value) ? `${value}` : value.toFixed(value < 1 ? 2 : 1);
}

function createProcessingHandoffMarkdown({
  scan,
  calibrationLibrary,
  targetName,
  sessionDate,
  selectedProfile,
  fov
}: {
  scan: FitsScanResult;
  calibrationLibrary: CalibrationLibraryResult | null;
  targetName: string;
  sessionDate: string;
  selectedProfile: EquipmentProfile | null;
  fov: FovResult;
}) {
  const lightFrames = scan.frames.filter((frame) => frame.frameType === "Light");
  const acceptedLights = lightFrames.filter(isAcceptedLight);
  const reviewLights = lightFrames.filter((frame) => !isAcceptedLight(frame));
  const calibrationFrames = scan.frames.filter(isCalibrationFrame);
  const filters = uniqueNonEmpty(lightFrames.map((frame) => frame.filterName));
  const totalIntegrationMinutes = Math.round(scan.totalLightSeconds / 60);
  const acceptedIntegrationMinutes = Math.round(
    acceptedLights.reduce((sum, frame) => sum + (frame.exposureSeconds ?? 0), 0) / 60
  );

  return [
    `# Processing Handoff: ${targetName}`,
    "",
    "## Session",
    `- Date: ${sessionDate}`,
    `- FITS scan: ${scan.scanPath}`,
    `- Profile: ${selectedProfile?.name ?? "Custom setup"}`,
    `- Camera: ${scan.cameras.join(", ") || selectedProfile?.cameraName || "unknown"}`,
    `- FOV: ${fov.horizontalDeg.toFixed(2)} x ${fov.verticalDeg.toFixed(2)} deg`,
    `- Filters: ${filters.join(", ") || "Unknown"}`,
    `- Integration: ${totalIntegrationMinutes} min scanned / ${acceptedIntegrationMinutes} min accepted`,
    `- ${qualitySummaryLabel(lightFrames)}`,
    "",
    "## Quality Gate",
    `- Accepted lights: ${acceptedLights.length}`,
    `- Review/reject lights: ${reviewLights.length}`,
    "- Reject or isolate frames marked with low Q, elongated stars, sparse stars, clipping, clouds, or inconsistent metadata.",
    "- Keep review frames out of the first stack. Re-test them only if the final integration is too shallow.",
    "",
    "## PixInsight WBPP Checklist",
    "- Add accepted Light frames only. Use FILTER, EXPTIME, CCD-TEMP, GAIN/OFFSET, and BINNING keywords for grouping.",
    "- Add master or raw Bias/Dark/Flat frames from the calibration section below.",
    "- Enable Subframe Weighting and Local Normalization when gradients or passing cloud risk is visible.",
    "- Use CosmeticCorrection only after checking hot-pixel behavior against matched darks.",
    "- Run Blink/SubframeSelector on the review list before deciding whether any borderline frame returns to the set.",
    "",
    "## Siril Outline",
    "```text",
    ...createSirilOutline(filters),
    "```",
    "",
    "## Light Groups",
    ...createLightGroupLines(lightFrames),
    "",
    "## Accepted Light Manifest",
    ...createFrameManifest(acceptedLights, true),
    "",
    "## Review Light Manifest",
    ...(reviewLights.length ? createFrameManifest(reviewLights, true) : ["- none"]),
    "",
    "## Calibration Frames In Current Scan",
    ...createCalibrationFrameLines(calibrationFrames),
    "",
    "## Calibration Library Matches",
    ...createCalibrationLibraryLines(calibrationLibrary),
    "",
    "## Scan Warnings",
    ...(scan.warnings.length ? scan.warnings.map((warning) => `- ${warning}`) : ["- none"])
  ].join("\n");
}

function isAcceptedLight(frame: FitsFrameMetadata) {
  return frame.status === "ready" && (frame.qualityScore === null || frame.qualityScore >= 60);
}

function isCalibrationFrame(frame: FitsFrameMetadata) {
  return ["Flat", "Dark flat", "Dark", "Bias"].includes(frame.frameType);
}

function createSirilOutline(filters: string[]) {
  const filterList = filters.length ? filters : ["filter"];
  return filterList.flatMap((filterName) => {
    const filterSlug = slugify(filterName);
    return [
      `# ${filterName}`,
      `# Stage accepted ${filterName} lights in work/lights/${filterSlug}`,
      `convert work/lights/${filterSlug} -out=lights_${filterSlug}`,
      `preprocess lights_${filterSlug} -bias=master_bias -dark=master_dark -flat=master_flat_${filterSlug}`,
      `register pp_lights_${filterSlug}`,
      `stack r_pp_lights_${filterSlug} rej 3 3 -norm=addscale`,
      ""
    ];
  });
}

function createLightGroupLines(frames: FitsFrameMetadata[]) {
  const groups = groupFrames(frames, (frame) =>
    [frame.filterName ?? "No filter", `${frame.exposureSeconds ?? "--"}s`, frame.binning ?? "binning --"].join(" / ")
  );

  if (!groups.length) return ["- none"];
  return groups.map(({ key, frames: groupFrames }) => {
    const integrationMinutes = Math.round(
      groupFrames.reduce((sum, frame) => sum + (frame.exposureSeconds ?? 0), 0) / 60
    );
    const acceptedCount = groupFrames.filter(isAcceptedLight).length;
    return `- ${key}: ${groupFrames.length} frames, ${acceptedCount} accepted, ${integrationMinutes} min`;
  });
}

function createFrameManifest(frames: FitsFrameMetadata[], includeQuality: boolean) {
  if (!frames.length) return ["- none"];
  return frames.map((frame) => {
    const quality = includeQuality ? ` / Q${frame.qualityScore ?? "--"} / ${frameReviewReason(frame)}` : "";
    return `- ${frame.relativePath} | ${frame.filterName ?? "No filter"} | ${
      frame.exposureSeconds ?? "--"
    }s${quality}`;
  });
}

function createCalibrationFrameLines(frames: FitsFrameMetadata[]) {
  const groups = groupFrames(frames, (frame) =>
    [
      frame.frameType,
      frame.filterName ?? "all filters",
      frame.exposureSeconds !== null ? `${frame.exposureSeconds}s` : "exposure --",
      frame.sensorTemperatureC !== null ? `${frame.sensorTemperatureC}C` : "temp --"
    ].join(" / ")
  );

  if (!groups.length) return ["- none in current scan"];
  return groups.map(({ key, frames: groupFrames }) => `- ${key}: ${groupFrames.length} frames`);
}

function createCalibrationLibraryLines(library: CalibrationLibraryResult | null) {
  if (!library) return ["- No separate calibration library scan attached"];
  const rows = [
    `- Library scan: ${library.scanPath}`,
    `- ${library.summary}`,
    ...library.items.slice(0, 12).map(formatCalibrationLibraryItem)
  ];
  if (library.warnings.length) {
    rows.push(...library.warnings.map((warning) => `- Warning: ${warning}`));
  }
  return rows;
}

function formatCalibrationLibraryItem(item: CalibrationLibraryItem) {
  return `- ${item.matchStatus} Q${item.matchScore}: ${[
    item.frameType,
    item.filterName,
    item.exposureSeconds !== null ? `${item.exposureSeconds}s` : null,
    item.temperatureRangeC
  ]
    .filter(Boolean)
    .join(" / ")} (${item.frames} frames, ${item.reason})`;
}

function frameReviewReason(frame: FitsFrameMetadata) {
  const reasons = [...frame.qualityFlags, ...frame.warnings];
  if (frame.qualityScore !== null && frame.qualityScore < 60) reasons.unshift("low quality score");
  return reasons.length ? reasons.join(", ") : "accepted";
}

function groupFrames<T>(items: T[], keyFor: (item: T) => string) {
  const grouped = items.reduce((accumulator, item) => {
    const key = keyFor(item);
    const group = accumulator.get(key) ?? [];
    group.push(item);
    accumulator.set(key, group);
    return accumulator;
  }, new Map<string, T[]>());
  return [...grouped.entries()].map(([key, frames]) => ({ key, frames }));
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "session";
}

function importLabel(state: "idle" | "saving" | "saved" | "failed") {
  if (state === "saving") return "Saving";
  if (state === "saved") return "Saved";
  if (state === "failed") return "Retry";
  return "Import";
}

function createArchiveImportDraft({
  scan,
  targets,
  selectedProfile,
  settings,
  fov
}: {
  scan: FitsScanResult;
  targets: Target[];
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
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
    notes: createFitsArchiveNotes(scan, lightFrames, selectedProfile, confidence),
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
      confidence
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

function createFitsArchiveNotes(
  scan: FitsScanResult,
  lightFrames: FitsFrameMetadata[],
  profile: EquipmentProfile | null,
  confidence: string
) {
  return [
    `FITS import: ${confidence}`,
    `Scan path: ${scan.scanPath}`,
    `Lights: ${lightFrames.length} frames, ${Math.round(scan.totalLightSeconds / 60)} min`,
    qualitySummaryLabel(lightFrames),
    `Camera: ${scan.cameras.join(", ") || "unknown"}`,
    `Temperature: ${scan.temperatureRangeC ?? "unknown"}`,
    `Profile: ${profile?.name ?? "Custom setup"}`,
    scan.warnings.length ? `Warnings: ${scan.warnings.join(" / ")}` : "Warnings: none"
  ].join("\n");
}

function createFitsArchiveMarkdown({
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
  confidence
}: {
  scan: FitsScanResult;
  lightFrames: FitsFrameMetadata[];
  targetName: string;
  sessionDate: string;
  windowStart: string;
  windowEnd: string;
  imagingMode: string;
  filterNames: string[];
  totalIntegrationMinutes: number;
  selectedProfile: EquipmentProfile | null;
  fov: FovResult;
  confidence: string;
}) {
  const groupLines = scan.groups
    .map(
      (group) =>
        `- ${group.label}: ${group.frames} frames / ${formatSeconds(group.totalExposureSeconds)} / ${group.exposureSeconds.join(", ") || "--"}s`
    )
    .join("\n");
  const filterSummary = filterNames.length ? filterNames.join(", ") : "Unknown";

  return [
    `# Captured Session: ${targetName}`,
    "",
    `- Date: ${sessionDate}`,
    `- Window: ${windowStart} - ${windowEnd}`,
    `- Mode: ${imagingMode}`,
    `- Lights: ${lightFrames.length} frames`,
    `- Integration: ${totalIntegrationMinutes} min`,
    `- Filters: ${filterSummary}`,
    `- ${qualitySummaryLabel(lightFrames)}`,
    `- Camera: ${scan.cameras.join(", ") || "unknown"}`,
    `- Temperature: ${scan.temperatureRangeC ?? "unknown"}`,
    `- Profile: ${selectedProfile?.name ?? "Custom setup"}`,
    `- FOV: ${fov.horizontalDeg.toFixed(2)} x ${fov.verticalDeg.toFixed(2)} deg`,
    `- Import confidence: ${confidence}`,
    "",
    "## Frame groups",
    groupLines || "- No groups",
    "",
    "## Warnings",
    scan.warnings.length ? scan.warnings.map((warning) => `- ${warning}`).join("\n") : "- none"
  ].join("\n");
}
