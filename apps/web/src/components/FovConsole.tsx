import type { FovResult } from "../lib/fov";
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
  onSensorPresetChange,
  onFocalLengthChange,
  onSensorWidthChange,
  onSensorHeightChange,
  onPixelSizeChange,
  onReducerChange
}: FovConsoleProps) {
  const sensorOptions = [customSensorPreset, ...sensorPresets];
  const selectedSensor =
    sensorOptions.find((sensor) => sensor.id === selectedSensorId) ?? customSensorPreset;

  return (
    <div className="stack">
      <div className="section-title">
        <span>Optics</span>
        <strong>{fov.effectiveFocalLengthMm.toFixed(0)}mm</strong>
      </div>

      <label className="field-row">
        <span>Sensor catalog</span>
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
        <div className="equipment-grid" aria-label="Optical profile metadata">
          <div>
            <span>Camera</span>
            <strong>{profile.cameraName}</strong>
          </div>
          <div>
            <span>Filters</span>
            <strong>{profile.filterSet}</strong>
          </div>
          <div>
            <span>Guide</span>
            <strong>{profile.guidingSetup}</strong>
          </div>
          <div>
            <span>Focuser</span>
            <strong>{profile.focuserName}</strong>
          </div>
        </div>
      )}

      <div className="readout">
        <span>Image scale</span>
        <strong>{fov.pixelScaleArcsec.toFixed(2)} arcsec/px</strong>
      </div>

      <Slider
        label="Focal length"
        value={focalLengthMm}
        min={120}
        max={2400}
        step={10}
        unit="mm"
        onChange={onFocalLengthChange}
      />
      <Slider
        label="Reducer"
        value={reducer}
        min={0.6}
        max={1.6}
        step={0.05}
        unit="x"
        onChange={onReducerChange}
      />
      <Slider
        label="Sensor width"
        value={sensorWidthMm}
        min={5}
        max={43}
        step={0.1}
        unit="mm"
        onChange={onSensorWidthChange}
      />
      <Slider
        label="Sensor height"
        value={sensorHeightMm}
        min={4}
        max={29}
        step={0.1}
        unit="mm"
        onChange={onSensorHeightChange}
      />
      <Slider
        label="Pixel"
        value={pixelSizeUm}
        min={2}
        max={9}
        step={0.01}
        unit="um"
        onChange={onPixelSizeChange}
      />

      <div className="metric-grid">
        <div>
          <span>Horizontal</span>
          <strong>{fov.horizontalDeg.toFixed(2)} deg</strong>
        </div>
        <div>
          <span>Diagonal</span>
          <strong>{fov.diagonalDeg.toFixed(2)} deg</strong>
        </div>
      </div>
    </div>
  );
}
