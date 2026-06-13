export type SensorPreset = {
  id: string;
  name: string;
  family: string;
  sensorWidthMm: number;
  sensorHeightMm: number;
  pixelSizeUm: number;
  resolution: string;
  note: string;
};

export const sensorPresets: SensorPreset[] = [
  {
    id: "imx571",
    name: "Sony IMX571",
    family: "APS-C",
    sensorWidthMm: 23.5,
    sensorHeightMm: 15.7,
    pixelSizeUm: 3.76,
    resolution: "26MP",
    note: "ASI2600 / QHY268 class"
  },
  {
    id: "imx455",
    name: "Sony IMX455",
    family: "Full frame",
    sensorWidthMm: 36,
    sensorHeightMm: 24,
    pixelSizeUm: 3.76,
    resolution: "61MP",
    note: "ASI6200 / QHY600 class"
  },
  {
    id: "imx533",
    name: "Sony IMX533",
    family: "Square 1-inch",
    sensorWidthMm: 11.31,
    sensorHeightMm: 11.31,
    pixelSizeUm: 3.76,
    resolution: "9MP",
    note: "Clean square DSO format"
  },
  {
    id: "imx585",
    name: "Sony IMX585",
    family: "1/1.2-inch",
    sensorWidthMm: 11.14,
    sensorHeightMm: 6.26,
    pixelSizeUm: 2.9,
    resolution: "8.3MP",
    note: "DSO / lunar / planetary"
  },
  {
    id: "imx294",
    name: "Sony IMX294",
    family: "4/3-inch",
    sensorWidthMm: 19.1,
    sensorHeightMm: 13,
    pixelSizeUm: 4.63,
    resolution: "11.7MP",
    note: "Wide wells, flexible binning"
  },
  {
    id: "imx183",
    name: "Sony IMX183",
    family: "1-inch",
    sensorWidthMm: 13.2,
    sensorHeightMm: 8.8,
    pixelSizeUm: 2.4,
    resolution: "20MP",
    note: "Small pixels for short focal length"
  }
];

export const customSensorPreset: SensorPreset = {
  id: "custom",
  name: "Custom sensor",
  family: "Manual",
  sensorWidthMm: 23.5,
  sensorHeightMm: 15.7,
  pixelSizeUm: 3.76,
  resolution: "Manual",
  note: "Use sliders below"
};

