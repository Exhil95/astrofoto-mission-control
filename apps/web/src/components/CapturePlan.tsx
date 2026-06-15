import { CheckSquare, Clipboard, Download, TimerReset } from "lucide-react";
import { useMemo, useState } from "react";
import type { CapturePlan as CapturePlanModel } from "../lib/session";

type CapturePlanProps = {
  plan: CapturePlanModel;
  loading: boolean;
};

export function CapturePlan({ plan, loading }: CapturePlanProps) {
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
          <span>{loading ? "Planning" : plan.date}</span>
          <strong>Capture Plan</strong>
        </div>
        <div className="capture-actions">
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
    </aside>
  );
}
