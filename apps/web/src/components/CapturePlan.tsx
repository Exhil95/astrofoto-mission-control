import {
  Archive,
  CheckSquare,
  Clipboard,
  Download,
  Layers,
  Sparkles,
  TimerReset,
  TriangleAlert
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  CapturePlan as CapturePlanModel,
  ProcessingPlan,
  SessionArchiveEntry
} from "../lib/session";

type CapturePlanProps = {
  plan: CapturePlanModel;
  loading: boolean;
  processingPlan: ProcessingPlan;
  processingLoading: boolean;
  archiveState: "idle" | "saving" | "saved" | "failed";
  archives: SessionArchiveEntry[];
  onArchive: () => void;
};

export function CapturePlan({
  plan,
  loading,
  processingPlan,
  processingLoading,
  archiveState,
  archives,
  onArchive
}: CapturePlanProps) {
  const [activeView, setActiveView] = useState<"capture" | "process">("capture");
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");
  const filename = useMemo(
    () => `${plan.date}-${plan.targetName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`,
    [plan.date, plan.targetName]
  );

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(plan.exportMarkdown);
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const downloadMarkdown = () => {
    const blob = new Blob([plan.exportMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="capture-plan" aria-label="Capture plan">
      <div className="capture-head">
        <div>
          <span>{loading || processingLoading ? "Planning" : plan.date}</span>
          <strong>{activeView === "capture" ? "Capture Plan" : "Processing"}</strong>
        </div>
        <div className="capture-view-tabs" aria-label="Capture panel view">
          <button
            className={activeView === "capture" ? "is-active" : ""}
            type="button"
            title="Capture plan"
            onClick={() => setActiveView("capture")}
          >
            <Layers size={13} aria-hidden="true" />
            Capture
          </button>
          <button
            className={activeView === "process" ? "is-active" : ""}
            type="button"
            title="Processing plan"
            onClick={() => setActiveView("process")}
          >
            <Sparkles size={13} aria-hidden="true" />
            Process
          </button>
        </div>
        <div className="capture-actions">
          <button
            type="button"
            onClick={onArchive}
            title="Save session archive"
            disabled={archiveState === "saving"}
          >
            <Archive size={14} aria-hidden="true" />
            <span>{archiveLabel(archiveState)}</span>
          </button>
          <button type="button" onClick={copyMarkdown} title="Copy Markdown">
            <Clipboard size={14} aria-hidden="true" />
            <span>{copyState === "done" ? "Copied" : copyState === "failed" ? "Retry" : "Copy"}</span>
          </button>
          <button type="button" onClick={downloadMarkdown} title="Download Markdown">
            <Download size={14} aria-hidden="true" />
            <span>MD</span>
          </button>
        </div>
      </div>

      {activeView === "capture" ? (
        <>
          <div className="capture-summary">
            <span>{plan.imagingMode}</span>
            <strong>
              {plan.windowStart} - {plan.windowEnd} / {plan.totalIntegrationMinutes} min
            </strong>
            <em>{plan.framingNote}</em>
          </div>

          <div className="capture-lights" aria-label="Light frames">
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
              {plan.calibrationFrames.length} cal / {plan.checklist.length} checks
            </span>
          </div>

          {archives.length > 0 && (
            <div className="archive-strip" aria-label="Recent session archive">
              {archives.slice(0, 2).map((archive) => (
                <div className="archive-chip" key={archive.id}>
                  <span>{archive.status}</span>
                  <strong>{archive.targetName}</strong>
                  <em>
                    {archive.sessionDate} / {archive.totalIntegrationMinutes}m /{" "}
                    {archive.filterNames.join("+")}
                  </em>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <ProcessingView plan={processingPlan} />
      )}
    </aside>
  );
}

function archiveLabel(state: CapturePlanProps["archiveState"]) {
  if (state === "saving") return "Saving";
  if (state === "saved") return "Saved";
  if (state === "failed") return "Retry";
  return "Log";
}

function ProcessingView({ plan }: { plan: ProcessingPlan }) {
  const firstWarning = plan.warnings[0];

  return (
    <>
      <div className={`processing-risk ${plan.gradientRisk.toLowerCase()}`}>
        <span>
          <TriangleAlert size={13} aria-hidden="true" />
          Gradient
        </span>
        <strong>
          {plan.gradientRisk} / {plan.gradientScore}
        </strong>
        <em>{firstWarning ?? plan.normalization}</em>
      </div>

      <div className="processing-grid" aria-label="Processing recommendations">
        <div>
          <span>Stack</span>
          <strong>{plan.integrationClass}</strong>
          <em>{plan.stackStrategy}</em>
        </div>
        <div>
          <span>Scale</span>
          <strong>{plan.binning}</strong>
          <em>{plan.drizzle}</em>
        </div>
        <div>
          <span>Calibration</span>
          <strong>{plan.calibrationMatches.length} matches</strong>
          <em>{plan.calibrationStrategy}</em>
        </div>
        <div>
          <span>Color</span>
          <strong>{plan.colorStrategy}</strong>
          <em>{plan.noiseReduction}</em>
        </div>
      </div>

      <div className="processing-workflow" aria-label="Processing workflow">
        {plan.workflow.slice(0, 3).map((step) => (
          <div key={step.label}>
            <span>{step.label}</span>
            <strong>{step.action}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
