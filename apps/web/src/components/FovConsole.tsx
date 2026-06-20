import type { FovResult } from "../lib/fov";
import { translations, type SupportedLanguage } from "../lib/i18n";
import type { EquipmentProfile } from "../lib/profiles";
import { customSensorPreset, sensorPresets } from "../lib/sensors";

type FovConsoleProps = {
  fov: FovResult;
  profile: EquipmentProfile | null;
  selectedSensorId: string;
  focalLengthMm: number;
  sensorWidthMm: number;
  sensorHeightMm: number;
  pixelSizeUm: number;
  reducer: number;
  language: SupportedLanguage;
  onSensorPresetChange: (sensorId: string) => void;
  onFocalLengthChange: (value: number) => void;
  onSensorWidthChange: (value: number) => void;
  onSensorHeightChange: (value: number) => void;
  onPixelSizeChange: (value: number) => void;
  onReducerChange: (value: number) => void;
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="control-row">
      <span>
        {label}
        <strong>
          {value}
          {unit}
        </strong>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function FovConsole({
  fov,
  profile,
  selectedSensorId,
  focalLengthMm,
  sensorWidthMm,
  sensorHeightMm,
  pixelSizeUm,
  reducer,
  language,
  onSensorPresetChange,
  onFocalLengthChange,
  onSensorWidthChange,
  onSensorHeightChange,
  onPixelSizeChange,
  onReducerChange
}: FovConsoleProps) {
  const text = translations[language].fovConsole;
  const sensorOptions = [customSensorPreset, ...sensorPresets];
  const selectedSensor =
    sensorOptions.find((sensor) => sensor.id === selectedSensorId) ?? customSensorPreset;

  return (
    <div className="stack">
      <div className="section-title">
        <span>{text.optics}</span>
        <strong>{fov.effectiveFocalLengthMm.toFixed(0)}mm</strong>
      </div>

      <label className="field-row">
        <span>{text.sensorCatalog}</span>
        <select
          value={selectedSensorId}
          onChange={(event) => onSensorPresetChange(event.target.value)}
        >
          {sensorOptions.map((sensor) => (
            <option key={sensor.id} value={sensor.id}>
              {sensor.name} - {sensor.family}
            </option>
          ))}
        </select>
      </label>

      <div className="sensor-card">
        <span>{selectedSensor.resolution}</span>
        <strong>{selectedSensor.name}</strong>
        <em>{selectedSensor.note}</em>
      </div>

      {profile && (
        <div className="equipment-grid" aria-label={text.metadata}>
          <div>
            <span>{text.camera}</span>
            <strong>{profile.cameraName}</strong>
          </div>
          <div>
            <span>{text.filters}</span>
            <strong>{profile.filterSet}</strong>
          </div>
          <div>
            <span>{text.guide}</span>
            <strong>{profile.guidingSetup}</strong>
          </div>
          <div>
            <span>{text.focuser}</span>
            <strong>{profile.focuserName}</strong>
          </div>
        </div>
      )}

      <div className="readout">
        <span>{text.imageScale}</span>
        <strong>{fov.pixelScaleArcsec.toFixed(2)} arcsec/px</strong>
      </div>

      <Slider
        label={text.focalLength}
        value={focalLengthMm}
        min={120}
        max={2400}
        step={10}
        unit="mm"
        onChange={onFocalLengthChange}
      />
      <Slider
        label={text.reducer}
        value={reducer}
        min={0.6}
        max={1.6}
        step={0.05}
        unit="x"
        onChange={onReducerChange}
      />
      <Slider
        label={text.sensorWidth}
        value={sensorWidthMm}
        min={5}
        max={43}
        step={0.1}
        unit="mm"
        onChange={onSensorWidthChange}
      />
      <Slider
        label={text.sensorHeight}
        value={sensorHeightMm}
        min={4}
        max={29}
        step={0.1}
        unit="mm"
        onChange={onSensorHeightChange}
      />
      <Slider
        label={text.pixel}
        value={pixelSizeUm}
        min={2}
        max={9}
        step={0.01}
        unit="um"
        onChange={onPixelSizeChange}
      />

      <div className="metric-grid">
        <div>
          <span>{text.horizontal}</span>
          <strong>{fov.horizontalDeg.toFixed(2)} deg</strong>
        </div>
        <div>
          <span>{text.diagonal}</span>
          <strong>{fov.diagonalDeg.toFixed(2)} deg</strong>
        </div>
      </div>
    </div>
  );
}
