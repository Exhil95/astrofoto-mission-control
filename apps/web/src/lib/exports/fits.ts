import type { FovResult } from "../fov";
import { translateKnownText, translateKnownTexts, type SupportedLanguage } from "../i18n";
import type { EquipmentProfile } from "../profiles";
import type {
  CalibrationLibraryItem,
  CalibrationLibraryResult,
  FitsFrameMetadata,
  FitsScanResult
} from "../session";
import { slugifyFilename } from "./download";

export type FitsQualitySummary = {
  averageScore: number;
  fwhmPx: number | null;
  eccentricity: number | null;
  starCount: number;
  reviewFrames: number;
  flags: string[];
};

export function summarizeQuality(frames: FitsFrameMetadata[]): FitsQualitySummary | null {
  const lightFrames = frames.filter((frame) => frame.frameType === "Light");
  const scoredFrames = lightFrames.filter((frame) => frame.qualityScore !== null);
  if (!scoredFrames.length) return null;

  const averageScore = Math.round(
    scoredFrames.reduce((sum, frame) => sum + (frame.qualityScore ?? 0), 0) / scoredFrames.length
  );
  const fwhmPx = medianNumber(scoredFrames.map((frame) => frame.fwhmPx));
  const eccentricity = medianNumber(scoredFrames.map((frame) => frame.eccentricity));
  const starCount = Math.round(
    scoredFrames.reduce((sum, frame) => sum + (frame.starCount ?? 0), 0) / scoredFrames.length
  );
  const reviewFrames = scoredFrames.filter(
    (frame) => frame.status !== "ready" || (frame.qualityScore ?? 100) < 60
  ).length;
  const flags = Array.from(new Set(scoredFrames.flatMap((frame) => frame.qualityFlags)));

  return {
    averageScore,
    fwhmPx,
    eccentricity,
    starCount,
    reviewFrames,
    flags
  };
}

export function qualitySummaryLabel(frames: FitsFrameMetadata[], language: SupportedLanguage = "en") {
  const labels = fitsExportLabels(language);
  const summary = summarizeQuality(frames);
  if (!summary) return `${labels.quality}: ${labels.notMeasured}`;
  return `${labels.quality}: Q${summary.averageScore}, ${summary.starCount} ${labels.starsAvg}, FWHM ${formatOptionalNumber(
    summary.fwhmPx
  )}, e ${formatOptionalNumber(summary.eccentricity)}${
    summary.reviewFrames ? `, ${summary.reviewFrames} ${labels.review}` : ""
  }`;
}

export function formatOptionalNumber(value: number | null) {
  if (value === null) return "--";
  return Number.isInteger(value) ? `${value}` : value.toFixed(value < 1 ? 2 : 1);
}

