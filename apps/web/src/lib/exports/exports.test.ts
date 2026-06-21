import { describe, expect, it } from "vitest";
import type { FovResult } from "../fov";
import type { EquipmentProfile } from "../profiles";
import type { CapturePlan, MultiSessionPlanItem, SessionSettings } from "../session";
import { createMultiSessionCalendar } from "./calendar";
import { createCaptureMarkdown, createMultiSessionMarkdown } from "./markdown";

const fov: FovResult = {
  horizontalDeg: 2.1,
  verticalDeg: 1.4,
  diagonalDeg: 2.5,
  pixelScaleArcsec: 1.2,
  effectiveFocalLengthMm: 540
};

describe("export builders", () => {
  it("builds localized capture plan Markdown from a capture plan", () => {
    const markdown = createCaptureMarkdown(capturePlan, "en");

    expect(markdown).toContain("# Capture Plan: North America Nebula");
    expect(markdown).toContain("- Date: 2026-06-21");
    expect(markdown).toContain("- Ha: 12 x 300s (60 min) - Before teardown");
    expect(markdown).toContain("- [ ] Polar align and plate-solve first frame");
  });

  it("builds multi-session Markdown with FOV and planning context", () => {
    const markdown = createMultiSessionMarkdown({
      item: multiSessionItem,
      target: {
        id: "ngc7000",
        catalogId: "NGC 7000",
        name: "North America Nebula",
        type: "Nebula",
        constellation: "Cygnus",
        season: "Summer",
        magnitude: 4,
        angularWidthArcmin: 120,
        angularHeightArcmin: 100,
        bestMonths: "June-September",
        difficulty: "Easy",
        framing: "Wide field",
        raHours: 20.9,
        decDeg: 44.3,
        position: [0, 0, 0],
        tint: "#ffffff",
        exposureHint: "Narrowband",
        imageUrl: "/target.jpg",
        imageCredit: "Test",
        imageSourceUrl: "https://example.test"
      },
      filterNames: ["Ha", "OIII"],
      totalIntegrationMinutes: 180,
      plannedFrames: 36,
      exposureSeconds: 300,
      selectedProfile: profile,
      fov,
      language: "en"
    });

    expect(markdown).toContain("# Multi-session Plan: North America Nebula");
    expect(markdown).toContain("- FOV: 2.10 x 1.40 deg");
    expect(markdown).toContain("- Ha: 18 x 300s");
    expect(markdown).toContain("Total planned integration: 180 min");
  });

  it("builds ICS calendar events that cross midnight correctly", () => {
    const calendar = createMultiSessionCalendar({
      items: [multiSessionItem],
      selectedProfile: profile,
      settings,
      fov,
      language: "en"
    });

    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("DTSTART;TZID=Europe/Warsaw:20260621T233000");
    expect(calendar).toContain("DTEND;TZID=Europe/Warsaw:20260622T021000");
    expect(calendar).toContain("SUMMARY:North America Nebula - Narrowband");
    expect(calendar).toContain("LOCATION:Backyard Pier");
  });
});

const capturePlan: CapturePlan = {
  targetId: "ngc7000",
  targetName: "North America Nebula",
  date: "2026-06-21",
  windowStart: "23:30",
  windowEnd: "02:10",
  imagingMode: "Narrowband",
  totalIntegrationMinutes: 120,
  guiding: "Target RMS <= 0.8 arcsec",
  ditheringEveryFrames: 3,
  autofocusEveryMinutes: 75,
  meridianAction: "Check flip",
  framingNote: "Fits",
  moonWarning: "Darkness available",
  weatherNote: "Clear",
  exposureSteps: [
    {
      filterName: "Ha",
      exposureSeconds: 300,
      frames: 12,
      integrationMinutes: 60,
      binning: "1x1",
      gain: "unity",
      note: "Before teardown"
    },
    {
      filterName: "OIII",
      exposureSeconds: 300,
      frames: 12,
      integrationMinutes: 60,
      binning: "1x1",
      gain: "unity",
      note: "Before teardown"
    }
  ],
  calibrationFrames: [{ frameType: "Flats", frames: 30, exposure: "per filter", note: "Match flats" }],
  checklist: ["Polar align and plate-solve first frame"],
  exportMarkdown: ""
};

const multiSessionItem: MultiSessionPlanItem = {
  date: "2026-06-21",
  targetId: "ngc7000",
  targetName: "North America Nebula",
  catalogId: "NGC 7000",
  targetType: "Nebula",
  score: 91,
  astronomyScore: 94,
  weatherScore: 88,
  fovScore: 95,
  fovFit: "Fits",
  moonIlluminationPercent: 18,
  whiteNight: false,
  maxAltitudeDeg: 72,
  startTime: "23:30",
  endTime: "02:10",
  bestTime: "00:40",
  recommendedMode: "Narrowband",
  reason: "Excellent altitude and low Moon"
};

const profile: EquipmentProfile = {
  id: 1,
  name: "Widefield rig",
  siteName: "Backyard Pier",
  latitudeDeg: 52.23,
  longitudeDeg: 21.01,
  timezone: "Europe/Warsaw",
  bortle: 5,
  telescopeName: "Test APO",
  telescopeType: "Refractor",
  apertureMm: 80,
  focalLengthMm: 540,
  reducerName: "Native",
  reducer: 1,
  cameraName: "TestCam",
  sensorId: "custom",
  sensorName: "Test sensor",
  sensorWidthMm: 23.5,
  sensorHeightMm: 15.7,
  pixelSizeUm: 3.76,
  filterSet: "Ha/OIII",
  filterWheel: "EFW",
  guidingSetup: "OAG",
  guideCameraName: "GuideCam",
  focuserName: "EAF",
  mountName: "EQ",
  updatedAt: "2026-06-21T00:00:00Z"
};

const settings: SessionSettings = {
  date: "2026-06-21",
  latitudeDeg: 52.23,
  longitudeDeg: 21.01,
  timezone: "Europe/Warsaw",
  bortle: 5
};
