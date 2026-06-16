import {
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
import {
  scanFitsFrames,
  type FitsFrameMetadata,
  type FitsScanResult
} from "../lib/session";

export function FitsIngestPanel() {
  const [scanPath, setScanPath] = useState(".");
  const [recursive, setRecursive] = useState(true);
  const [maxFiles, setMaxFiles] = useState(250);
  const [result, setResult] = useState<FitsScanResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const runScan = async () => {
    setLoading(true);
    setError("");
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

  const lightMinutes = result ? Math.round(result.totalLightSeconds / 60) : 0;

  return (
    <section className="fits-ingest-panel" aria-label="FITS metadata ingest">
      <div className="fits-ingest-head">
        <div>
          <span>{loading ? "Scanning" : result?.scanPath ?? "Frames"}</span>
          <strong>FITS Ingest</strong>
        </div>
        <button type="button" onClick={runScan} disabled={loading} title="Scan FITS metadata">
          <FileSearch size={16} aria-hidden="true" />
          {loading ? "Scan" : "Scan"}
        </button>
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
