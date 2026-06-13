export type Target = {
  id: string;
  name: string;
  type: string;
  season: string;
  magnitude: number;
  position: [number, number, number];
  tint: string;
  exposureHint: string;
};

export const targets: Target[] = [
  {
    id: "m42",
    name: "Orion Nebula",
    type: "Emission nebula",
    season: "Winter",
    magnitude: 4.0,
    position: [-0.9, -0.45, 0.4],
    tint: "#ff6f91",
    exposureHint: "Short HDR subs"
  },
  {
    id: "m31",
    name: "Andromeda",
    type: "Galaxy",
    season: "Autumn",
    magnitude: 3.4,
    position: [1.95, 1.05, -0.2],
    tint: "#f7c873",
    exposureHint: "Wide mosaic"
  },
  {
    id: "ngc7000",
    name: "North America",
    type: "Emission nebula",
    season: "Summer",
    magnitude: 4.0,
    position: [0.2, 1.85, 0.6],
    tint: "#38d6c9",
    exposureHint: "Narrowband"
  },
  {
    id: "m45",
    name: "Pleiades",
    type: "Reflection nebula",
    season: "Winter",
    magnitude: 1.6,
    position: [-0.85, 1.25, -0.9],
    tint: "#7bb7ff",
    exposureHint: "Protect highlights"
  },
  {
    id: "ic1396",
    name: "Elephant Trunk",
    type: "Dark nebula",
    season: "Autumn",
    magnitude: 3.5,
    position: [1.25, -1.35, 0.7],
    tint: "#9ee86f",
    exposureHint: "Long narrowband"
  }
];
