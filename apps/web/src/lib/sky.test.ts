import { describe, expect, it } from "vitest";
import type { FovResult } from "./fov";
import {
  calculateFitLabel,
  curateSkyTargets,
  filterSkyTargets,
  formatObjectFootprint
} from "./sky";
import type { Target } from "./targets";

const fov: FovResult = {
  horizontalDeg: 2,
  verticalDeg: 1,
  diagonalDeg: 2.2,
  pixelScaleArcsec: 1.4,
  effectiveFocalLengthMm: 500
};

describe("sky catalog rules", () => {
  it("classifies target footprint against the current FOV", () => {
    expect(calculateFitLabel(target({ id: "small", width: 10, height: 8 }), fov)).toBe("Small");
    expect(calculateFitLabel(target({ id: "fits", width: 80, height: 40 }), fov)).toBe("Fits");
    expect(calculateFitLabel(target({ id: "tight", width: 110, height: 61 }), fov)).toBe("Tight");
    expect(calculateFitLabel(target({ id: "mosaic", width: 160, height: 80 }), fov)).toBe("Mosaic");
  });

  it("filters by type, season, and fit label", () => {
    const targets = [
      target({ id: "nebula-fit", type: "Nebula", season: "Summer", width: 80, height: 40 }),
      target({ id: "galaxy-fit", type: "Galaxy", season: "Spring", width: 60, height: 30 }),
      target({ id: "nebula-mosaic", type: "Nebula", season: "Summer", width: 160, height: 80 })
    ];

    expect(filterSkyTargets(targets, fov, "Nebula", "Summer", "Fits").map((item) => item.id)).toEqual([
      "nebula-fit"
    ]);
  });

  it("keeps the selected target in tonight mode and removes duplicates", () => {
    const selectedTarget = target({ id: "selected", width: 80, height: 40 });
    const tonightTarget = target({ id: "tonight", width: 60, height: 30 });
    const visibleTargets = curateSkyTargets({
      mode: "tonight",
      selectedTarget,
      allTargets: [selectedTarget, tonightTarget],
      filteredTargets: [tonightTarget],
      tonightTargetIds: ["selected", "tonight"],
      showcaseIndex: 0
    });

    expect(visibleTargets.map((item) => item.id)).toEqual(["selected", "tonight"]);
  });

  it("formats object footprint as arcminutes and FOV load percentages", () => {
    expect(formatObjectFootprint(target({ id: "ngc7000", width: 120, height: 60 }), fov)).toBe(
      "120 x 60' / 100% x 100%"
    );
  });
});

function target({
  id,
  width,
  height,
  type = "Nebula",
  season = "Summer"
}: {
  id: string;
  width: number;
  height: number;
  type?: string;
  season?: string;
}): Target {
  return {
    id,
    catalogId: id.toUpperCase(),
    name: id,
    type,
    constellation: "Test",
    season,
    magnitude: 7,
    angularWidthArcmin: width,
    angularHeightArcmin: height,
    bestMonths: "June",
    difficulty: "Easy",
    framing: "Single panel",
    raHours: 20,
    decDeg: 40,
    position: [0, 0, 0],
    tint: "#ffffff",
    exposureHint: "Test exposure",
    imageUrl: "/test.jpg",
    imageCredit: "Test",
    imageSourceUrl: "https://example.test"
  };
}
