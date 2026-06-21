import type { FovResult } from "../fov";
import {
  translateFovFit,
  translateKnownText,
  translateTargetFraming,
  type SupportedLanguage
} from "../i18n";
import type { EquipmentProfile } from "../profiles";
import type { CapturePlan, MultiSessionPlanItem, SessionPlan } from "../session";
import type { Target } from "../targets";

export function createCaptureMarkdown(plan: CapturePlan, language: SupportedLanguage = "en") {
  const labels = markdownLabels(language);
  const exposureLines = plan.exposureSteps
    .map(
      (step) =>
        `- ${step.filterName}: ${step.frames} x ${step.exposureSeconds}s (${step.integrationMinutes} min) - ${translateKnownText(
          language,
          step.note
        )}`
    )
    .join("\n");
  const calibrationLines = plan.calibrationFrames
    .map(
      (step) =>
        `- ${step.frameType}: ${step.frames} x ${step.exposure} - ${translateKnownText(language, step.note)}`
    )
    .join("\n");
  const checklistLines = plan.checklist
    .map((item) => `- [ ] ${translateKnownText(language, item)}`)
    .join("\n");

  return [
    `# ${labels.capturePlan}: ${plan.targetName}`,
    "",
    `- ${labels.date}: ${plan.date}`,
    `- ${labels.window}: ${plan.windowStart} - ${plan.windowEnd}`,
    `- ${labels.mode}: ${translateKnownText(language, plan.imagingMode)}`,
    `- ${labels.integration}: ${plan.totalIntegrationMinutes} min`,
    "",
    `## ${labels.lights}`,
    exposureLines,
    "",
    `## ${labels.calibration}`,
    calibrationLines,
    "",
    `## ${labels.checklist}`,
    checklistLines
  ].join("\n");
}

export function createSessionArchiveNotes({
  sessionPlan,
  profile,
  language
}: {
  sessionPlan: SessionPlan;
  profile: EquipmentProfile | null;
  language: SupportedLanguage;
}) {
  return [
    translateKnownText(language, sessionPlan.recommendation),
    sessionPlan.whiteNight
      ? `${translateKnownText(language, "White night")}: ${narrowbandFallbackLabel(language)}`
      : translateKnownText(language, "Astronomical darkness available"),
    `${weatherLabel(language)} ${sessionPlan.weatherScore}/100: ${translateKnownText(
      language,
      sessionPlan.weatherSummary
    )}`,
    `${profileLabel(language)}: ${profile?.name ?? customSetupLabel(language)}`
  ].join("\n");
}

export function createMultiSessionNotes({
  item,
  target,
  profile,
  language
}: {
  item: MultiSessionPlanItem;
  target: Target;
  profile: EquipmentProfile | null;
  language: SupportedLanguage;
}) {
  return [
    translateKnownText(language, item.reason),
    `${modeLabel(language)}: ${translateKnownText(language, item.recommendedMode)}`,
    `FOV: ${translateFovFit(language, item.fovFit)}, ${target.angularWidthArcmin} x ${target.angularHeightArcmin} arcmin`,
    `${weatherLabel(language)} ${item.weatherScore}/100, ${moonLabel(language)} ${item.moonIlluminationPercent}%`,
    item.whiteNight
      ? `${translateKnownText(language, "White night")}: ${narrowbandFallbackLabel(language)}`
      : translateKnownText(language, "Astronomical darkness available"),
    `${profileLabel(language)}: ${profile?.name ?? customSetupLabel(language)}`
  ].join("\n");
}

export function createMultiSessionMarkdown({
  item,
  target,
  filterNames,
  totalIntegrationMinutes,
  plannedFrames,
  exposureSeconds,
  selectedProfile,
  fov,
  language
}: {
  item: MultiSessionPlanItem;
  target: Target;
  filterNames: string[];
  totalIntegrationMinutes: number;
  plannedFrames: number;
  exposureSeconds: number;
  selectedProfile: EquipmentProfile | null;
  fov: FovResult;
  language: SupportedLanguage;
}) {
  const labels = markdownLabels(language);
  const framesPerFilter = Math.max(1, Math.round(plannedFrames / Math.max(1, filterNames.length)));
  const lights = filterNames
    .map((filterName) => `- ${filterName}: ${framesPerFilter} x ${exposureSeconds}s`)
    .join("\n");

  return [
    `# ${labels.multiSessionPlan}: ${item.targetName}`,
    "",
    `- ${labels.date}: ${item.date}`,
    `- ${labels.window}: ${item.startTime} - ${item.endTime}`,
    `- ${labels.mode}: ${translateKnownText(language, item.recommendedMode)}`,
    `- ${labels.score}: ${item.score}/100`,
    `- ${labels.weather}: ${item.weatherScore}/100`,
    `- ${labels.moon}: ${item.moonIlluminationPercent}%`,
    `- FOV: ${fov.horizontalDeg.toFixed(2)} x ${fov.verticalDeg.toFixed(2)} deg`,
    `- ${labels.framing}: ${translateFovFit(language, item.fovFit)}; ${translateTargetFraming(
      language,
      target.framing
    )}`,
    `- ${labels.profile}: ${selectedProfile?.name ?? customSetupLabel(language)}`,
    "",
    `## ${labels.lights}`,
    lights,
    "",
    `${labels.totalPlannedIntegration}: ${totalIntegrationMinutes} min`,
    "",
    `## ${labels.notes}`,
    `- ${translateKnownText(language, item.reason)}`,
    `- ${labels.peakAltitude}: ${item.maxAltitudeDeg} deg ${labels.at} ${item.bestTime}`,
    item.whiteNight
      ? `- ${translateKnownText(language, "White night")}: ${broadbandBackupLabel(language)}`
      : `- ${astronomicalDarknessCheckPassedLabel(language)}`,
    `- ${confirmWeatherPlateSolveLabel(language)}`
  ].join("\n");
}

