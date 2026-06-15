import { ListChecks, Moon, Star, Target } from "lucide-react";
import type { TonightBoard as TonightBoardModel } from "../lib/session";

type TonightBoardProps = {
  board: TonightBoardModel;
  loading: boolean;
  selectedTargetId: string;
  onSelectTarget: (targetId: string) => void;
};

export function TonightBoard({
  board,
  loading,
  selectedTargetId,
  onSelectTarget
}: TonightBoardProps) {
  return (
    <aside className="tonight-board" aria-label="Tonight Board">
      <div className="tonight-board-head">
        <div>
          <span>{loading ? "Ranking" : board.date}</span>
          <strong>Tonight Board</strong>
        </div>
        <div className="tonight-badges" aria-label="Night summary">
          <span>
            <Moon size={13} aria-hidden="true" />
            {board.moonIlluminationPercent}%
          </span>
          <span>
            <ListChecks size={13} aria-hidden="true" />
            {board.weatherScore}/100
          </span>
        </div>
      </div>

      <div className="tonight-summary">
        <span>{board.whiteNight ? "White night" : board.weatherStatus}</span>
        <strong>{board.summary}</strong>
      </div>

      <div className="tonight-list">
        {board.items.slice(0, 4).map((item, index) => (
          <button
            key={item.targetId}
            className={`tonight-item ${item.targetId === selectedTargetId ? "is-selected" : ""}`}
            type="button"
            onClick={() => onSelectTarget(item.targetId)}
          >
            <span className="tonight-rank">
              <Star size={12} aria-hidden="true" />
              {index + 1}
            </span>
            <span className="tonight-name">
              <strong>{item.targetName}</strong>
              <em>
                {item.bestTime} / {item.maxAltitudeDeg} deg
              </em>
            </span>
            <span className="tonight-score">
              <b>{item.score}</b>
              <small>{item.fovFit}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="tonight-foot">
        <Target size={13} aria-hidden="true" />
        <span>{board.items[0]?.reason ?? "Waiting for ranked target"}</span>
      </div>
    </aside>
  );
}
