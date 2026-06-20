import { Archive, CalendarDays, CheckCircle2, CloudSun, Download, Moon, Telescope } from "lucide-react";
import type { ReactNode } from "react";
import {
  languageLocale,
  translateFovFit,
  translateKnownText,
  translateKnownTexts,
  translations,
  type SupportedLanguage
} from "../lib/i18n";
import type { MultiSessionPlan, MultiSessionPlanItem } from "../lib/session";

type MultiSessionArchiveState = "idle" | "saving" | "saved" | "failed";

type MultiSessionPlannerProps = {
  plan: MultiSessionPlan;
  loading: boolean;
  language: SupportedLanguage;
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
  language,
  nights,
  archiveState,
  archivedItemKey,
  onNightsChange,
  onSelectItem,
  onArchiveItem,
  onDownloadCalendar
}: MultiSessionPlannerProps) {
  const bestItem = plan.items[0];
  const text = translations[language].multiSession;

  return (
    <section className="multi-session-planner" aria-label={text.aria}>
      <div className="multi-session-head">
        <div>
          <span>{loading ? text.ranking : `${plan.startDate} - ${plan.endDate}`}</span>
          <strong>{text.title}</strong>
        </div>
        <div className="multi-night-tabs" aria-label={text.planningRange}>
          {[3, 7, 14].map((range) => (
            <button
              className={nights === range ? "is-active" : ""}
              key={range}
              type="button"
              title={`${range} ${text.nights}`}
              onClick={() => onNightsChange(range)}
            >
              {range}
              {text.nightsShort}
            </button>
          ))}
        </div>
        <button
          className="multi-calendar-button"
          type="button"
          title={text.downloadCalendar}
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
            {plan.nights} {text.nights}
          </span>
          <strong>{bestItem?.targetName ?? text.noTarget}</strong>
          <em>{translateKnownText(language, plan.summary)}</em>
        </div>
        <b>{bestItem?.score ?? 0}</b>
      </div>

      <div className="multi-night-strip" aria-label={text.nightSummaries}>
        {plan.nightsSummary.map((night) => (
          <button
            className={night.whiteNight ? "white-night" : night.weatherStatus}
            key={night.date}
            type="button"
            title={translateKnownText(language, night.summary)}
          >
            <span>{shortDate(night.date, language)}</span>
            <strong>{night.score}</strong>
            <em>{night.bestTargetName}</em>
          </button>
        ))}
      </div>

      <div className="multi-session-content">
        <section aria-label={text.bestSessions}>
          <div className="multi-section-title">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>{text.bestSessions}</span>
          </div>
          <div className="multi-session-list">
            {plan.items.slice(0, 12).map((item) => (
              <div className="multi-session-row" key={`${item.date}-${item.targetId}`}>
                <button className="multi-session-pick" type="button" onClick={() => onSelectItem(item)}>
                  <span>
                    {shortDate(item.date, language)} / {translateFovFit(language, item.fovFit)}
                  </span>
                  <strong>{item.targetName}</strong>
                  <em>{translateKnownText(language, item.reason)}</em>
                  <b>{item.score}</b>
                </button>
                <button
                  className="multi-session-save"
                  type="button"
                  title={text.savePlannedSession}
                  disabled={archiveState === "saving" && archivedItemKey === itemKey(item)}
                  onClick={() => onArchiveItem(item)}
                >
                  <Archive size={14} aria-hidden="true" />
                  <span>{archiveLabel(archiveState, archivedItemKey === itemKey(item), text)}</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        <section aria-label={text.planSignals}>
          <div className="multi-section-title">
            <CloudSun size={14} aria-hidden="true" />
            <span>{text.signals}</span>
          </div>
          <div className="multi-signal-grid">
            <SignalCard
              icon={<Telescope size={15} aria-hidden="true" />}
              label={text.target}
              value={bestItem?.recommendedMode ?? "--"}
              detail={bestItem ? `${bestItem.maxAltitudeDeg} deg ${text.peak}` : translations[language].common.waiting}
            />
            <SignalCard
              icon={<Moon size={15} aria-hidden="true" />}
              label={text.moon}
              value={bestItem ? `${bestItem.moonIlluminationPercent}%` : "--"}
              detail={bestItem?.whiteNight ? text.whiteNight : text.darknessCheck}
            />
            <SignalCard
              icon={<CloudSun size={15} aria-hidden="true" />}
              label={text.weather}
              value={bestItem ? `${bestItem.weatherScore}/100` : "--"}
              detail={bestItem ? `${bestItem.startTime} - ${bestItem.endTime}` : translations[language].common.waiting}
            />
          </div>
          <div className="multi-warning-list">
            {(plan.warnings.length ? translateKnownTexts(language, plan.warnings) : [text.planReady]).map((warning) => (
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

function shortDate(dateIso: string, language: SupportedLanguage) {
  return new Intl.DateTimeFormat(languageLocale[language], { day: "2-digit", month: "short" }).format(
    new Date(`${dateIso}T12:00:00`)
  );
}

function itemKey(item: MultiSessionPlanItem) {
  return `${item.date}-${item.targetId}`;
}

function archiveLabel(
  state: MultiSessionArchiveState,
  isActiveItem: boolean,
  text: (typeof translations)[SupportedLanguage]["multiSession"]
) {
  if (!isActiveItem) return text.plan;
  if (state === "saving") return text.saving;
  if (state === "saved") return text.saved;
  if (state === "failed") return text.retry;
  return text.plan;
}
