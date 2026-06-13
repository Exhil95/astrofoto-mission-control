import type { Target } from "../lib/targets";
import type { SessionPlan } from "../lib/session";

export function SessionTimeline({
  target,
  plan,
  loading
}: {
  target: Target;
  plan: SessionPlan;
  loading: boolean;
}) {
  return (
    <footer className="timeline" aria-label="Session timeline">
      <div className="timeline-target">
        <span>{loading ? "Planning" : plan.nightLabel}</span>
        <strong>{target.name}</strong>
        <em>{plan.recommendation}</em>
        <div className="timeline-score" aria-label="Condition score">
          <span style={{ width: `${plan.conditionScore}%` }} />
        </div>
      </div>
      <div className="timeline-track">
        {plan.slots.map((slot) => (
          <div className="timeline-slot" key={slot.time}>
            <b style={{ opacity: 0.25 + slot.intensity * 0.75 }} />
            <span>{slot.time}</span>
            <strong>{slot.label}</strong>
            <em>{slot.value}</em>
          </div>
        ))}
      </div>
    </footer>
  );
}
