import { Archive, CheckCircle2, GitCompare, Sparkles, TriangleAlert } from "lucide-react";
import type {
  CapturePlan,
  ProcessingPlan,
  SessionArchiveEntry
} from "../lib/session";

type ProcessingPlannerProps = {
  plan: ProcessingPlan;
  capturePlan: CapturePlan;
  archives: SessionArchiveEntry[];
  loading: boolean;
};

export function ProcessingPlanner({
  plan,
  capturePlan,
  archives,
  loading
}: ProcessingPlannerProps) {
  return (
    <section className="processing-planner" aria-label="Processing planner">
      <div className="processing-planner-head">
        <div>
          <span>{loading ? "Analyzing" : plan.targetName}</span>
          <strong>Processing Planner</strong>
        </div>
        <div className={`processing-score ${plan.gradientRisk.toLowerCase()}`}>
          <TriangleAlert size={15} aria-hidden="true" />
          <span>{plan.gradientRisk}</span>
          <strong>{plan.gradientScore}</strong>
        </div>
      </div>

      <div className={`processing-risk ${plan.gradientRisk.toLowerCase()}`}>
        <span>
          <TriangleAlert size={14} aria-hidden="true" />
          Gradient
        </span>
        <strong>
          {plan.gradientRisk} / {plan.gradientScore}
        </strong>
        <em>{plan.warnings[0] ?? plan.normalization}</em>
      </div>

      <div className="processing-decision-grid" aria-label="Processing recommendations">
        <DecisionCard label="Stack" value={plan.integrationClass} detail={plan.stackStrategy} />
        <DecisionCard label="Calibration" value={`${plan.calibrationMatches.length} matches`} detail={plan.calibrationStrategy} />
        <DecisionCard label="Scale" value={plan.binning} detail={plan.drizzle} />
        <DecisionCard label="Normalize" value={plan.normalization} detail={plan.rejection} />
        <DecisionCard label="Color" value={plan.colorStrategy} detail={plan.noiseReduction} />
        <DecisionCard
          label="Lights"
          value={`${capturePlan.totalIntegrationMinutes} min`}
          detail={capturePlan.exposureSteps.map((step) => step.filterName).join(" + ")}
        />
      </div>

      <div className="processing-lanes">
        <section aria-label="Processing workflow">
          <div className="processing-section-title">
            <GitCompare size={14} aria-hidden="true" />
            <span>Workflow</span>
          </div>
          <div className="processing-workflow-list">
            {plan.workflow.map((step) => (
              <div key={step.label}>
                <span>{step.label}</span>
                <strong>{step.action}</strong>
                <em>{step.reason}</em>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Calibration matches">
          <div className="processing-section-title">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>Calibration</span>
          </div>
          <div className="calibration-match-list">
            {plan.calibrationMatches.map((match) => (
              <div key={match.frameType}>
                <span>{match.priority}</span>
                <strong>{match.frameType}</strong>
                <em>{match.recommendation}</em>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="processing-footer">
        <div>
          <Sparkles size={14} aria-hidden="true" />
          <span>{plan.warnings.length ? plan.warnings.join(" / ") : "Clean processing path"}</span>
        </div>
        <div>
          <Archive size={14} aria-hidden="true" />
          <span>{archives.length ? `${archives.length} saved sessions` : "No saved sessions"}</span>
        </div>
      </div>
    </section>
  );
}

function DecisionCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </div>
  );
}
