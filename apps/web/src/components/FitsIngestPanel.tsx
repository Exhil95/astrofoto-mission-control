import {
  Archive,
  CheckCircle2,
  Clock3,
  Database,
  FileDown,
  FileSearch,
  Layers3
} from "lucide-react";
import { useState } from "react";
import {
  ErrorBanner,
  FitsFrameGroups,
  FitsFrameList,
  FitsScanStatus,
  MetricCard
} from "./fits/FitsPresentation";
import { downloadTextFile, slugifyFilename } from "../lib/exports/download";
import {
  createProcessingHandoffMarkdown,
  formatOptionalNumber,
  summarizeQuality
} from "../lib/exports/fits";
import { createArchiveImportDraft, mostCommon } from "../lib/fitsArchive";
import { importLabel } from "../lib/fitsUi";
import type { FovResult } from "../lib/fov";
import { translations, type SupportedLanguage } from "../lib/i18n";
import type { EquipmentProfile } from "../lib/profiles";
import {
  saveSessionArchive,
  scanFitsFrames,
  type CalibrationLibraryResult,
  type FitsScanResult,
  type SessionArchiveEntry,
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
  authToken?: string;
  onArchiveCreated: (archive: SessionArchiveEntry) => void;
};

export function FitsIngestPanel({
  targets,
  selectedProfile,
  settings,
  fov,
  calibrationLibrary,
  language,
  authToken,
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
      const archive = await saveSessionArchive(importDraft.payload, authToken);
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

      <ErrorBanner message={error} />

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
        <FitsFrameGroups result={result} language={language} />
        <FitsFrameList result={result} language={language} />
      </div>

      <FitsScanStatus result={result} language={language} />
    </section>
  );
}
