import { CloudSun, Droplets, Eye, RefreshCw, Wind } from "lucide-react";
import type { ReactNode } from "react";
import type { ForecastRefreshMinutes, SkyForecast, SkyForecastHour } from "../lib/forecast";
import type { SessionPlan } from "../lib/session";

type SkyConditionsProps = {
  forecast: SkyForecast;
  plan: SessionPlan;
  loading: boolean;
  refreshMinutes: ForecastRefreshMinutes;
  onRefreshMinutesChange: (minutes: ForecastRefreshMinutes) => void;
  onRefresh: () => void;
};

export function SkyConditions({
  forecast,
  plan,
  loading,
  refreshMinutes,
  onRefreshMinutesChange,
  onRefresh
}: SkyConditionsProps) {
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
    ? ["No astro dark", ...forecast.warnings]
    : forecast.warnings;

  return (
    <div className="stack sky-conditions">
      <div className="section-title">
        <span>Sky Conditions</span>
        <strong>{loading ? "Syncing" : `${forecast.score}/100`}</strong>
      </div>

      <div className="weather-cache-controls" aria-label="Weather cache controls">
        <div className="weather-refresh-tabs">
          {[15, 30, 60].map((minutes) => (
            <button
              className={refreshMinutes === minutes ? "is-active" : ""}
              key={minutes}
              type="button"
              title={`Refresh every ${minutes} minutes`}
              onClick={() => onRefreshMinutesChange(minutes as ForecastRefreshMinutes)}
            >
              {minutes}m
            </button>
          ))}
        </div>
        <button
          className="weather-refresh-button"
          type="button"
          title="Refresh weather now"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>

      <div className={`condition-score ${forecast.status}`}>
        <span>{statusLabel(forecast.status)}</span>
        <strong>{forecast.summary}</strong>
        <em>
          Best {bestHour.time} / {bestHour.imagingScore}/100
        </em>
      </div>

      <div className="condition-metrics">
        <Metric icon={<CloudSun size={15} aria-hidden="true" />} label="Cloud" value={`${averageCloud}%`} />
        <Metric icon={<Droplets size={15} aria-hidden="true" />} label="Humidity" value={`${averageHumidity}%`} />
        <Metric icon={<Wind size={15} aria-hidden="true" />} label="Gust" value={`${maxGust.toFixed(0)} km/h`} />
        <Metric icon={<Eye size={15} aria-hidden="true" />} label="Vis" value={`${minVisibility.toFixed(1)} km`} />
      </div>

      <div className="cloud-strip" aria-label="Cloud forecast by hour">
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
        {warnings.slice(0, 4).map((warning) => (
          <span key={warning}>{warning}</span>
        ))}
      </div>

      <div className="condition-source">
        <span>Source</span>
        <strong>
          {sourceLabel(forecast.source)} / high cloud {averageHighCloud}%
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

function statusLabel(status: SkyForecast["status"]) {
  if (status === "shoot") return "Shoot";
  if (status === "risk") return "Risk";
  return "Skip";
}

function sourceLabel(source: string) {
  if (source === "open-meteo") return "Open-Meteo";
  if (source === "cache") return "Cache";
  if (source === "fallback") return "Fallback";
  return "Offline";
}
