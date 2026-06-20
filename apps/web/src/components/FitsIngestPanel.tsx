import {
  Archive,
  CheckCircle2,
  Clock3,
  Database,
  FileDown,
  FileSearch,
  FolderOpen,
  Layers3,
  TriangleAlert
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { FovResult } from "../lib/fov";
import {
  translateKnownText,
  translateKnownTexts,
  translations,
  type SupportedLanguage
} from "../lib/i18n";
import type { EquipmentProfile } from "../lib/profiles";
import {
  saveSessionArchive,
  scanFitsFrames,
  type CalibrationLibraryItem,
  type CalibrationLibraryResult,
  type FitsFrameMetadata,
  type FitsScanResult,
  type SessionArchiveEntry,
  type SessionArchivePayload,
  type SessionSettings
} from "../lib/session";
import type { Target } from "../lib/targets";

type FitsIngestPanelProps = {
  targets: Target[];
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
  calibrationLibrary: CalibrationLibraryResult | null;
  language: SupportedLanguage;
  onArchiveCreated: (archive: SessionArchiveEntry) => void;
};

export function FitsIngestPanel({
  targets,
  selectedProfile,
  settings,
  fov,
  calibrationLibrary,
  language,
  onArchiveCreated
}: FitsIngestPanelProps) {
  const text = translations[language].fitsIngest;
  const common = translations[language].common;
  const [scanPath, setScanPath] = useState(".");
  const [recursive, setRecursive] = useState(true);
  const [maxFiles, setMaxFiles] = useState(250);
  const [result, setResult] = useState<FitsScanResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [importState, setImportState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  const runScan = async () => {
    setLoading(true);
    setError("");
    setImportState("idle");
    try {
      const scan = await scanFitsFrames({
        path: scanPath.trim() || ".",
        recursive,
        maxFiles
      });
      setResult(scan);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.failed);
    } finally {
      setLoading(false);
    }
  };

  const importDraft = result
    ? createArchiveImportDraft({
        scan: result,
        targets,
        selectedProfile,
        settings,
        fov,
        language
      })
    : null;

  const importSession = async () => {
    if (!importDraft) return;
    setImportState("saving");
    try {
      const archive = await saveSessionArchive(importDraft.payload);
      onArchiveCreated(archive);
      setImportState("saved");
      window.setTimeout(() => setImportState("idle"), 1600);
    } catch {
      setImportState("failed");
    }
  };

  const downloadHandoff = () => {
    if (!result) return;
    const targetName = importDraft?.targetLabel ?? mostCommon(result.objects) ?? "captured-session";
    const sessionDate = importDraft?.payload.sessionDate ?? settings.date;
    const markdown = createProcessingHandoffMarkdown({
      scan: result,
      calibrationLibrary,
      targetName,
      sessionDate,
      selectedProfile,
      fov,
      language
    });
    downloadTextFile(
      `${sessionDate}-${slugify(targetName)}-processing-handoff.md`,
      markdown,
      "text/markdown;charset=utf-8"
    );
  };

  const lightMinutes = result ? Math.round(result.totalLightSeconds / 60) : 0;
  const qualitySummary = result ? summarizeQuality(result.frames) : null;

  return (
    <section className="fits-ingest-panel" aria-label={text.aria}>
      <div className="fits-ingest-head">
        <div>
          <span>{loading ? text.scanning : result?.scanPath ?? text.frames}</span>
          <strong>{text.title}</strong>
        </div>
        <div className="fits-head-actions">
          <button type="button" onClick={runScan} disabled={loading} title={text.scanTitle}>
            <FileSearch size={16} aria-hidden="true" />
            {text.scan}
          </button>
          <button
            type="button"
            onClick={importSession}
            disabled={!importDraft || importState === "saving"}
            title={text.importTitle}
          >
            <Archive size={16} aria-hidden="true" />
            {importLabel(importState, text)}
          </button>
          <button
            type="button"
            onClick={downloadHandoff}
            disabled={!result}
            title={text.handoffTitle}
          >
            <FileDown size={16} aria-hidden="true" />
            {text.handoff}
          </button>
        </div>
      </div>

      <div className="fits-scan-controls">
        <label className="fits-path-field">
          <span>{text.path}</span>
          <input
            value={scanPath}
            onChange={(event) => setScanPath(event.target.value)}
            placeholder="."
          />
        </label>
        <label>
          <span>{text.limit}</span>
          <input
            type="number"
            min={1}
            max={2000}
            value={maxFiles}
            onChange={(event) => setMaxFiles(Number(event.target.value))}
          />
        </label>
        <label className="fits-checkbox">
          <input
            type="checkbox"
            checked={recursive}
            onChange={(event) => setRecursive(event.target.checked)}
          />
          <span>{text.recursive}</span>
        </label>
      </div>

      {error && (
        <div className="fits-warning is-error">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="fits-metrics" aria-label={text.summary}>
        <MetricCard
          icon={<Database size={15} aria-hidden="true" />}
          label={text.parsed}
          value={result ? `${result.parsedFiles}/${result.totalFiles}` : "--"}
          detail={result ? `${result.rejectedFiles} ${text.rejected}` : common.waiting}
        />
        <MetricCard
          icon={<Clock3 size={15} aria-hidden="true" />}
          label={text.lights}
          value={result ? `${lightMinutes} min` : "--"}
          detail={result?.exposureRangeSeconds ?? text.exposure}
        />
        <MetricCard
          icon={<CheckCircle2 size={15} aria-hidden="true" />}
          label={text.quality}
          value={qualitySummary ? `Q${qualitySummary.averageScore}` : "--"}
          detail={
            qualitySummary
              ? `${qualitySummary.reviewFrames} ${text.review} / FWHM ${formatOptionalNumber(
                  qualitySummary.fwhmPx
                )}`
              : result?.cameras.join(" / ") || common.waiting
          }
        />
        <MetricCard
          icon={<Layers3 size={15} aria-hidden="true" />}
          label={text.filters}
          value={result?.filters.join(" + ") || "--"}
          detail={result?.objects.join(" / ") || text.object}
        />
      </div>

      <div className={`fits-import-card ${importDraft ? "" : "is-disabled"}`}>
        <div>
          <span>{importDraft ? importDraft.confidence : result ? text.noLightFrames : text.archiveImport}</span>
          <strong>{importDraft?.targetLabel ?? text.importUnavailable}</strong>
          <em>{importDraft?.summary ?? (result ? text.scanNeedsLight : text.scanCreateArchive)}</em>
        </div>
        <b>{importDraft ? `${importDraft.payload.capturedFrames} ${text.frames.toLowerCase()}` : "--"}</b>
      </div>

      <div className="fits-content">
        <section aria-label="FITS groups">
          <div className="fits-section-title">
            <FolderOpen size={14} aria-hidden="true" />
            <span>{text.groups}</span>
          </div>
          <div className="fits-group-list">
            {result?.groups.length ? (
              result.groups.map((group) => (
                <div key={`${group.label}-${group.totalExposureSeconds}`}>
                  <span>{group.frames} {text.frames.toLowerCase()}</span>
                  <strong>{group.label}</strong>
                  <em>
                    {formatSeconds(group.totalExposureSeconds)} /{" "}
                    {group.exposureSeconds.join(", ") || "--"}s
                  </em>
                </div>
              ))
            ) : (
              <EmptyState label={text.noGroups} />
            )}
          </div>
        </section>

        <section aria-label="FITS frame list">
          <div className="fits-section-title">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>{text.frames}</span>
          </div>
          <div className="fits-frame-list">
            {result?.frames.length ? (
              result.frames.slice(0, 12).map((frame) => (
                <FrameRow key={frame.relativePath} frame={frame} language={language} />
              ))
            ) : (
              <EmptyState label={text.noFrames} />
            )}
          </div>
        </section>
      </div>

      {result?.warnings.length ? (
        <div className="fits-warning">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{translateKnownTexts(language, result.warnings).join(" / ")}</span>
        </div>
      ) : (
        <div className="fits-warning is-clean">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>{result ? text.metadataConsistent : text.awaitingScan}</span>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </div>
  );
}

function FrameRow({ frame, language }: { frame: FitsFrameMetadata; language: SupportedLanguage }) {
  const text = translations[language].fitsIngest;
  const scoreLabel = frame.qualityScore !== null ? ` / Q${frame.qualityScore}` : "";
  const frameFlags = [...frame.warnings, ...frame.qualityFlags];
  return (
    <div className={frame.status === "ready" ? "" : "needs-review"}>
      <span>
        {frame.frameType}
        {scoreLabel}
      </span>
      <strong>{frame.fileName}</strong>
      <em>
        {frame.filterName ?? text.noFilter} / {frame.exposureSeconds ?? "--"}s /{" "}
        {frame.sensorTemperatureC ?? "--"}C / {frameQualityDetail(frame, text)}
        {frameFlags.length ? ` / ${translateKnownText(language, frameFlags[0])}` : ""}
      </em>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="fits-empty">
      <span>{label}</span>
    </div>
  );
}

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.round(seconds / 60)}m`;
}

function frameQualityDetail(
  frame: FitsFrameMetadata,
  text: (typeof translations)[SupportedLanguage]["fitsIngest"]
) {
  if (frame.qualityScore === null) {
    return frame.backgroundAdu !== null ? `BG ${formatOptionalNumber(frame.backgroundAdu)}` : text.qualityMissing;
  }
  return `${frame.starCount ?? 0} ${text.stars} / FWHM ${formatOptionalNumber(
    frame.fwhmPx
  )} / e ${formatOptionalNumber(frame.eccentricity)}`;
}

function summarizeQuality(frames: FitsFrameMetadata[]) {
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

function qualitySummaryLabel(frames: FitsFrameMetadata[], language: SupportedLanguage = "en") {
  const labels = fitsExportLabels(language);
  const summary = summarizeQuality(frames);
  if (!summary) return `${labels.quality}: ${labels.notMeasured}`;
  return `${labels.quality}: Q${summary.averageScore}, ${summary.starCount} ${labels.starsAvg}, FWHM ${formatOptionalNumber(
    summary.fwhmPx
  )}, e ${formatOptionalNumber(summary.eccentricity)}${
    summary.reviewFrames ? `, ${summary.reviewFrames} ${labels.review}` : ""
  }`;
}

function medianNumber(values: Array<number | null>) {
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function formatOptionalNumber(value: number | null) {
  if (value === null) return "--";
  return Number.isInteger(value) ? `${value}` : value.toFixed(value < 1 ? 2 : 1);
}

function fitsMarkdownLabels(language: SupportedLanguage) {
  return {
    en: {
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
      warning: "Warning"
    },
    pl: {
      processingHandoff: "Handoff obróbki",
      session: "Sesja",
      date: "Data",
      fitsScan: "Skan FITS",
      profile: "Profil",
      customSetup: "Własny setup",
      camera: "Kamera",
      unknown: "nieznane",
      filters: "Filtry",
      integration: "Integracja",
      scanned: "zeskanowane",
      accepted: "zaakceptowane",
      quality: "Jakość",
      notMeasured: "niezmierzona",
      starsAvg: "gwiazd średnio",
      review: "review",
      qualityGate: "Bramka jakości",
      acceptedLights: "Zaakceptowane lighty",
      reviewLights: "Lighty do review/odrzucenia",
      rejectGuidance: "Odrzuć lub odizoluj klatki z niskim Q, wydłużonymi gwiazdami, małą liczbą gwiazd, clippingiem, chmurami lub niespójnymi metadanymi.",
      reviewGuidance: "Klatki review trzymaj poza pierwszym stackiem. Testuj je dopiero, jeśli integracja końcowa jest za płytka.",
      wbppLights: "Dodaj tylko zaakceptowane klatki Light. Do grupowania użyj FILTER, EXPTIME, CCD-TEMP, GAIN/OFFSET i BINNING.",
      wbppCalibration: "Dodaj mastery lub surowe Bias/Dark/Flat z sekcji kalibracji niżej.",
      wbppWeighting: "Włącz Subframe Weighting i Local Normalization, gdy widać gradienty lub ryzyko chmur.",
      wbppCosmetic: "CosmeticCorrection stosuj dopiero po sprawdzeniu hot pixeli względem dopasowanych darków.",
      wbppBlink: "Uruchom Blink/SubframeSelector na liście review przed przywracaniem granicznych klatek.",
      lightGroups: "Grupy lightów",
      acceptedManifest: "Manifest zaakceptowanych lightów",
      reviewManifest: "Manifest lightów review",
      currentCalibration: "Klatki kalibracyjne w bieżącym skanie",
      libraryMatches: "Dopasowania biblioteki kalibracji",
      scanWarnings: "Ostrzeżenia skanu",
      noSeparateLibrary: "Brak osobnego skanu biblioteki kalibracji",
      libraryScan: "Skan biblioteki",
      warning: "Ostrzeżenie"
    },
    de: {
      processingHandoff: "Bearbeitungs-Handoff",
      session: "Session",
      date: "Datum",
      fitsScan: "FITS-Scan",
      profile: "Profil",
      customSetup: "Eigenes Setup",
      camera: "Kamera",
      unknown: "unbekannt",
      filters: "Filter",
      integration: "Integration",
      scanned: "gescannt",
      accepted: "akzeptiert",
      quality: "Qualität",
      notMeasured: "nicht gemessen",
      starsAvg: "Sterne im Schnitt",
      review: "Prüfung",
      qualityGate: "Qualitätsprüfung",
      acceptedLights: "Akzeptierte Lights",
      reviewLights: "Lights zur Prüfung/Ablehnung",
      rejectGuidance: "Frames mit niedrigem Q, elongierten Sternen, wenigen Sternen, Clipping, Wolken oder inkonsistenten Metadaten isolieren oder ablehnen.",
      reviewGuidance: "Review-Frames aus dem ersten Stack lassen. Nur erneut testen, wenn die Integration zu schwach ist.",
      wbppLights: "Nur akzeptierte Light-Frames hinzufügen. Für Gruppierung FILTER, EXPTIME, CCD-TEMP, GAIN/OFFSET und BINNING nutzen.",
      wbppCalibration: "Master oder rohe Bias/Dark/Flat aus der Kalibriersektion hinzufügen.",
      wbppWeighting: "Subframe Weighting und Local Normalization bei sichtbaren Gradienten oder Wolkenrisiko aktivieren.",
      wbppCosmetic: "CosmeticCorrection erst nach Prüfung von Hotpixeln gegen passende Darks nutzen.",
      wbppBlink: "Blink/SubframeSelector für Review-Liste ausführen, bevor Grenzfälle zurückkehren.",
      lightGroups: "Light-Gruppen",
      acceptedManifest: "Manifest akzeptierter Lights",
      reviewManifest: "Manifest geprüfter Lights",
      currentCalibration: "Kalibrierframes im aktuellen Scan",
      libraryMatches: "Treffer der Kalibrierbibliothek",
      scanWarnings: "Scan-Warnungen",
      noSeparateLibrary: "Kein separater Scan der Kalibrierbibliothek angehängt",
      libraryScan: "Bibliotheksscan",
      warning: "Warnung"
    },
    it: {
      processingHandoff: "Handoff elaborazione",
      session: "Sessione",
      date: "Data",
      fitsScan: "Scan FITS",
      profile: "Profilo",
      customSetup: "Setup custom",
      camera: "Camera",
      unknown: "sconosciuto",
      filters: "Filtri",
      integration: "Integrazione",
      scanned: "scansionati",
      accepted: "accettati",
      quality: "Qualità",
      notMeasured: "non misurata",
      starsAvg: "stelle medie",
      review: "revisione",
      qualityGate: "Controllo qualità",
      acceptedLights: "Light accettati",
      reviewLights: "Light da revisione/scarto",
      rejectGuidance: "Scarta o isola frame con Q basso, stelle allungate, poche stelle, clipping, nuvole o metadati incoerenti.",
      reviewGuidance: "Tieni i frame review fuori dal primo stack. Ritestali solo se l'integrazione finale è troppo debole.",
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
      warning: "Avviso"
    },
    es: {
      processingHandoff: "Handoff de procesado",
      session: "Sesión",
      date: "Fecha",
      fitsScan: "Scan FITS",
      profile: "Perfil",
      customSetup: "Setup personalizado",
      camera: "Cámara",
      unknown: "desconocido",
      filters: "Filtros",
      integration: "Integración",
      scanned: "escaneados",
      accepted: "aceptados",
      quality: "Calidad",
      notMeasured: "no medida",
      starsAvg: "estrellas prom.",
      review: "revisión",
      qualityGate: "Control de calidad",
      acceptedLights: "Lights aceptados",
      reviewLights: "Lights para revisar/rechazar",
      rejectGuidance: "Rechaza o aísla frames con Q bajo, estrellas alargadas, pocas estrellas, clipping, nubes o metadatos inconsistentes.",
      reviewGuidance: "Mantén frames de revisión fuera del primer stack. Repruébalos solo si la integración final queda corta.",
      wbppLights: "Añade solo Light aceptados. Usa FILTER, EXPTIME, CCD-TEMP, GAIN/OFFSET y BINNING para agrupar.",
      wbppCalibration: "Añade masters o Bias/Dark/Flat raw desde la sección de calibración inferior.",
      wbppWeighting: "Activa Subframe Weighting y Local Normalization si hay gradientes o riesgo de nubes.",
      wbppCosmetic: "Usa CosmeticCorrection solo tras revisar hot pixels con darks coincidentes.",
      wbppBlink: "Ejecuta Blink/SubframeSelector en la lista de revisión antes de devolver frames límite.",
      lightGroups: "Grupos light",
      acceptedManifest: "Manifiesto de lights aceptados",
      reviewManifest: "Manifiesto de lights en revisión",
      currentCalibration: "Frames de calibración en el scan actual",
      libraryMatches: "Coincidencias de biblioteca de calibración",
      scanWarnings: "Avisos del scan",
      noSeparateLibrary: "Sin scan separado de biblioteca de calibración adjunto",
      libraryScan: "Scan biblioteca",
      warning: "Aviso"
    }
  }[language];
}

function fitsExportLabels(language: SupportedLanguage) {
  return {
    ...fitsMarkdownLabels(language),
    ...{
      en: {
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
      },
      pl: {
        none: "brak",
        frames: "klatek",
        noFilter: "Brak filtra",
        allFilters: "wszystkie filtry",
        exposureUnknown: "ekspozycja --",
        temperatureUnknown: "temp --",
        noCalibrationInCurrentScan: "brak w bieżącym skanie",
        lowQualityScore: "niska ocena jakości",
        capturedSession: "Zarejestrowana sesja",
        window: "Okno",
        mode: "Tryb",
        lights: "Lighty",
        temperature: "Temperatura",
        frameGroups: "Grupy klatek",
        noGroups: "Brak grup",
        importConfidence: "Pewność importu",
        scanPath: "Ścieżka skanu"
      },
      de: {
        none: "keine",
        frames: "Frames",
        noFilter: "Kein Filter",
        allFilters: "alle Filter",
        exposureUnknown: "Belichtung --",
        temperatureUnknown: "Temp --",
        noCalibrationInCurrentScan: "keine im aktuellen Scan",
        lowQualityScore: "niedriger Qualitätswert",
        capturedSession: "Aufgenommene Session",
        window: "Fenster",
        mode: "Modus",
        lights: "Lights",
        temperature: "Temperatur",
        frameGroups: "Frame-Gruppen",
        noGroups: "Keine Gruppen",
        importConfidence: "Import-Sicherheit",
        scanPath: "Scan-Pfad"
      },
      it: {
        none: "nessuno",
        frames: "frame",
        noFilter: "Nessun filtro",
        allFilters: "tutti i filtri",
        exposureUnknown: "esposizione --",
        temperatureUnknown: "temp --",
        noCalibrationInCurrentScan: "nessuno nello scan corrente",
        lowQualityScore: "punteggio qualità basso",
        capturedSession: "Sessione acquisita",
        window: "Finestra",
        mode: "Modalità",
        lights: "Light",
        temperature: "Temperatura",
        frameGroups: "Gruppi frame",
        noGroups: "Nessun gruppo",
        importConfidence: "Confidenza import",
        scanPath: "Percorso scan"
      },
      es: {
        none: "ninguno",
        frames: "frames",
        noFilter: "Sin filtro",
        allFilters: "todos los filtros",
        exposureUnknown: "exposición --",
        temperatureUnknown: "temp --",
        noCalibrationInCurrentScan: "ninguno en el scan actual",
        lowQualityScore: "puntuación de calidad baja",
        capturedSession: "Sesión capturada",
        window: "Ventana",
        mode: "Modo",
        lights: "Lights",
        temperature: "Temperatura",
        frameGroups: "Grupos de frames",
        noGroups: "Sin grupos",
        importConfidence: "Confianza de importación",
        scanPath: "Ruta del scan"
      }
    }[language]
  };
}

function createProcessingHandoffMarkdown({
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

function isAcceptedLight(frame: FitsFrameMetadata) {
  return frame.status === "ready" && (frame.qualityScore === null || frame.qualityScore >= 60);
}

function isCalibrationFrame(frame: FitsFrameMetadata) {
  return ["Flat", "Dark flat", "Dark", "Bias"].includes(frame.frameType);
}

function createSirilOutline(filters: string[]) {
  const filterList = filters.length ? filters : ["filter"];
  return filterList.flatMap((filterName) => {
    const filterSlug = slugify(filterName);
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

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "session";
}

function importLabel(
  state: "idle" | "saving" | "saved" | "failed",
  text: (typeof translations)[SupportedLanguage]["fitsIngest"]
) {
  if (state === "saving") return text.saving;
  if (state === "saved") return text.saved;
  if (state === "failed") return text.retry;
  return text.import;
}

function createArchiveImportDraft({
  scan,
  targets,
  selectedProfile,
  settings,
  fov,
  language
}: {
  scan: FitsScanResult;
  targets: Target[];
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
  language: SupportedLanguage;
}) {
  const lightFrames = scan.frames.filter((frame) => frame.frameType === "Light");
  if (!lightFrames.length) return null;

  const objectName = mostCommon(
    lightFrames.map((frame) => frame.objectName).filter((value): value is string => Boolean(value))
  );
  const matchedTarget = findTargetMatch(targets, objectName);
  const targetName = matchedTarget?.name ?? objectName ?? "Imported FITS session";
  const targetId = matchedTarget?.id ?? normalizeTargetId(targetName);
  const filterNames = uniqueNonEmpty(lightFrames.map((frame) => frame.filterName));
  const capturedFrames = lightFrames.length;
  const totalLightSeconds = lightFrames.reduce((sum, frame) => sum + (frame.exposureSeconds ?? 0), 0);
  const totalIntegrationMinutes = Math.max(0, Math.round(totalLightSeconds / 60));
  const qualitySummary = summarizeQuality(lightFrames);
  const firstLight = earliestFrame(lightFrames);
  const lastLight = latestFrame(lightFrames);
  const sessionDate = dateFromFrame(firstLight) ?? settings.date;
  const windowStart = timeFromFrame(firstLight) ?? "00:00";
  const windowEnd = timeFromFrame(lastLight) ?? windowStart;
  const imagingMode = imagingModeFromFilters(filterNames, matchedTarget);
  const confidence = matchedTarget ? "Matched target" : objectName ? "Header target" : "Folder import";

  const payload: SessionArchivePayload = {
    targetId,
    targetName,
    sessionDate,
    status: "captured",
    profileId: selectedProfile?.id ?? null,
    profileName: selectedProfile?.name ?? null,
    siteName: selectedProfile?.siteName ?? settings.timezone,
    bortle: settings.bortle,
    fovHorizontalDeg: fov.horizontalDeg,
    fovVerticalDeg: fov.verticalDeg,
    pixelScaleArcsec: fov.pixelScaleArcsec,
    imagingMode,
    filterNames: filterNames.length ? filterNames : ["Unknown"],
    totalIntegrationMinutes,
    plannedFrames: capturedFrames,
    capturedFrames,
    windowStart,
    windowEnd,
    weatherStatus: "unknown",
    weatherScore: 0,
    moonIlluminationPercent: 0,
    whiteNight: false,
    notes: createFitsArchiveNotes(scan, lightFrames, selectedProfile, confidence, language),
    captureMarkdown: createFitsArchiveMarkdown({
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
    })
  };

  return {
    payload,
    confidence,
    targetLabel: targetName,
    summary: `${sessionDate} / ${totalIntegrationMinutes} min / ${payload.filterNames.join("+")}${
      qualitySummary ? ` / Q${qualitySummary.averageScore}` : ""
    }`
  };
}

function findTargetMatch(targets: Target[], objectName?: string) {
  if (!objectName) return null;
  const objectAliases = createTextAliases(objectName);
  return (
    targets.find((target) => {
      const aliases = [target.id, target.name, target.catalogId].flatMap(createTextAliases);
      return aliases.some((alias) =>
        objectAliases.some(
          (objectAlias) =>
            alias === objectAlias || objectAlias.includes(alias) || alias.includes(objectAlias)
        )
      );
    }) ?? null
  );
}

function createTextAliases(value: string) {
  const normalized = normalizeText(value);
  const withoutObjectKind = normalizeText(
    value.replace(/\b(nebula|galaxy|cluster|region|remnant|complex)\b/gi, "")
  );
  return Array.from(new Set([normalized, withoutObjectKind].filter(Boolean)));
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeTargetId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "fits-import";
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))
  );
}

function mostCommon(values: string[]) {
  if (!values.length) return undefined;
  const counts = values.reduce((accumulator, value) => {
    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

function earliestFrame(frames: FitsFrameMetadata[]) {
  return [...frames].sort((left, right) => frameTime(left) - frameTime(right))[0];
}

function latestFrame(frames: FitsFrameMetadata[]) {
  return [...frames].sort((left, right) => frameTime(right) - frameTime(left))[0];
}

function frameTime(frame: FitsFrameMetadata) {
  const parsed = frame.dateObs ? Date.parse(frame.dateObs) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateFromFrame(frame?: FitsFrameMetadata) {
  const match = frame?.dateObs?.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1];
}

function timeFromFrame(frame?: FitsFrameMetadata) {
  const match = frame?.dateObs?.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : undefined;
}

function imagingModeFromFilters(filters: string[], target: Target | null) {
  const normalizedFilters = filters.map((filterName) => filterName.toLowerCase());
  const targetType = target?.type.toLowerCase() ?? "";
  const hasNarrowband = normalizedFilters.some((filterName) =>
    ["ha", "h-alpha", "oiii", "o-iii", "sii", "s-ii", "h-beta", "hbeta"].includes(filterName)
  );
  if (hasNarrowband || targetType.includes("nebula") || targetType.includes("remnant")) return "Narrowband";
  if (["l", "r", "g", "b"].every((filterName) => normalizedFilters.includes(filterName))) return "LRGB";
  if (["r", "g", "b"].every((filterName) => normalizedFilters.includes(filterName))) return "RGB";
  if (normalizedFilters.includes("l") || normalizedFilters.includes("luminance")) return "Luminance";
  return "Captured lights";
}

function createFitsArchiveNotes(
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

function createFitsArchiveMarkdown({
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
