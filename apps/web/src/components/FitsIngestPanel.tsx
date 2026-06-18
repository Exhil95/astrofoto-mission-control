import {
  Archive,
  CheckCircle2,
  Clock3,
  Database,
  FileSearch,
  FolderOpen,
  Layers3,
  Thermometer,
  TriangleAlert
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { FovResult } from "../lib/fov";
import type { EquipmentProfile } from "../lib/profiles";
import {
  saveSessionArchive,
  scanFitsFrames,
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
  onArchiveCreated: (archive: SessionArchiveEntry) => void;
};

export function FitsIngestPanel({
  targets,
  selectedProfile,
  settings,
  fov,
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

  const lightMinutes = result ? Math.round(result.totalLightSeconds / 60) : 0;

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
          icon={<Thermometer size={15} aria-hidden="true" />}
          label="Sensor"
          value={result?.temperatureRangeC ?? "--"}
          detail={result?.cameras.join(" / ") || "camera"}
        />
        <MetricCard
          icon={<Layers3 size={15} aria-hidden="true" />}
          label="Filters"
          value={result?.filters.join(" + ") || "--"}
          detail={result?.objects.join(" / ") || "object"}
        />
      </div>

      {result && (
        <div className={`fits-import-card ${importDraft ? "" : "is-disabled"}`}>
          <div>
            <span>{importDraft ? importDraft.confidence : "No light frames"}</span>
            <strong>{importDraft?.targetLabel ?? "Import unavailable"}</strong>
            <em>{importDraft?.summary ?? "Scan needs at least one Light frame"}</em>
          </div>
          <b>{importDraft ? `${importDraft.payload.capturedFrames} frames` : "--"}</b>
        </div>
      )}

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
  return (
    <div className={frame.status === "ready" ? "" : "needs-review"}>
      <span>{frame.frameType}</span>
      <strong>{frame.fileName}</strong>
      <em>
        {frame.filterName ?? "No filter"} / {frame.exposureSeconds ?? "--"}s /{" "}
        {frame.sensorTemperatureC ?? "--"}C
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
    summary: `${sessionDate} / ${totalIntegrationMinutes} min / ${payload.filterNames.join("+")}`
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
