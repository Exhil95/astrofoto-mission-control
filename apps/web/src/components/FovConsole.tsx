import type { FovResult } from "../lib/fov";

type FovConsoleProps = {
  fov: FovResult;
  focalLengthMm: number;
  sensorWidthMm: number;
  sensorHeightMm: number;
  pixelSizeUm: number;
  reducer: number;
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
  focalLengthMm,
  sensorWidthMm,
  sensorHeightMm,
  pixelSizeUm,
  reducer,
  onFocalLengthChange,
  onSensorWidthChange,
  onSensorHeightChange,
  onPixelSizeChange,
  onReducerChange
}: FovConsoleProps) {
  return (
    <div className="stack">
      <div className="section-title">
        <span>Optics</span>
        <strong>{fov.effectiveFocalLengthMm.toFixed(0)}mm</strong>
      </div>

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