export function createProcessingHandoffMarkdown({
  scan,
  calibrationLibrary,
  targetName,
  sessionDate,
  selectedProfile,
  fov,
  language
}: {
  scan: FitsScanResult;
  calibrationLibrary: CalibrationLibraryResult | null;
  targetName: string;
  sessionDate: string;
  selectedProfile: EquipmentProfile | null;
  fov: FovResult;
  language: SupportedLanguage;
}) {
  const labels = fitsExportLabels(language);
  const lightFrames = scan.frames.filter((frame) => frame.frameType === "Light");
  const acceptedLights = lightFrames.filter(isAcceptedLight);
  const reviewLights = lightFrames.filter((frame) => !isAcceptedLight(frame));
  const calibrationFrames = scan.frames.filter(isCalibrationFrame);
  const filters = uniqueNonEmpty(lightFrames.map((frame) => frame.filterName));
  const totalIntegrationMinutes = Math.round(scan.totalLightSeconds / 60);
  const acceptedIntegrationMinutes = Math.round(
    acceptedLights.reduce((sum, frame) => sum + (frame.exposureSeconds ?? 0), 0) / 60
  );

  return [
    `# ${labels.processingHandoff}: ${targetName}`,
    "",
    `## ${labels.session}`,
    `- ${labels.date}: ${sessionDate}`,
    `- ${labels.fitsScan}: ${scan.scanPath}`,
    `- ${labels.profile}: ${selectedProfile?.name ?? labels.customSetup}`,
    `- ${labels.camera}: ${scan.cameras.join(", ") || selectedProfile?.cameraName || labels.unknown}`,
    `- FOV: ${fov.horizontalDeg.toFixed(2)} x ${fov.verticalDeg.toFixed(2)} deg`,
    `- ${labels.filters}: ${filters.join(", ") || labels.unknown}`,
    `- ${labels.integration}: ${totalIntegrationMinutes} min ${labels.scanned} / ${acceptedIntegrationMinutes} min ${labels.accepted}`,
    `- ${qualitySummaryLabel(lightFrames, language)}`,
    "",
    `## ${labels.qualityGate}`,
    `- ${labels.acceptedLights}: ${acceptedLights.length}`,
    `- ${labels.reviewLights}: ${reviewLights.length}`,
    `- ${labels.rejectGuidance}`,
    `- ${labels.reviewGuidance}`,
    "",
    "## PixInsight WBPP Checklist",
    `- ${labels.wbppLights}`,
    `- ${labels.wbppCalibration}`,
    `- ${labels.wbppWeighting}`,
    `- ${labels.wbppCosmetic}`,
    `- ${labels.wbppBlink}`,
    "",
    "## Siril Outline",
    "```text",
    ...createSirilOutline(filters),
    "```",
    "",
    `## ${labels.lightGroups}`,
    ...createLightGroupLines(lightFrames, language),
    "",
    `## ${labels.acceptedManifest}`,
    ...createFrameManifest(acceptedLights, true, language),
    "",
    `## ${labels.reviewManifest}`,
    ...(reviewLights.length ? createFrameManifest(reviewLights, true, language) : [`- ${labels.none}`]),
    "",
    `## ${labels.currentCalibration}`,
    ...createCalibrationFrameLines(calibrationFrames, language),
    "",
    `## ${labels.libraryMatches}`,
    ...createCalibrationLibraryLines(calibrationLibrary, language),
    "",
    `## ${labels.scanWarnings}`,
    ...(scan.warnings.length ? translateKnownTexts(language, scan.warnings).map((warning) => `- ${warning}`) : [`- ${labels.none}`])
  ].join("\n");
}

export function createFitsArchiveNotes(
  scan: FitsScanResult,
  lightFrames: FitsFrameMetadata[],
  profile: EquipmentProfile | null,
  confidence: string,
  language: SupportedLanguage
) {
  const labels = fitsExportLabels(language);
  const warnings = scan.warnings.length ? translateKnownTexts(language, scan.warnings).join(" / ") : labels.none;
  return [
    `FITS import: ${translateKnownText(language, confidence)}`,
    `${labels.scanPath}: ${scan.scanPath}`,
    `${labels.lights}: ${lightFrames.length} ${labels.frames}, ${Math.round(scan.totalLightSeconds / 60)} min`,
    qualitySummaryLabel(lightFrames, language),
    `${labels.camera}: ${scan.cameras.join(", ") || labels.unknown}`,
    `${labels.temperature}: ${scan.temperatureRangeC ?? labels.unknown}`,
    `${labels.profile}: ${profile?.name ?? labels.customSetup}`,
    `${labels.scanWarnings}: ${warnings}`
  ].join("\n");
}

