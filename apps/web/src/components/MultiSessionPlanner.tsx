import { Archive, CalendarDays, CheckCircle2, CloudSun, Download, Moon, Telescope } from "lucide-react";
import type { ReactNode } from "react";
import type { MultiSessionPlan, MultiSessionPlanItem } from "../lib/session";

type MultiSessionArchiveState = "idle" | "saving" | "saved" | "failed";

type MultiSessionPlannerProps = {
  plan: MultiSessionPlan;
  loading: boolean;
  nights: number;
  archiveState: MultiSessionArchiveState;
  archivedItemKey: string | null;
  onNightsChange: (nights: number) => void;
  onSelectItem: (item: MultiSessionPlanItem) => void;
  onArchiveItem: (item: MultiSessionPlanItem) => void;
  onDownloadCalendar: () => void;
};

export function MultiSessionPlanner({
  plan,
  loading,
  nights,
  archiveState,
  archivedItemKey,
  onNightsChange,
  onSelectItem,
  onArchiveItem,
  onDownloadCalendar
}: MultiSessionPlannerProps) {
  const bestItem = plan.items[0];

  return (
    <section className="multi-session-planner" aria-label="Multi-session planner">
      <div className="multi-session-head">
        <div>
          <span>{loading ? "Ranking" : `${plan.startDate} - ${plan.endDate}`}</span>
          <strong>Multi-session Planner</strong>
        </div>
        <div className="multi-night-tabs" aria-label="Planning range">
          {[3, 7, 14].map((range) => (
            <button
              className={nights === range ? "is-active" : ""}
              key={range}
              type="button"
              title={`${range} nights`}
              onClick={() => onNightsChange(range)}
            >
              {range}n
            </button>
          ))}
        </div>
        <button
          className="multi-calendar-button"
          type="button"
          title="Download calendar"
          disabled={!plan.items.length}
          onClick={onDownloadCalendar}
        >
          <Download size={14} aria-hidden="true" />
          <span>ICS</span>
        </button>
      </div>

      <div className="multi-session-hero">
        <div>
          <span>
            <CalendarDays size={14} aria-hidden="true" />
            {plan.nights} nights
          </span>
          <strong>{bestItem?.targetName ?? "No target"}</strong>
          <em>{plan.summary}</em>
        </div>
        <b>{bestItem?.score ?? 0}</b>
      </div>

      <div className="multi-night-strip" aria-label="Night summaries">
        {plan.nightsSummary.map((night) => (
          <button
            className={night.whiteNight ? "white-night" : night.weatherStatus}
            key={night.date}
            type="button"
            title={night.summary}
          >
            <span>{shortDate(night.date)}</span>
            <strong>{night.score}</strong>
            <em>{night.bestTargetName}</em>
          </button>
        ))}
      </div>

      <div className="multi-session-content">
        <section aria-label="Best sessions">
          <div className="multi-section-title">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>Best Sessions</span>
          </div>
          <div className="multi-session-list">
            {plan.items.slice(0, 12).map((item) => (
              <div className="multi-session-row" key={`${item.date}-${item.targetId}`}>
                <button className="multi-session-pick" type="button" onClick={() => onSelectItem(item)}>
                  <span>
                    {shortDate(item.date)} / {item.fovFit}
                  </span>
                  <strong>{item.targetName}</strong>
                  <em>{item.reason}</em>
                  <b>{item.score}</b>
                </button>
                <button
                  className="multi-session-save"
                  type="button"
                  title="Save planned session"
                  disabled={archiveState === "saving" && archivedItemKey === itemKey(item)}
                  onClick={() => onArchiveItem(item)}
                >
                  <Archive size={14} aria-hidden="true" />
                  <span>{archiveLabel(archiveState, archivedItemKey === itemKey(item))}</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Plan signals">
          <div className="multi-section-title">
            <CloudSun size={14} aria-hidden="true" />
            <span>Signals</span>
          </div>
          <div className="multi-signal-grid">
            <SignalCard
              icon={<Telescope size={15} aria-hidden="true" />}
              label="Target"
              value={bestItem?.recommendedMode ?? "--"}
              detail={bestItem ? `${bestItem.maxAltitudeDeg} deg peak` : "waiting"}
            />
            <SignalCard
              icon={<Moon size={15} aria-hidden="true" />}
              label="Moon"
              value={bestItem ? `${bestItem.moonIlluminationPercent}%` : "--"}
              detail={bestItem?.whiteNight ? "White night" : "darkness check"}
            />
            <SignalCard
              icon={<CloudSun size={15} aria-hidden="true" />}
              label="Weather"
              value={bestItem ? `${bestItem.weatherScore}/100` : "--"}
              detail={bestItem ? `${bestItem.startTime} - ${bestItem.endTime}` : "waiting"}
            />
          </div>
          <div className="multi-warning-list">
            {(plan.warnings.length ? plan.warnings : ["Plan ready"]).map((warning) => (
              <span key={warning}>{warning}</span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function SignalCard({
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

function shortDate(dateIso: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" }).format(
    new Date(`${dateIso}T12:00:00`)
  );
}

function itemKey(item: MultiSessionPlanItem) {
  return `${item.date}-${item.targetId}`;
}

function archiveLabel(state: MultiSessionArchiveState, isActiveItem: boolean) {
  if (!isActiveItem) return "Plan";
  if (state === "saving") return "Saving";
  if (state === "saved") return "Saved";
  if (state === "failed") return "Retry";
  return "Plan";
}
