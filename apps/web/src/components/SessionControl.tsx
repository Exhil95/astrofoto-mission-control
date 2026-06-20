import { CalendarDays, Gauge, LocateFixed, MapPin } from "lucide-react";
import { translateKnownText, translations, type SupportedLanguage } from "../lib/i18n";
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
  language: SupportedLanguage;
  onChange: (settings: SessionSettings) => void;
};

export function SessionControl({ settings, plan, loading, language, onChange }: SessionControlProps) {
  const update = (next: Partial<SessionSettings>) => onChange({ ...settings, ...next });
  const astroDark = formatMinutes(plan.astronomicalDarknessMinutes);
  const text = translations[language].sessionControl;

  return (
    <div className="stack session-control">
      <div className="section-title">
        <span>{text.session}</span>
        <strong>{loading ? text.syncing : `${plan.conditionScore}/100`}</strong>
      </div>

      <div className="session-score">
        <span>{translateKnownText(language, plan.nightKindLabel)}</span>
        <strong>
          {plan.startTime} - {plan.endTime}
        </strong>
        <em>{translateKnownText(language, plan.recommendation)}</em>
      </div>

      <div className="date-control">
        <label className="field-row">
          <span>
            <CalendarDays size={15} aria-hidden="true" />
            {text.date}
          </span>
          <input
            type="date"
            value={settings.date}
            onChange={(event) => update({ date: event.target.value })}
          />
        </label>
        <button type="button" onClick={() => update({ date: getTodayIsoDate() })}>
          {text.tonight}
        </button>
      </div>

      <div className="preset-grid" aria-label={text.locationPresets}>
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
        <span>{text.timezone}</span>
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
          <span>{text.astroDark}</span>
          <strong>{astroDark}</strong>
        </div>
        <div>
          <span>{text.sunMin}</span>
          <strong>{plan.minSunAltitudeDeg.toFixed(1)} deg</strong>
        </div>
        <div>
          <span>{text.moon}</span>
          <strong>{plan.moonIlluminationPercent}%</strong>
        </div>
        <div>
          <span>{text.altitude}</span>
          <strong>{plan.maxAltitudeDeg} deg</strong>
        </div>
        <div>
          <span>{text.seeing}</span>
          <strong>{plan.seeingArcsec.toFixed(1)} arcsec</strong>
        </div>
        <div>
          <span>{text.transparency}</span>
          <strong>{plan.transparencyPercent}%</strong>
        </div>
        <div>
          <span>{text.weather}</span>
          <strong>{statusLabel(plan.weatherStatus, text)} {plan.weatherScore}/100</strong>
        </div>
        <div>
          <span>{text.mode}</span>
          <strong>{plan.recommendedMode}</strong>
        </div>
      </div>

      <NightProfile plan={plan} language={language} />
    </div>
  );
}

function NightProfile({ plan, language }: { plan: SessionPlan; language: SupportedLanguage }) {
  const text = translations[language].sessionControl;
  const darknessRows = [
    { label: "Civil", minutes: plan.civilDarknessMinutes, kind: "civil" },
    { label: "Nautical", minutes: plan.nauticalDarknessMinutes, kind: "nautical" },
    { label: "Astro", minutes: plan.astronomicalDarknessMinutes, kind: "astro" }
  ];
  const maxMinutes = Math.max(1, ...darknessRows.map((row) => row.minutes));

  return (
    <div className={`night-profile ${plan.whiteNight ? "is-white-night" : ""}`}>
      <div className="night-profile-head">
        <span>{text.nightProfile}</span>
        <strong>{translateKnownText(language, plan.nightKindLabel)}</strong>
      </div>

      <div className="darkness-bars">
        {darknessRows.map((row) => (
          <div className="darkness-row" key={row.kind}>
            <span>{row.label}</span>
            <div className="darkness-meter" aria-hidden="true">
              <b
                className={`darkness-fill ${row.kind}`}
                style={{
                  width: row.minutes === 0 ? 0 : `${Math.max(3, (row.minutes / maxMinutes) * 100)}%`
                }}
              />
            </div>
            <strong>{formatMinutes(row.minutes)}</strong>
          </div>
        ))}
      </div>

      <div className="night-flags">
        <span>{plan.whiteNight ? text.whiteNight : text.astronomicalNight}</span>
        <strong>Sun {plan.minSunAltitudeDeg.toFixed(1)} deg</strong>
      </div>

      <div className="session-blend">
        <div>
          <span>Astro</span>
          <b style={{ width: `${plan.astronomyScore}%` }} />
          <strong>{plan.astronomyScore}/100</strong>
        </div>
        <div>
          <span>{text.weather}</span>
          <b className={plan.weatherStatus} style={{ width: `${plan.weatherScore}%` }} />
          <strong>{plan.weatherScore}/100</strong>
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: string, text: (typeof translations)[SupportedLanguage]["sessionControl"]) {
  if (status === "shoot") return text.shoot;
  if (status === "risk") return text.risk;
  return text.skip;
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
