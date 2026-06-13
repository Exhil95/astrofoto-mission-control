import type { Target } from "../lib/targets";

type TargetRailProps = {
  targets: Target[];
  selectedTarget: Target;
  onSelectTarget: (targetId: string) => void;
};

export function TargetRail({ targets, selectedTarget, onSelectTarget }: TargetRailProps) {
  return (
    <div className="stack">
      <div className="section-title">
        <span>Targets</span>
        <strong>{targets.length}</strong>
      </div>

      <div className="target-list">
        {targets.map((target) => (
          <button
            key={target.id}
            className={`target-row ${target.id === selectedTarget.id ? "is-selected" : ""}`}
            type="button"
            onClick={() => onSelectTarget(target.id)}
          >
            <span className="target-swatch" style={{ background: target.tint }} />
            <span>
              <strong>{target.name}</strong>
              <small>{target.season}</small>
            </span>
            <em>{target.magnitude.toFixed(1)}</em>
          </button>
        ))}
      </div>

      <div className="metric-grid">
        <div>
          <span>Type</span>
          <strong>{selectedTarget.type}</strong>
        </div>
        <div>
          <span>Signal</span>
          <strong>{selectedTarget.exposureHint}</strong>
        </div>
      </div>
    </div>
  );
}

