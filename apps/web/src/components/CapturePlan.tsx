import { Archive, CheckSquare, Clipboard, Download, TimerReset } from "lucide-react";
import { useMemo, useState } from "react";
import {
  translateArchiveStatus,
  translations,
  type SupportedLanguage
} from "../lib/i18n";
import { downloadTextFile, slugifyFilename } from "../lib/exports/download";
import { createCaptureMarkdown } from "../lib/exports/markdown";
import type { CapturePlan as CapturePlanModel, SessionArchiveEntry } from "../lib/session";

type CapturePlanProps = {
  plan: CapturePlanModel;
  loading: boolean;
  language: SupportedLanguage;
  archiveState: "idle" | "saving" | "saved" | "failed";
  archives: SessionArchiveEntry[];
  onArchive: () => void;
};

export function CapturePlan({
  plan,
  loading,
  language,
  archiveState,
  archives,
  onArchive
}: CapturePlanProps) {
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");
  const text = translations[language].capturePlan;
  const markdown = useMemo(() => createCaptureMarkdown(plan, language), [plan, language]);
  const filename = useMemo(
    () => `${plan.date}-${slugifyFilename(plan.targetName)}.md`,
    [plan.date, plan.targetName]
  );

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const downloadMarkdown = () => {
    downloadTextFile(filename, markdown, "text/markdown;charset=utf-8");
  };

  return (
    <aside className="capture-plan" aria-label={text.aria}>
      <div className="capture-head">
        <div>
          <span>{loading ? text.planning : plan.date}</span>
          <strong>{text.title}</strong>
        </div>
        <div className="capture-actions">
          <button
            type="button"
            onClick={onArchive}
            title={text.saveSessionArchive}
            disabled={archiveState === "saving"}
          >
            <Archive size={14} aria-hidden="true" />
            <span>{archiveLabel(archiveState, text)}</span>
          </button>
          <button type="button" onClick={copyMarkdown} title={text.copyMarkdown}>
            <Clipboard size={14} aria-hidden="true" />
            <span>{copyState === "done" ? text.copied : copyState === "failed" ? text.retry : text.copy}</span>
          </button>
          <button type="button" onClick={downloadMarkdown} title={text.downloadMarkdown}>
            <Download size={14} aria-hidden="true" />
            <span>MD</span>
          </button>
        </div>
      </div>

      <div className="capture-summary">
        <span>{plan.imagingMode}</span>
        <strong>
          {plan.windowStart} - {plan.windowEnd} / {plan.totalIntegrationMinutes} min
        </strong>
        <em>{plan.framingNote}</em>
      </div>

      <div className="capture-lights" aria-label={text.lightFrames}>
        {plan.exposureSteps.slice(0, 4).map((step) => (
          <div className="capture-light" key={step.filterName}>
            <span>{step.filterName}</span>
            <strong>
              {step.frames} x {step.exposureSeconds}s
            </strong>
            <em>{step.integrationMinutes} min</em>
          </div>
        ))}
      </div>

      <div className="capture-footer">
        <span>
          <TimerReset size={13} aria-hidden="true" />
          AF {plan.autofocusEveryMinutes}m / D{plan.ditheringEveryFrames}
        </span>
        <span>
          <CheckSquare size={13} aria-hidden="true" />
          {plan.calibrationFrames.length} {text.cal} / {plan.checklist.length} {text.checks}
        </span>
      </div>

      {archives.length > 0 && (
        <div className="archive-strip" aria-label={text.recentArchive}>
          {archives.slice(0, 2).map((archive) => (
            <div className="archive-chip" key={archive.id}>
              <span>{translateArchiveStatus(language, archive.status)}</span>
              <strong>{archive.targetName}</strong>
              <em>
                {archive.sessionDate} / {archive.totalIntegrationMinutes}m / {archive.filterNames.join("+")}
              </em>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function archiveLabel(
  state: CapturePlanProps["archiveState"],
  text: (typeof translations)[SupportedLanguage]["capturePlan"]
) {
  if (state === "saving") return text.saving;
  if (state === "saved") return text.saved;
  if (state === "failed") return text.retry;
  return text.log;
}
