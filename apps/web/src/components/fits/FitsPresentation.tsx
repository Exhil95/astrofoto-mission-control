import { CheckCircle2, FolderOpen, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { formatOptionalNumber } from "../../lib/exports/fits";
import {
  translateKnownText,
  translateKnownTexts,
  translations,
  type SupportedLanguage
} from "../../lib/i18n";
import type { FitsFrameMetadata, FitsScanResult } from "../../lib/session";

type FitsIngestText = (typeof translations)[SupportedLanguage]["fitsIngest"];

export function MetricCard({
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

export function FitsFrameGroups({
  result,
  language
}: {
  result: FitsScanResult | null;
  language: SupportedLanguage;
}) {
  const text = translations[language].fitsIngest;

  return (
    <section aria-label="FITS groups">
      <div className="fits-section-title">
        <FolderOpen size={14} aria-hidden="true" />
        <span>{text.groups}</span>
      </div>
      <div className="fits-group-list">
        {result?.groups.length ? (
          result.groups.map((group) => (
            <div key={`${group.label}-${group.totalExposureSeconds}`}>
              <span>
                {group.frames} {text.frames.toLowerCase()}
              </span>
              <strong>{group.label}</strong>
              <em>
                {formatSeconds(group.totalExposureSeconds)} / {group.exposureSeconds.join(", ") || "--"}s
              </em>
            </div>
          ))
        ) : (
          <EmptyState label={text.noGroups} />
        )}
      </div>
    </section>
  );
}

export function FitsFrameList({
  result,
  language
}: {
  result: FitsScanResult | null;
  language: SupportedLanguage;
}) {
  const text = translations[language].fitsIngest;

  return (
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
  );
}

export function FitsScanStatus({
  result,
  language
}: {
  result: FitsScanResult | null;
  language: SupportedLanguage;
}) {
  const text = translations[language].fitsIngest;

  if (result?.warnings.length) {
    return (
      <div className="fits-warning">
        <TriangleAlert size={14} aria-hidden="true" />
        <span>{translateKnownTexts(language, result.warnings).join(" / ")}</span>
      </div>
    );
  }

  return (
    <div className="fits-warning is-clean">
      <CheckCircle2 size={14} aria-hidden="true" />
      <span>{result ? text.metadataConsistent : text.awaitingScan}</span>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fits-warning is-error">
      <TriangleAlert size={14} aria-hidden="true" />
      <span>{message}</span>
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

function frameQualityDetail(frame: FitsFrameMetadata, text: FitsIngestText) {
  if (frame.qualityScore === null) {
    return frame.backgroundAdu !== null ? `BG ${formatOptionalNumber(frame.backgroundAdu)}` : text.qualityMissing;
  }
  return `${frame.starCount ?? 0} ${text.stars} / FWHM ${formatOptionalNumber(
    frame.fwhmPx
  )} / e ${formatOptionalNumber(frame.eccentricity)}`;
}
