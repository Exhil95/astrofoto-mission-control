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
      <AltitudeChart plan={plan} />
      <div className="timeline-track">
        {plan.slots.map((slot) => (
          <div className="timeline-slot" key={`${slot.time}-${slot.label}`}>
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

function AltitudeChart({ plan }: { plan: SessionPlan }) {
  const points = plan.altitudeCurve.length ? plan.altitudeCurve : [];
  const polyline = points
    .map((point, index) => {
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
      const y = 100 - normalizeAltitude(point.targetAltitudeDeg) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const peak = points.reduce(
    (best, point) => (point.targetAltitudeDeg > best.targetAltitudeDeg ? point : best),
    points[0] ?? { time: "--:--", targetAltitudeDeg: 0, sunAltitudeDeg: 0, darkness: "daylight" }
  );
  const peakSlot = plan.slots.find((slot) => slot.label === "Peak");

  return (
    <div className="altitude-chart" aria-label="Target altitude curve">
      <div>
        <span>Altitude</span>
        <strong>
          {peakSlot?.time ?? peak.time} / {plan.maxAltitudeDeg.toFixed(0)} deg
        </strong>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
        <path d="M 0 72 H 100" className="chart-threshold" />
        <path d="M 0 42 H 100" className="chart-threshold bright" />
        <polyline points={polyline} className="chart-line" />
        {points.map((point, index) => {
          const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
          const y = 100 - normalizeAltitude(point.targetAltitudeDeg) * 100;
          return (
            <circle
              key={`${point.time}-${index}`}
              cx={x}
              cy={y}
              r="1.55"
              className={`chart-dot ${point.darkness}`}
            />
          );
        })}
      </svg>
    </div>
  );
}

function normalizeAltitude(value: number) {
  return Math.max(0, Math.min(1, (value + 10) / 100));
}
