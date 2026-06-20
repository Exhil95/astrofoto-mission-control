import { CheckCircle2, Database, FileSearch, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import type { EquipmentProfile } from "../lib/profiles";
import {
  fetchCalibrationLibrary,
  type CalibrationLibraryItem,
  type CalibrationLibraryResult,
  type CapturePlan
} from "../lib/session";

type CalibrationLibraryPanelProps = {
  capturePlan: CapturePlan;
  selectedProfile: EquipmentProfile | null;
  onLibraryChange?: (library: CalibrationLibraryResult) => void;
};

export function CalibrationLibraryPanel({
  capturePlan,
  selectedProfile,
  onLibraryChange
}: CalibrationLibraryPanelProps) {
  const [libraryPath, setLibraryPath] = useState(".");
  const [recursive, setRecursive] = useState(true);
  const [maxFiles, setMaxFiles] = useState(800);
  const [targetTemperature, setTargetTemperature] = useState("-10");
  const [result, setResult] = useState<CalibrationLibraryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const targetFilters = useMemo(
    () => uniqueValues(capturePlan.exposureSteps.map((step) => step.filterName)),
    [capturePlan.exposureSteps]
  );
  const targetExposureSeconds = useMemo(
    () => uniqueNumbers(capturePlan.exposureSteps.map((step) => step.exposureSeconds)),
    [capturePlan.exposureSteps]
  );
  const targetBinning = capturePlan.exposureSteps[0]?.binning ?? null;
  const bestMatches = result?.items.filter((item) => item.matchStatus === "match").length ?? 0;

  const scanLibrary = async () => {
    setLoading(true);
    setError("");
    try {
      const temperature = Number(targetTemperature);
      const library = await fetchCalibrationLibrary({
        path: libraryPath.trim() || ".",
        recursive,
        maxFiles,
        targetFilters,
        targetExposureSeconds,
        targetTemperatureC: Number.isFinite(temperature) ? temperature : null,
        targetBinning,
        targetCamera: selectedProfile?.cameraName ?? null
      });
      setResult(library);
      onLibraryChange?.(library);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Calibration library failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel calibration-library-panel" aria-label="Calibration library">
      <div className="frame-context-head">
        <div>
          <span>{result?.scanPath ?? "Library"}</span>
          <strong>Calibration</strong>
        </div>
        <button type="button" onClick={scanLibrary} disabled={loading} title="Scan calibration library">
          <FileSearch size={15} aria-hidden="true" />
          <span>{loading ? "Scan" : "Scan"}</span>
        </button>
      </div>

      <div className="calibration-controls">
        <label className="calibration-path-field">
          <span>Path</span>
          <input value={libraryPath} onChange={(event) => setLibraryPath(event.target.value)} />
        </label>
        <label>
          <span>Temp</span>
          <input
            value={targetTemperature}
            onChange={(event) => setTargetTemperature(event.target.value)}
            inputMode="decimal"
          />
        </label>
        <label>
          <span>Limit</span>
          <input
            type="number"
            min={1}
            max={4000}
            value={maxFiles}
            onChange={(event) => setMaxFiles(Number(event.target.value))}
          />
        </label>
        <label className="fits-checkbox calibration-recursive">
          <input
            type="checkbox"
            checked={recursive}
            onChange={(event) => setRecursive(event.target.checked)}
          />
          <span>Recursive</span>
        </label>
      </div>

      <div className="calibration-target-strip">
        <Database size={13} aria-hidden="true" />
        <span>{targetFilters.join("+") || "filters"}</span>
        <b>{targetExposureSeconds.map((value) => `${value}s`).join("+") || "exposure"}</b>
      </div>

      {error && (
        <div className="fits-warning is-error">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="calibration-library-summary">
        <span>{result ? `${result.calibrationFrames} frames` : "Awaiting scan"}</span>
        <strong>{result ? `${bestMatches} strong matches` : "No library loaded"}</strong>
        <em>{result?.summary ?? `${targetBinning ?? "binning"} / ${selectedProfile?.cameraName ?? "camera"}`}</em>
      </div>

      <div className="calibration-library-list">
        {result?.items.length ? (
          result.items.slice(0, 6).map((item) => <CalibrationRow item={item} key={itemKey(item)} />)
        ) : (
          <div className="fits-empty">
            <span>No calibration groups</span>
          </div>
        )}
      </div>

      {result?.warnings.length ? (
        <div className="fits-warning">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{result.warnings.join(" / ")}</span>
        </div>
      ) : (
        <div className="fits-warning is-clean">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>{result ? "Calibration coverage looks usable" : "Awaiting calibration scan"}</span>
        </div>
      )}
    </section>
  );
}

function CalibrationRow({ item }: { item: CalibrationLibraryItem }) {
  return (
    <div className={`calibration-row is-${item.matchStatus}`}>
      <span>
        {item.matchStatus} / Q{item.matchScore}
      </span>
      <strong>{calibrationLabel(item)}</strong>
      <em>
        {item.frames} frames / {item.reason}
      </em>
    </div>
  );
}

function calibrationLabel(item: CalibrationLibraryItem) {
  return [
    item.frameType,
    item.filterName,
    item.exposureSeconds !== null ? `${item.exposureSeconds}s` : null,
    item.temperatureRangeC
  ]
    .filter(Boolean)
    .join(" / ");
}

function itemKey(item: CalibrationLibraryItem) {
  return [
    item.frameType,
    item.filterName ?? "all",
    item.exposureSeconds ?? "any",
    item.binning ?? "bin",
    item.camera ?? "camera"
  ].join("-");
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));
}
