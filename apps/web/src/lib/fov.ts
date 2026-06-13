export type FovInput = {
  focalLengthMm: number;
  reducer: number;
  sensorWidthMm: number;
  sensorHeightMm: number;
  pixelSizeUm: number;
};

export type FovResult = {
  horizontalDeg: number;
  verticalDeg: number;
  diagonalDeg: number;
  pixelScaleArcsec: number;
  effectiveFocalLengthMm: number;
};

const radToDeg = 180 / Math.PI;

export function calculateFov(input: FovInput): FovResult {
  const effectiveFocalLengthMm = input.focalLengthMm * input.reducer;
  const horizontalDeg = 2 * Math.atan(input.sensorWidthMm / (2 * effectiveFocalLengthMm)) * radToDeg;
  const verticalDeg = 2 * Math.atan(input.sensorHeightMm / (2 * effectiveFocalLengthMm)) * radToDeg;
  const diagonalMm = Math.hypot(input.sensorWidthMm, input.sensorHeightMm);
  const diagonalDeg = 2 * Math.atan(diagonalMm / (2 * effectiveFocalLengthMm)) * radToDeg;
  const pixelScaleArcsec = (206.265 * input.pixelSizeUm) / effectiveFocalLengthMm;

  return {
    horizontalDeg,
    verticalDeg,
    diagonalDeg,
    pixelScaleArcsec,
    effectiveFocalLengthMm
  };
}