export function createFitsArchiveMarkdown({
  scan,
  lightFrames,
  targetName,
  sessionDate,
  windowStart,
  windowEnd,
  imagingMode,
  filterNames,
  totalIntegrationMinutes,
  selectedProfile,
  fov,
  confidence,
  language
}: {
  scan: FitsScanResult;
  lightFrames: FitsFrameMetadata[];
  targetName: string;
  sessionDate: string;
  windowStart: string;
  windowEnd: string;
  imagingMode: string;
  filterNames: string[];
  totalIntegrationMinutes: number;
  selectedProfile: EquipmentProfile | null;
  fov: FovResult;
  confidence: string;
  language: SupportedLanguage;
}) {
  const labels = fitsExportLabels(language);
  const groupLines = scan.groups
    .map(
      (group) =>
        `- ${group.label}: ${group.frames} ${labels.frames} / ${formatSeconds(group.totalExposureSeconds)} / ${group.exposureSeconds.join(", ") || "--"}s`
    )
    .join("\n");
  const filterSummary = filterNames.length ? filterNames.join(", ") : labels.unknown;

  return [
    `# ${labels.capturedSession}: ${targetName}`,
    "",
    `- ${labels.date}: ${sessionDate}`,
    `- ${labels.window}: ${windowStart} - ${windowEnd}`,
    `- ${labels.mode}: ${imagingMode}`,
    `- ${labels.lights}: ${lightFrames.length} ${labels.frames}`,
    `- ${labels.integration}: ${totalIntegrationMinutes} min`,
    `- ${labels.filters}: ${filterSummary}`,
    `- ${qualitySummaryLabel(lightFrames, language)}`,
    `- ${labels.camera}: ${scan.cameras.join(", ") || labels.unknown}`,
    `- ${labels.temperature}: ${scan.temperatureRangeC ?? labels.unknown}`,
    `- ${labels.profile}: ${selectedProfile?.name ?? labels.customSetup}`,
    `- FOV: ${fov.horizontalDeg.toFixed(2)} x ${fov.verticalDeg.toFixed(2)} deg`,
    `- ${labels.importConfidence}: ${translateKnownText(language, confidence)}`,
    "",
    `## ${labels.frameGroups}`,
    groupLines || `- ${labels.noGroups}`,
    "",
    `## ${labels.scanWarnings}`,
    scan.warnings.length
      ? translateKnownTexts(language, scan.warnings).map((warning) => `- ${warning}`).join("\n")
      : `- ${labels.none}`
  ].join("\n");
}

function isAcceptedLight(frame: FitsFrameMetadata) {
  return frame.status === "ready" && (frame.qualityScore === null || frame.qualityScore >= 60);
}

function isCalibrationFrame(frame: FitsFrameMetadata) {
  return ["Flat", "Dark flat", "Dark", "Bias"].includes(frame.frameType);
}

function createSirilOutline(filters: string[]) {
  const filterList = filters.length ? filters : ["filter"];
  return filterList.flatMap((filterName) => {
    const filterSlug = slugifyFilename(filterName, "filter");
    return [
      `# ${filterName}`,
      `# Stage accepted ${filterName} lights in work/lights/${filterSlug}`,
      `convert work/lights/${filterSlug} -out=lights_${filterSlug}`,
      `preprocess lights_${filterSlug} -bias=master_bias -dark=master_dark -flat=master_flat_${filterSlug}`,
      `register pp_lights_${filterSlug}`,
      `stack r_pp_lights_${filterSlug} rej 3 3 -norm=addscale`,
      ""
    ];
  });
}

function createLightGroupLines(frames: FitsFrameMetadata[], language: SupportedLanguage) {
  const labels = fitsExportLabels(language);
  const groups = groupFrames(frames, (frame) =>
    [frame.filterName ?? labels.noFilter, `${frame.exposureSeconds ?? "--"}s`, frame.binning ?? "binning --"].join(" / ")
  );

  if (!groups.length) return [`- ${labels.none}`];
  return groups.map(({ key, frames: groupFrames }) => {
    const integrationMinutes = Math.round(
      groupFrames.reduce((sum, frame) => sum + (frame.exposureSeconds ?? 0), 0) / 60
    );
    const acceptedCount = groupFrames.filter(isAcceptedLight).length;
    return `- ${key}: ${groupFrames.length} ${labels.frames}, ${acceptedCount} ${labels.accepted}, ${integrationMinutes} min`;
  });
}

function createFrameManifest(frames: FitsFrameMetadata[], includeQuality: boolean, language: SupportedLanguage) {
  const labels = fitsExportLabels(language);
  if (!frames.length) return [`- ${labels.none}`];
  return frames.map((frame) => {
    const quality = includeQuality ? ` / Q${frame.qualityScore ?? "--"} / ${frameReviewReason(frame, language)}` : "";
    return `- ${frame.relativePath} | ${frame.filterName ?? labels.noFilter} | ${
      frame.exposureSeconds ?? "--"
    }s${quality}`;
  });
}

