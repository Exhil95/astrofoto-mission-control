import { CloudSun, Droplets, Eye, RefreshCw, Wind } from "lucide-react";
import type { ReactNode } from "react";
import type { ForecastRefreshMinutes, SkyForecast, SkyForecastHour } from "../lib/forecast";
import { translateKnownText, translateKnownTexts, translations, type SupportedLanguage } from "../lib/i18n";
import type { SessionPlan } from "../lib/session";

type SkyConditionsProps = {
  forecast: SkyForecast;
  plan: SessionPlan;
  loading: boolean;
  refreshMinutes: ForecastRefreshMinutes;
  language: SupportedLanguage;
  onRefreshMinutesChange: (minutes: ForecastRefreshMinutes) => void;
  onRefresh: () => void;
};

export function SkyConditions({
  forecast,
  plan,
  loading,
  refreshMinutes,
  language,
  onRefreshMinutesChange,
  onRefresh
}: SkyConditionsProps) {
  const text = translations[language].skyConditions;
  const bestHour = forecast.hours.reduce(
    (best, hour) => (hour.imagingScore > best.imagingScore ? hour : best),
    forecast.hours[0] ?? emptyHour
  );
  const averageCloud = average(forecast.hours.map((hour) => hour.cloudCoverPercent));
  const averageHighCloud = average(forecast.hours.map((hour) => hour.cloudHighPercent));
  const averageHumidity = average(forecast.hours.map((hour) => hour.humidityPercent));
  const maxGust = Math.max(...forecast.hours.map((hour) => hour.windGustKmh), 0);
  const minVisibility = Math.min(...forecast.hours.map((hour) => hour.visibilityKm), 99);
  const warnings = plan.astronomicalDarknessMinutes === 0
    ? [text.noAstroDark, ...forecast.warnings]
    : forecast.warnings;
  const localizedWarnings = translateKnownTexts(language, warnings);

  return (
    <div className="stack sky-conditions">
      <div className="section-title">
        <span>{text.title}</span>
        <strong>{loading ? text.syncing : `${forecast.score}/100`}</strong>
      </div>

      <div className="weather-cache-controls" aria-label={text.cacheControls}>
        <div className="weather-refresh-tabs">
          {[15, 30, 60].map((minutes) => (
            <button
              className={refreshMinutes === minutes ? "is-active" : ""}
              key={minutes}
              type="button"
              title={`${text.refreshEvery} ${minutes} min`}
              onClick={() => onRefreshMinutesChange(minutes as ForecastRefreshMinutes)}
            >
              {minutes}m
            </button>
          ))}
        </div>
        <button
          className="weather-refresh-button"
          type="button"
          title={text.refreshNow}
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>

      <div className={`condition-score ${forecast.status}`}>
        <span>{statusLabel(forecast.status, text)}</span>
        <strong>{translateKnownText(language, forecast.summary)}</strong>
        <em>
          {text.best} {bestHour.time} / {bestHour.imagingScore}/100
        </em>
      </div>

      <div className="condition-metrics">
        <Metric icon={<CloudSun size={15} aria-hidden="true" />} label={text.cloud} value={`${averageCloud}%`} />
        <Metric icon={<Droplets size={15} aria-hidden="true" />} label={text.humidity} value={`${averageHumidity}%`} />
        <Metric icon={<Wind size={15} aria-hidden="true" />} label={text.gust} value={`${maxGust.toFixed(0)} km/h`} />
        <Metric icon={<Eye size={15} aria-hidden="true" />} label={text.visibility} value={`${minVisibility.toFixed(1)} km`} />
      </div>

      <div className="cloud-strip" aria-label={text.cloudForecast}>
        {forecast.hours.map((hour) => (
          <div className={`cloud-hour ${hour.risk}`} key={hour.time}>
            <div className="cloud-bar" aria-hidden="true">
              <b className="cloud-total" style={{ height: `${hour.cloudCoverPercent}%` }} />
              <b className="cloud-high" style={{ height: `${hour.cloudHighPercent}%` }} />
            </div>
            <span>{hour.time}</span>
            <strong>{hour.cloudCoverPercent}%</strong>
          </div>
        ))}
      </div>

      <div className="weather-flags">
        {localizedWarnings.slice(0, 4).map((warning) => (
          <span key={warning}>{warning}</span>
        ))}
      </div>

      <div className="condition-source">
        <span>{text.source}</span>
        <strong>
          {sourceLabel(forecast.source)} / {text.highCloud} {averageHighCloud}%
        </strong>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

const emptyHour: SkyForecastHour = {
  time: "--:--",
  cloudCoverPercent: 100,
  cloudLowPercent: 0,
  cloudMidPercent: 0,
  cloudHighPercent: 0,
  humidityPercent: 0,
  temperatureC: 0,
  dewPointC: 0,
  windSpeedKmh: 0,
  windGustKmh: 0,
  visibilityKm: 0,
  precipitationProbabilityPercent: 0,
  imagingScore: 0,
  risk: "skip"
};

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function statusLabel(
  status: SkyForecast["status"],
  text: (typeof translations)[SupportedLanguage]["skyConditions"]
) {
  if (status === "shoot") return text.shoot;
  if (status === "risk") return text.risk;
  return text.skip;
}

function sourceLabel(source: string) {
  if (source === "open-meteo") return "Open-Meteo";
  if (source === "cache") return "Cache";
  if (source === "fallback") return "Fallback";
  return "Offline";
}
