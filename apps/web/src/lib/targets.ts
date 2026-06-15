export type Target = {
  id: string;
  catalogId: string;
  name: string;
  type: string;
  constellation: string;
  season: string;
  magnitude: number;
  angularWidthArcmin: number;
  angularHeightArcmin: number;
  bestMonths: string;
  difficulty: "Easy" | "Medium" | "Hard";
  framing: string;
  position: [number, number, number];
  tint: string;
  exposureHint: string;
};

export const targets: Target[] = [
  {
    id: "m42",
    catalogId: "M42",
    name: "Orion Nebula",
    type: "Emission nebula",
    constellation: "Orion",
    season: "Winter",
    magnitude: 4.0,
    angularWidthArcmin: 85,
    angularHeightArcmin: 60,
    bestMonths: "Dec-Mar",
    difficulty: "Easy",
    framing: "Medium nebula",
    position: [-0.9, -0.45, 0.4],
    tint: "#ff6f91",
    exposureHint: "Short HDR subs"
  },
  {
    id: "m31",
    catalogId: "M31",
    name: "Andromeda",
    type: "Galaxy",
    constellation: "Andromeda",
    season: "Autumn",
    magnitude: 3.4,
    angularWidthArcmin: 190,
    angularHeightArcmin: 60,
    bestMonths: "Sep-Dec",
    difficulty: "Easy",
    framing: "Wide galaxy",
    position: [1.95, 1.05, -0.2],
    tint: "#f7c873",
    exposureHint: "Wide mosaic"
  },
  {
    id: "ngc7000",
    catalogId: "NGC 7000",
    name: "North America",
    type: "Emission nebula",
    constellation: "Cygnus",
    season: "Summer",
    magnitude: 4.0,
    angularWidthArcmin: 120,
    angularHeightArcmin: 100,
    bestMonths: "Jun-Sep",
    difficulty: "Medium",
    framing: "Large nebula",
    position: [0.2, 1.85, 0.6],
    tint: "#38d6c9",
    exposureHint: "Narrowband"
  },
  {
    id: "m45",
    catalogId: "M45",
    name: "Pleiades",
    type: "Reflection nebula",
    constellation: "Taurus",
    season: "Winter",
    magnitude: 1.6,
    angularWidthArcmin: 110,
    angularHeightArcmin: 110,
    bestMonths: "Nov-Feb",
    difficulty: "Easy",
    framing: "Wide cluster",
    position: [-0.85, 1.25, -0.9],
    tint: "#7bb7ff",
    exposureHint: "Protect highlights"
  },
  {
    id: "ic1396",
    catalogId: "IC 1396",
    name: "Elephant Trunk",
    type: "Dark nebula",
    constellation: "Cepheus",
    season: "Autumn",
    magnitude: 3.5,
    angularWidthArcmin: 170,
    angularHeightArcmin: 140,
    bestMonths: "Aug-Nov",
    difficulty: "Hard",
    framing: "Large nebula",
    position: [1.25, -1.35, 0.7],
    tint: "#9ee86f",
    exposureHint: "Long narrowband"
  },
  {
    id: "ngc1499",
    catalogId: "NGC 1499",
    name: "California Nebula",
    type: "Emission nebula",
    constellation: "Perseus",
    season: "Winter",
    magnitude: 6.0,
    angularWidthArcmin: 160,
    angularHeightArcmin: 40,
    bestMonths: "Nov-Feb",
    difficulty: "Medium",
    framing: "Long nebula",
    position: [-1.8, 0.45, -0.3],
    tint: "#ff9ab3",
    exposureHint: "Ha narrowband"
  },
  {
    id: "ngc2237",
    catalogId: "NGC 2237",
    name: "Rosette Nebula",
    type: "Emission nebula",
    constellation: "Monoceros",
    season: "Winter",
    magnitude: 9.0,
    angularWidthArcmin: 80,
    angularHeightArcmin: 60,
    bestMonths: "Dec-Mar",
    difficulty: "Medium",
    framing: "Medium nebula",
    position: [-1.55, -1.15, 0.15],
    tint: "#ff6f91",
    exposureHint: "Narrowband core"
  },
  {
    id: "ic1805",
    catalogId: "IC 1805",
    name: "Heart Nebula",
    type: "Emission nebula",
    constellation: "Cassiopeia",
    season: "Autumn",
    magnitude: 6.5,
    angularWidthArcmin: 150,
    angularHeightArcmin: 150,
    bestMonths: "Sep-Jan",
    difficulty: "Medium",
    framing: "Large nebula",
    position: [1.7, 0.25, 0.9],
    tint: "#ff6f91",
    exposureHint: "Ha/OIII blend"
  },
  {
    id: "ngc6960",
    catalogId: "NGC 6960",
    name: "Veil Nebula",
    type: "Supernova remnant",
    constellation: "Cygnus",
    season: "Summer",
    magnitude: 7.0,
    angularWidthArcmin: 180,
    angularHeightArcmin: 120,
    bestMonths: "Jun-Oct",
    difficulty: "Medium",
    framing: "Mosaic field",
    position: [1.55, 1.55, 0.15],
    tint: "#7bb7ff",
    exposureHint: "OIII rich"
  },
  {
    id: "m33",
    catalogId: "M33",
    name: "Triangulum Galaxy",
    type: "Galaxy",
    constellation: "Triangulum",
    season: "Autumn",
    magnitude: 5.7,
    angularWidthArcmin: 70,
    angularHeightArcmin: 42,
    bestMonths: "Sep-Dec",
    difficulty: "Medium",
    framing: "Medium galaxy",
    position: [0.95, 1.45, -0.75],
    tint: "#f7c873",
    exposureHint: "Long RGB"
  },
  {
    id: "m51",
    catalogId: "M51",
    name: "Whirlpool Galaxy",
    type: "Galaxy",
    constellation: "Canes Venatici",
    season: "Spring",
    magnitude: 8.4,
    angularWidthArcmin: 11,
    angularHeightArcmin: 7,
    bestMonths: "Mar-Jun",
    difficulty: "Medium",
    framing: "Small galaxy",
    position: [0.15, -1.75, -0.65],
    tint: "#f7c873",
    exposureHint: "Long focal length"
  },
  {
    id: "m101",
    catalogId: "M101",
    name: "Pinwheel Galaxy",
    type: "Galaxy",
    constellation: "Ursa Major",
    season: "Spring",
    magnitude: 7.9,
    angularWidthArcmin: 29,
    angularHeightArcmin: 27,
    bestMonths: "Mar-Jun",
    difficulty: "Hard",
    framing: "Small galaxy",
    position: [-1.3, -1.65, -0.25],
    tint: "#f7c873",
    exposureHint: "Dark sky RGB"
  }
];