function createCalibrationFrameLines(frames: FitsFrameMetadata[], language: SupportedLanguage) {
  const labels = fitsExportLabels(language);
  const groups = groupFrames(frames, (frame) =>
    [
      frame.frameType,
      frame.filterName ?? labels.allFilters,
      frame.exposureSeconds !== null ? `${frame.exposureSeconds}s` : labels.exposureUnknown,
      frame.sensorTemperatureC !== null ? `${frame.sensorTemperatureC}C` : labels.temperatureUnknown
    ].join(" / ")
  );

  if (!groups.length) return [`- ${labels.noCalibrationInCurrentScan}`];
  return groups.map(({ key, frames: groupFrames }) => `- ${key}: ${groupFrames.length} ${labels.frames}`);
}

function createCalibrationLibraryLines(library: CalibrationLibraryResult | null, language: SupportedLanguage) {
  const labels = fitsExportLabels(language);
  if (!library) return [`- ${labels.noSeparateLibrary}`];
  const rows = [
    `- ${labels.libraryScan}: ${library.scanPath}`,
    `- ${translateKnownText(language, library.summary)}`,
    ...library.items.slice(0, 12).map((item) => formatCalibrationLibraryItem(item, language))
  ];
  if (library.warnings.length) {
    rows.push(...translateKnownTexts(language, library.warnings).map((warning) => `- ${labels.warning}: ${warning}`));
  }
  return rows;
}

function formatCalibrationLibraryItem(item: CalibrationLibraryItem, language: SupportedLanguage) {
  const labels = fitsExportLabels(language);
  return `- ${translateKnownText(language, item.matchStatus)} Q${item.matchScore}: ${[
    item.frameType,
    item.filterName,
    item.exposureSeconds !== null ? `${item.exposureSeconds}s` : null,
    item.temperatureRangeC
  ]
    .filter(Boolean)
    .join(" / ")} (${item.frames} ${labels.frames}, ${translateKnownText(language, item.reason)})`;
}

function frameReviewReason(frame: FitsFrameMetadata, language: SupportedLanguage) {
  const labels = fitsExportLabels(language);
  const reasons = [...frame.qualityFlags, ...frame.warnings];
  if (frame.qualityScore !== null && frame.qualityScore < 60) reasons.unshift(labels.lowQualityScore);
  return reasons.length ? translateKnownTexts(language, reasons).join(", ") : labels.accepted;
}

function groupFrames<T>(items: T[], keyFor: (item: T) => string) {
  const grouped = items.reduce((accumulator, item) => {
    const key = keyFor(item);
    const group = accumulator.get(key) ?? [];
    group.push(item);
    accumulator.set(key, group);
    return accumulator;
  }, new Map<string, T[]>());
  return [...grouped.entries()].map(([key, frames]) => ({ key, frames }));
}