export function markdownLabels(language: SupportedLanguage) {
  return {
    en: {
      capturePlan: "Capture Plan",
      multiSessionPlan: "Multi-session Plan",
      date: "Date",
      window: "Window",
      mode: "Mode",
      integration: "Integration",
      score: "Score",
      weather: "Weather",
      moon: "Moon",
      framing: "Framing",
      profile: "Profile",
      lights: "Lights",
      calibration: "Calibration",
      checklist: "Checklist",
      notes: "Notes",
      totalPlannedIntegration: "Total planned integration",
      peakAltitude: "Peak altitude",
      at: "at"
    },
    pl: {
      capturePlan: "Plan sesji",
      multiSessionPlan: "Plan multi-session",
      date: "Data",
      window: "Okno",
      mode: "Tryb",
      integration: "Integracja",
      score: "Ocena",
      weather: "Pogoda",
      moon: "Ksiezyc",
      framing: "Kadrowanie",
      profile: "Profil",
      lights: "Lighty",
      calibration: "Kalibracja",
      checklist: "Checklist",
      notes: "Notatki",
      totalPlannedIntegration: "Laczna planowana integracja",
      peakAltitude: "Maks. wysokosc",
      at: "o"
    },
    de: {
      capturePlan: "Aufnahmeplan",
      multiSessionPlan: "Multi-Session-Plan",
      date: "Datum",
      window: "Fenster",
      mode: "Modus",
      integration: "Integration",
      score: "Wertung",
      weather: "Wetter",
      moon: "Mond",
      framing: "Framing",
      profile: "Profil",
      lights: "Lights",
      calibration: "Kalibrierung",
      checklist: "Checkliste",
      notes: "Notizen",
      totalPlannedIntegration: "Geplante Gesamtintegration",
      peakAltitude: "Maximale Hoehe",
      at: "um"
    },
    it: {
      capturePlan: "Piano di cattura",
      multiSessionPlan: "Piano multi-sessione",
      date: "Data",
      window: "Finestra",
      mode: "Modo",
      integration: "Integrazione",
      score: "Punteggio",
      weather: "Meteo",
      moon: "Luna",
      framing: "Inquadratura",
      profile: "Profilo",
      lights: "Light",
      calibration: "Calibrazione",
      checklist: "Checklist",
      notes: "Note",
      totalPlannedIntegration: "Integrazione totale pianificata",
      peakAltitude: "Altitudine massima",
      at: "alle"
    },
    es: {
      capturePlan: "Plan de captura",
      multiSessionPlan: "Plan multisesion",
      date: "Fecha",
      window: "Ventana",
      mode: "Modo",
      integration: "Integracion",
      score: "Puntuacion",
      weather: "Tiempo",
      moon: "Luna",
      framing: "Encuadre",
      profile: "Perfil",
      lights: "Lights",
      calibration: "Calibracion",
      checklist: "Checklist",
      notes: "Notas",
      totalPlannedIntegration: "Integracion total planificada",
      peakAltitude: "Altitud maxima",
      at: "a las"
    }
  }[language];
}

export function weatherLabel(language: SupportedLanguage) {
  return markdownLabels(language).weather;
}

export function moonLabel(language: SupportedLanguage) {
  return markdownLabels(language).moon;
}

function modeLabel(language: SupportedLanguage) {
  return markdownLabels(language).mode;
}

function profileLabel(language: SupportedLanguage) {
  return markdownLabels(language).profile;
}

export function scoreLabel(language: SupportedLanguage) {
  return markdownLabels(language).score;
}

function customSetupLabel(language: SupportedLanguage) {
  return {
    en: "Custom setup",
    pl: "Wlasny setup",
    de: "Eigenes Setup",
    it: "Setup custom",
    es: "Setup personalizado"
  }[language];
}

function narrowbandFallbackLabel(language: SupportedLanguage) {
  return {
    en: "favor narrowband and brighter structures",
    pl: "preferuj narrowband i jasniejsze struktury",
    de: "Schmalband und hellere Strukturen bevorzugen",
    it: "preferisci narrowband e strutture piu luminose",
    es: "favorece narrowband y estructuras brillantes"
  }[language];
}

function broadbandBackupLabel(language: SupportedLanguage) {
  return {
    en: "keep broadband as backup only",
    pl: "broadband zostaw tylko jako backup",
    de: "Broadband nur als Backup behalten",
    it: "tieni broadband solo come backup",
    es: "deja broadband solo como respaldo"
  }[language];
}

function astronomicalDarknessCheckPassedLabel(language: SupportedLanguage) {
  return {
    en: "Astronomical darkness check passed",
    pl: "Kontrola ciemnosci astronomicznej zaliczona",
    de: "Astronomische Dunkelheit geprueft",
    it: "Controllo buio astronomico superato",
    es: "Control de oscuridad astronomica superado"
  }[language];
}

function confirmWeatherPlateSolveLabel(language: SupportedLanguage) {
  return {
    en: "Confirm weather trend and first-frame plate solve before committing the full run",
    pl: "Potwierdz trend pogody i plate solve pierwszej klatki przed pelnym przebiegiem",
    de: "Wettertrend und Plate-Solve des ersten Frames vor dem kompletten Run pruefen",
    it: "Conferma trend meteo e plate solve del primo frame prima della sessione completa",
    es: "Confirma tendencia meteorologica y plate solve del primer frame antes de toda la sesion"
  }[language];
}
