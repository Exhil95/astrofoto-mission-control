import { Archive, CheckCircle2, GitCompare, Sparkles, TriangleAlert } from "lucide-react";
import { translateKnownText, translateKnownTexts, translations, type SupportedLanguage } from "../lib/i18n";
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
  language: SupportedLanguage;
};

export function ProcessingPlanner({
  plan,
  capturePlan,
  archives,
  loading,
  language
}: ProcessingPlannerProps) {
  const text = translations[language].processingPlanner;

  return (
    <section className="processing-planner" aria-label={text.aria}>
      <div className="processing-planner-head">
        <div>
          <span>{loading ? text.analyzing : plan.targetName}</span>
          <strong>{text.title}</strong>
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
          {text.gradient}
        </span>
        <strong>
          {plan.gradientRisk} / {plan.gradientScore}
        </strong>
        <em>{plan.warnings[0] ? translateKnownText(language, plan.warnings[0]) : plan.normalization}</em>
      </div>

      <div className="processing-decision-grid" aria-label={text.recommendations}>
        <DecisionCard label={text.stack} value={plan.integrationClass} detail={plan.stackStrategy} />
        <DecisionCard
          label={text.calibration}
          value={`${plan.calibrationMatches.length} ${text.matches}`}
          detail={plan.calibrationStrategy}
        />
        <DecisionCard label={text.scale} value={plan.binning} detail={plan.drizzle} />
        <DecisionCard label={text.normalize} value={plan.normalization} detail={plan.rejection} />
        <DecisionCard label={text.color} value={plan.colorStrategy} detail={plan.noiseReduction} />
        <DecisionCard
          label={text.lights}
          value={`${capturePlan.totalIntegrationMinutes} min`}
          detail={capturePlan.exposureSteps.map((step) => step.filterName).join(" + ")}
        />
      </div>

      <div className="processing-lanes">
        <section aria-label={text.workflow}>
          <div className="processing-section-title">
            <GitCompare size={14} aria-hidden="true" />
            <span>{text.workflow}</span>
          </div>
          <div className="processing-workflow-list">
            {plan.workflow.map((step) => (
              <div key={step.label}>
                <span>{step.label}</span>
                <strong>{step.action}</strong>
                <em>{translateKnownText(language, step.reason)}</em>
              </div>
            ))}
          </div>
        </section>

        <section aria-label={text.calibration}>
          <div className="processing-section-title">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>{text.calibration}</span>
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
          <span>{plan.warnings.length ? translateKnownTexts(language, plan.warnings).join(" / ") : text.cleanPath}</span>
        </div>
        <div>
          <Archive size={14} aria-hidden="true" />
          <span>{archives.length ? `${archives.length} ${text.savedSessions}` : text.noSavedSessions}</span>
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