function medianNumber(values: Array<number | null>) {
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.round(seconds / 60)}m`;
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))
  );
}

function fitsExportLabels(language: SupportedLanguage) {
  return {
    ...baseFitsLabels,
    ...fitsLabelOverrides[language]
  };
}

const baseFitsLabels = {
  processingHandoff: "Processing Handoff",
  session: "Session",
  date: "Date",
  fitsScan: "FITS scan",
  profile: "Profile",
  customSetup: "Custom setup",
  camera: "Camera",
  unknown: "unknown",
  filters: "Filters",
  integration: "Integration",
  scanned: "scanned",
  accepted: "accepted",
  quality: "Quality",
  notMeasured: "not measured",
  starsAvg: "stars avg",
  review: "review",
  qualityGate: "Quality Gate",
  acceptedLights: "Accepted lights",
  reviewLights: "Review/reject lights",
  rejectGuidance: "Reject or isolate frames marked with low Q, elongated stars, sparse stars, clipping, clouds, or inconsistent metadata.",
  reviewGuidance: "Keep review frames out of the first stack. Re-test them only if the final integration is too shallow.",
  wbppLights: "Add accepted Light frames only. Use FILTER, EXPTIME, CCD-TEMP, GAIN/OFFSET, and BINNING keywords for grouping.",
  wbppCalibration: "Add master or raw Bias/Dark/Flat frames from the calibration section below.",
  wbppWeighting: "Enable Subframe Weighting and Local Normalization when gradients or passing cloud risk is visible.",
  wbppCosmetic: "Use CosmeticCorrection only after checking hot-pixel behavior against matched darks.",
  wbppBlink: "Run Blink/SubframeSelector on the review list before deciding whether any borderline frame returns to the set.",
  lightGroups: "Light Groups",
  acceptedManifest: "Accepted Light Manifest",
  reviewManifest: "Review Light Manifest",
  currentCalibration: "Calibration Frames In Current Scan",
  libraryMatches: "Calibration Library Matches",
  scanWarnings: "Scan Warnings",
  noSeparateLibrary: "No separate calibration library scan attached",
  libraryScan: "Library scan",
  warning: "Warning",
  none: "none",
  frames: "frames",
  noFilter: "No filter",
  allFilters: "all filters",
  exposureUnknown: "exposure --",
  temperatureUnknown: "temp --",
  noCalibrationInCurrentScan: "none in current scan",
  lowQualityScore: "low quality score",
  capturedSession: "Captured Session",
  window: "Window",
  mode: "Mode",
  lights: "Lights",
  temperature: "Temperature",
  frameGroups: "Frame groups",
  noGroups: "No groups",
  importConfidence: "Import confidence",
  scanPath: "Scan path"
};

const fitsLabelOverrides: Partial<Record<SupportedLanguage, Partial<typeof baseFitsLabels>>> = {
  pl: {
    processingHandoff: "Handoff obrobki",
    date: "Data",
    fitsScan: "Skan FITS",
    profile: "Profil",
    customSetup: "Wlasny setup",
    camera: "Kamera",
    unknown: "nieznane",
    filters: "Filtry",
    integration: "Integracja",
    scanned: "zeskanowane",
    accepted: "zaakceptowane",
    quality: "Jakosc",
    notMeasured: "niezmierzona",
    starsAvg: "gwiazd srednio",
    qualityGate: "Bramka jakosci",
    acceptedLights: "Zaakceptowane lighty",
    reviewLights: "Lighty do review/odrzucenia",
    rejectGuidance: "Odrzuc lub odizoluj klatki z niskim Q, wydluzonymi gwiazdami, mala liczba gwiazd, clippingiem, chmurami lub niespojnymi metadanymi.",
    reviewGuidance: "Klatki review trzymaj poza pierwszym stackiem. Testuj je dopiero, jesli integracja koncowa jest za plytka.",
    wbppLights: "Dodaj tylko zaakceptowane klatki Light. Do grupowania uzyj FILTER, EXPTIME, CCD-TEMP, GAIN/OFFSET i BINNING.",
    wbppCalibration: "Dodaj mastery lub surowe Bias/Dark/Flat z sekcji kalibracji nizej.",
    wbppWeighting: "Wlacz Subframe Weighting i Local Normalization, gdy widac gradienty lub ryzyko chmur.",
    wbppCosmetic: "CosmeticCorrection stosuj dopiero po sprawdzeniu hot pixeli wzgledem dopasowanych darkow.",
    wbppBlink: "Uruchom Blink/SubframeSelector na liscie review przed przywracaniem granicznych klatek.",
    lightGroups: "Grupy lightow",
    acceptedManifest: "Manifest zaakceptowanych lightow",
    reviewManifest: "Manifest lightow review",
    currentCalibration: "Klatki kalibracyjne w biezacym skanie",
    libraryMatches: "Dopasowania biblioteki kalibracji",
    scanWarnings: "Ostrzezenia skanu",
    noSeparateLibrary: "Brak osobnego skanu biblioteki kalibracji",
    libraryScan: "Skan biblioteki",
    warning: "Ostrzezenie",
    none: "brak",
    frames: "klatek",
    noFilter: "Brak filtra",
    allFilters: "wszystkie filtry",
    noCalibrationInCurrentScan: "brak w biezacym skanie",
    lowQualityScore: "niska ocena jakosci",
    capturedSession: "Zarejestrowana sesja",
    window: "Okno",
    mode: "Tryb",
    lights: "Lighty",
    temperature: "Temperatura",
    noGroups: "Brak grup",
    importConfidence: "Pewnosc importu",
    scanPath: "Sciezka skanu"
  },
  de: {
    processingHandoff: "Bearbeitungs-Handoff",
    fitsScan: "FITS-Scan",
    customSetup: "Eigenes Setup",
    unknown: "unbekannt",
    filters: "Filter",
    scanned: "gescannt",
    accepted: "akzeptiert",
    notMeasured: "nicht gemessen",
    starsAvg: "Sterne im Schnitt",
    qualityGate: "Qualitaetspruefung",
    acceptedLights: "Akzeptierte Lights",
    reviewLights: "Lights zur Pruefung/Ablehnung",
    rejectGuidance: "Frames mit niedrigem Q, elongierten Sternen, wenigen Sternen, Clipping, Wolken oder inkonsistenten Metadaten isolieren oder ablehnen.",
    reviewGuidance: "Review-Frames aus dem ersten Stack lassen. Nur erneut testen, wenn die Integration zu schwach ist.",
    wbppLights: "Nur akzeptierte Light-Frames hinzufuegen. Fuer Gruppierung FILTER, EXPTIME, CCD-TEMP, GAIN/OFFSET und BINNING nutzen.",
    wbppCalibration: "Master oder rohe Bias/Dark/Flat aus der Kalibriersektion hinzufuegen.",
    wbppWeighting: "Subframe Weighting und Local Normalization bei sichtbaren Gradienten oder Wolkenrisiko aktivieren.",
    wbppCosmetic: "CosmeticCorrection erst nach Pruefung von Hotpixeln gegen passende Darks nutzen.",
    wbppBlink: "Blink/SubframeSelector fuer Review-Liste ausfuehren, bevor Grenzfaelle zurueckkehren.",
    lightGroups: "Light-Gruppen",
    acceptedManifest: "Manifest akzeptierter Lights",
    reviewManifest: "Manifest gepruefter Lights",
    currentCalibration: "Kalibrierframes im aktuellen Scan",
    libraryMatches: "Treffer der Kalibrierbibliothek",
    scanWarnings: "Scan-Warnungen",
    noSeparateLibrary: "Kein separater Scan der Kalibrierbibliothek angehaengt",
    libraryScan: "Bibliotheksscan",
    frames: "Frames",
    noFilter: "Kein Filter",
    allFilters: "alle Filter",
    noCalibrationInCurrentScan: "keine im aktuellen Scan",
    lowQualityScore: "niedriger Qualitaetswert",
    capturedSession: "Aufgenommene Session",
    importConfidence: "Import-Sicherheit",
    scanPath: "Scan-Pfad"
  },
  it: {
    processingHandoff: "Handoff elaborazione",
    session: "Sessione",
    date: "Data",
    fitsScan: "Scan FITS",
    customSetup: "Setup custom",
    filters: "Filtri",
    scanned: "scansionati",
    accepted: "accettati",
    notMeasured: "non misurata",
    starsAvg: "stelle medie",
    review: "revisione",
    qualityGate: "Controllo qualita",
    acceptedLights: "Light accettati",
    reviewLights: "Light da revisione/scarto",
    rejectGuidance: "Scarta o isola frame con Q basso, stelle allungate, poche stelle, clipping, nuvole o metadati incoerenti.",
    reviewGuidance: "Tieni i frame review fuori dal primo stack. Ritestali solo se l'integrazione finale e troppo debole.",
    wbppLights: "Aggiungi solo Light accettati. Usa FILTER, EXPTIME, CCD-TEMP, GAIN/OFFSET e BINNING per il grouping.",
    wbppCalibration: "Aggiungi master o Bias/Dark/Flat raw dalla sezione calibrazione sotto.",
    wbppWeighting: "Attiva Subframe Weighting e Local Normalization quando vedi gradienti o rischio nuvole.",
    wbppCosmetic: "Usa CosmeticCorrection solo dopo aver verificato hot pixel con dark abbinati.",
    wbppBlink: "Esegui Blink/SubframeSelector sulla lista review prima di reinserire frame limite.",
    lightGroups: "Gruppi light",
    acceptedManifest: "Manifest light accettati",
    reviewManifest: "Manifest light review",
    currentCalibration: "Frame calibrazione nello scan corrente",
    libraryMatches: "Match libreria calibrazione",
    scanWarnings: "Avvisi scan",
    noSeparateLibrary: "Nessuno scan libreria calibrazione separato allegato",
    libraryScan: "Scan libreria",
    warning: "Avviso",
    none: "nessuno",
    noFilter: "Nessun filtro",
    allFilters: "tutti i filtri",
    noCalibrationInCurrentScan: "nessuno nello scan corrente",
    lowQualityScore: "punteggio qualita basso",
    capturedSession: "Sessione acquisita",
    window: "Finestra",
    mode: "Modalita",
    frameGroups: "Gruppi frame",
    noGroups: "Nessun gruppo",
    importConfidence: "Confidenza import",
    scanPath: "Percorso scan"
  },
  es: {
    processingHandoff: "Handoff de procesado",
    session: "Sesion",
    date: "Fecha",
    fitsScan: "Scan FITS",
    profile: "Perfil",
    customSetup: "Setup personalizado",
    camera: "Camara",
    unknown: "desconocido",
    filters: "Filtros",
    integration: "Integracion",
    scanned: "escaneados",
    accepted: "aceptados",
    quality: "Calidad",
    notMeasured: "no medida",
    starsAvg: "estrellas prom.",
    review: "revision",
    qualityGate: "Control de calidad",
    acceptedLights: "Lights aceptados",
    reviewLights: "Lights para revisar/rechazar",
    rejectGuidance: "Rechaza o aisla frames con Q bajo, estrellas alargadas, pocas estrellas, clipping, nubes o metadatos inconsistentes.",
    reviewGuidance: "Manten frames de revision fuera del primer stack. Repruebalos solo si la integracion final queda corta.",
    wbppLights: "Anade solo Light aceptados. Usa FILTER, EXPTIME, CCD-TEMP, GAIN/OFFSET y BINNING para agrupar.",
    wbppCalibration: "Anade masters o Bias/Dark/Flat raw desde la seccion de calibracion inferior.",
    wbppWeighting: "Activa Subframe Weighting y Local Normalization si hay gradientes o riesgo de nubes.",
    wbppCosmetic: "Usa CosmeticCorrection solo tras revisar hot pixels con darks coincidentes.",
    wbppBlink: "Ejecuta Blink/SubframeSelector en la lista de revision antes de devolver frames limite.",
    lightGroups: "Grupos light",
    acceptedManifest: "Manifiesto de lights aceptados",
    reviewManifest: "Manifiesto de lights en revision",
    currentCalibration: "Frames de calibracion en el scan actual",
    libraryMatches: "Coincidencias de biblioteca de calibracion",
    scanWarnings: "Avisos del scan",
    noSeparateLibrary: "Sin scan separado de biblioteca de calibracion adjunto",
    libraryScan: "Scan biblioteca",
    warning: "Aviso",
    none: "ninguno",
    noFilter: "Sin filtro",
    allFilters: "todos los filtros",
    exposureUnknown: "exposicion --",
    noCalibrationInCurrentScan: "ninguno en el scan actual",
    lowQualityScore: "puntuacion de calidad baja",
    capturedSession: "Sesion capturada",
    window: "Ventana",
    mode: "Modo",
    temperature: "Temperatura",
    frameGroups: "Grupos de frames",
    noGroups: "Sin grupos",
    importConfidence: "Confianza de importacion",
    scanPath: "Ruta del scan"
  }
};
