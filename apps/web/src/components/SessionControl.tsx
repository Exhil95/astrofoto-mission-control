import { CalendarDays, Gauge, LocateFixed, MapPin } from "lucide-react";
import { getTodayIsoDate, type SessionPlan, type SessionSettings } from "../lib/session";

const presets = [
  {
    id: "katowice",
    label: "Katowice",
    latitudeDeg: 50.2649,
    longitudeDeg: 19.0238,
    timezone: "Europe/Warsaw",
    bortle: 5
  },
  {
    id: "bieszczady",
    label: "Bieszczady",
    latitudeDeg: 49.2486,
    longitudeDeg: 22.5937,
    timezone: "Europe/Warsaw",
    bortle: 2
  },
  {
    id: "tenerife",
    label: "Tenerife",
    latitudeDeg: 28.3003,
    longitudeDeg: -16.5118,
    timezone: "Atlantic/Canary",
    bortle: 3
  }
];

type SessionControlProps = {
  settings: SessionSettings;
  plan: SessionPlan;
  loading: boolean;
  onChange: (settings: SessionSettings) => void;
};

export function SessionControl({ settings, plan, loading, onChange }: SessionControlProps) {
  const update = (next: Partial<SessionSettings>) => onChange({ ...settings, ...next });
  const astroDark = formatMinutes(plan.astronomicalDarknessMinutes);

  return (
    <div className="stack session-control">
      <div className="section-title">
        <span>Session</span>
        <strong>{loading ? "Syncing" : `${plan.conditionScore}/100`}</strong>
      </div>

      <div className="session-score">
        <span>{plan.nightKindLabel}</span>
        <strong>
          {plan.startTime} - {plan.endTime}
        </strong>
        <em>{plan.recommendation}</em>
      </div>

      <div className="date-control">
        <label className="field-row">
          <span>
            <CalendarDays size={15} aria-hidden="true" />
            Date
          </span>
          <input
            type="date"
            value={settings.date}
            onChange={(event) => update({ date: event.target.value })}
          />
        </label>
        <button type="button" onClick={() => update({ date: getTodayIsoDate() })}>
          Tonight
        </button>
      </div>

      <div className="preset-grid" aria-label="Location presets">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() =>
              onChange({
                ...settings,
                latitudeDeg: preset.latitudeDeg,
                longitudeDeg: preset.longitudeDeg,
                timezone: preset.timezone,
                bortle: preset.bortle
              })
            }
          >
            <MapPin size={14} aria-hidden="true" />
            {preset.label}
          </button>
        ))}
      </div>

      <div className="coordinate-grid">
        <label className="field-row">
          <span>
            <LocateFixed size={15} aria-hidden="true" />
            Lat
          </span>
          <input
            type="number"
            value={settings.latitudeDeg}
            min={-90}
            max={90}
            step={0.0001}
            onChange={(event) => update({ latitudeDeg: Number(event.target.value) })}
          />
        </label>
        <label className="field-row">
          <span>
            <LocateFixed size={15} aria-hidden="true" />
            Lon
          </span>
          <input
            type="number"
            value={settings.longitudeDeg}
            min={-180}
            max={180}
            step={0.0001}
            onChange={(event) => update({ longitudeDeg: Number(event.target.value) })}
          />
        </label>
      </div>

      <label className="field-row">
        <span>Timezone</span>
        <input
          type="text"
          value={settings.timezone}
          onChange={(event) => update({ timezone: event.target.value })}
        />
      </label>

      <label className="control-row compact-control">
        <span>
          <span className="inline-label">
            <Gauge size={15} aria-hidden="true" />
            Bortle
          </span>
          <strong>{settings.bortle}</strong>
        </span>
        <input
          type="range"
          value={settings.bortle}
          min={1}
          max={9}
          step={1}
          onChange={(event) => update({ bortle: Number(event.target.value) })}
        />
      </label>

      <div className="metric-grid">
        <div>
          <span>Astro dark</span>
          <strong>{astroDark}</strong>
        </div>
        <div>
          <span>Sun min</span>
          <strong>{plan.minSunAltitudeDeg.toFixed(1)} deg</strong>
        </div>
        <div>
          <span>Moon</span>
          <strong>{plan.moonIlluminationPercent}%</strong>
        </div>
        <div>
          <span>Altitude</span>
          <strong>{plan.maxAltitudeDeg} deg</strong>
        </div>
        <div>
          <span>Seeing</span>
          <strong>{plan.seeingArcsec.toFixed(1)} arcsec</strong>
        </div>
        <div>
          <span>Transparency</span>
          <strong>{plan.transparencyPercent}%</strong>
        </div>
      </div>
    </div>
  );
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
