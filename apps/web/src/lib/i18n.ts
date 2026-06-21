import { deDictionary } from "./i18n/de";
import { enDictionary } from "./i18n/en";
import { esDictionary } from "./i18n/es";
import { itDictionary } from "./i18n/it";
import { plDictionary } from "./i18n/pl";

export const supportedLanguages = ["en", "pl", "de", "it", "es"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageOptions: Array<{ code: SupportedLanguage; label: string; shortLabel: string }> = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "pl", label: "Polski", shortLabel: "PL" },
  { code: "de", label: "Deutsch", shortLabel: "DE" },
  { code: "it", label: "Italiano", shortLabel: "IT" },
  { code: "es", label: "Espa\u00f1ol", shortLabel: "ES" }
];

export const languageStorageKey = "astrofoto-language";

export const languageLocale: Record<SupportedLanguage, string> = {
  en: "en",
  pl: "pl-PL",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};

const dictionaries = {
  en: enDictionary,
  pl: plDictionary,
  de: deDictionary,
  it: itDictionary,
  es: esDictionary
} as const;

export const translations = {
  en: enDictionary.translations,
  pl: plDictionary.translations,
  de: deDictionary.translations,
  it: itDictionary.translations,
  es: esDictionary.translations
} as const;

export type AppTranslations = (typeof translations)[SupportedLanguage];

type LabelSection = Exclude<keyof (typeof dictionaries)[SupportedLanguage], "translations">;

export function translateTargetType(language: SupportedLanguage, value: string) {
  return lookupDictionaryLabel("targetTypes", language, value);
}

export function translateSeason(language: SupportedLanguage, value: string) {
  return lookupDictionaryLabel("seasons", language, value);
}

export function translateDifficulty(language: SupportedLanguage, value: string) {
  return lookupDictionaryLabel("difficulties", language, value);
}

export function translateTargetFraming(language: SupportedLanguage, value: string) {
  return lookupDictionaryLabel("framings", language, value);
}

export function translateArchiveStatus(language: SupportedLanguage, value: string) {
  return lookupDictionaryLabel("archiveStatuses", language, value);
}

export function translateWeatherStatus(language: SupportedLanguage, value: string) {
  return lookupDictionaryLabel("weatherStatuses", language, value);
}

export function translateFovFit(language: SupportedLanguage, value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("large mosaic")) return translations[language].targetRail.fitLabels.mosaic;
  if (normalized.includes("mosaic")) return translations[language].targetRail.fitLabels.mosaic;
  if (normalized.includes("tight")) return translations[language].targetRail.fitLabels.tight;
  if (normalized.includes("small")) return translations[language].targetRail.fitLabels.small;
  if (normalized.includes("fits")) return translations[language].targetRail.fitLabels.fits;
  return value;
}

export function translateExposureHint(language: SupportedLanguage, value: string) {
  if (language === "en") return value;
  const replacements: Record<SupportedLanguage, Array<[RegExp, string]>> = {
    en: [],
    pl: [
      [/Dark sky/g, "Ciemne niebo"],
      [/Deep/g, "Głęboka"],
      [/Long focal/g, "Długa ogniskowa"],
      [/Long/g, "Długie"],
      [/Short/g, "Krótkie"],
      [/careful stretch/g, "ostrożny stretch"],
      [/with/g, "z"],
      [/blue reflection/g, "niebieską refleksją"],
      [/cluster field/g, "polem gromady"],
      [/core detail/g, "detalem centrum"],
      [/dust lane/g, "pasmem pyłu"],
      [/dust lanes/g, "pasmami pyłu"],
      [/stars/g, "gwiazdami"],
      [/reflection/g, "refleksją"],
      [/Protect highlights/g, "Chroń światła"],
      [/subs/g, "suby"],
      [/detail/g, "detal"],
      [/shell/g, "powłoka"],
      [/helmet shell/g, "powłoka hełmu"],
      [/rich/g, "bogate"],
      [/blend/g, "mieszanka"],
      [/pillars/g, "filary"],
      [/mosaic/g, "mozaika"],
      [/group/g, "grupa"],
      [/Southern horizon/g, "Południowy horyzont"],
      [/Wide/g, "Szerokie"],
      [/narrowband/g, "narrowband"]
    ],
    de: [
      [/Dark sky/g, "Dunkler Himmel"],
      [/Deep/g, "Tiefe"],
      [/Long focal/g, "Lange Brennweite"],
      [/Long/g, "Lange"],
      [/Short/g, "Kurze"],
      [/careful stretch/g, "vorsichtiger Stretch"],
      [/with/g, "mit"],
      [/blue reflection/g, "blauer Reflexion"],
      [/cluster field/g, "Haufenfeld"],
      [/core detail/g, "Kerndetail"],
      [/dust lane/g, "Staubband"],
      [/dust lanes/g, "Staubbändern"],
      [/stars/g, "Sternen"],
      [/reflection/g, "Reflexion"],
      [/Protect highlights/g, "Highlights schützen"],
      [/subs/g, "Subs"],
      [/detail/g, "Detail"],
      [/shell/g, "Schale"],
      [/helmet shell/g, "Helmschale"],
      [/rich/g, "reich"],
      [/blend/g, "Mischung"],
      [/pillars/g, "Säulen"],
      [/mosaic/g, "Mosaik"],
      [/group/g, "Gruppe"],
      [/Southern horizon/g, "Südhorizont"],
      [/Wide/g, "Weite"],
      [/narrowband/g, "Schmalband"]
    ],
    it: [
      [/Dark sky/g, "Cielo scuro"],
      [/Deep/g, "Profonda"],
      [/Long focal/g, "Lunga focale"],
      [/Long/g, "Lunga"],
      [/Short/g, "Brevi"],
      [/careful stretch/g, "stretch delicato"],
      [/with/g, "con"],
      [/blue reflection/g, "riflessione blu"],
      [/cluster field/g, "campo ammasso"],
      [/core detail/g, "dettaglio nucleo"],
      [/dust lane/g, "banda di polvere"],
      [/dust lanes/g, "bande di polvere"],
      [/stars/g, "stelle"],
      [/reflection/g, "riflessione"],
      [/Protect highlights/g, "Proteggi alte luci"],
      [/subs/g, "sub"],
      [/detail/g, "dettaglio"],
      [/shell/g, "guscio"],
      [/helmet shell/g, "guscio elmo"],
      [/rich/g, "ricco"],
      [/blend/g, "blend"],
      [/pillars/g, "pilastri"],
      [/mosaic/g, "mosaico"],
      [/group/g, "gruppo"],
      [/Southern horizon/g, "Orizzonte sud"],
      [/Wide/g, "Ampia"],
      [/narrowband/g, "narrowband"]
    ],
    es: [
      [/Dark sky/g, "Cielo oscuro"],
      [/Deep/g, "Profunda"],
      [/Long focal/g, "Focal larga"],
      [/Long/g, "Larga"],
      [/Short/g, "Cortas"],
      [/careful stretch/g, "stretch cuidadoso"],
      [/with/g, "con"],
      [/blue reflection/g, "reflexión azul"],
      [/cluster field/g, "campo de cúmulo"],
      [/core detail/g, "detalle del núcleo"],
      [/dust lane/g, "banda de polvo"],
      [/dust lanes/g, "bandas de polvo"],
      [/stars/g, "estrellas"],
      [/reflection/g, "reflexión"],
      [/Protect highlights/g, "Proteger altas luces"],
      [/subs/g, "subs"],
      [/detail/g, "detalle"],
      [/shell/g, "cáscara"],
      [/helmet shell/g, "casco"],
      [/rich/g, "rico"],
      [/blend/g, "mezcla"],
      [/pillars/g, "pilares"],
      [/mosaic/g, "mosaico"],
      [/group/g, "grupo"],
      [/Southern horizon/g, "Horizonte sur"],
      [/Wide/g, "Amplia"],
      [/narrowband/g, "narrowband"]
    ]
  };

  return replacements[language].reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    value
  );
}

export function translateKnownText(language: SupportedLanguage, value: string) {
  const exact = lookupDictionaryLabel("knownText", language, value);
  if (exact !== value) return exact;
  const extraExact = lookupDictionaryLabel("extraKnownText", language, value);
  if (extraExact !== value) return extraExact;
  if (language === "en") return value;

  let translated = value;
  const phrase = (key: string) => lookupDictionaryLabel("extraKnownText", language, key);
  translated = translated.replace(/\b(Fits|Tight|Small|Mosaic|Large mosaic)\b/g, (match) =>
    translateFovFit(language, match)
  );
  translated = translated.replace(/\bWhite night\b/g, lookupDictionaryLabel("knownText", language, "White night"));
  translated = translated.replace(/\bDarkness available\b/g, lookupDictionaryLabel("knownText", language, "Darkness available"));
  translated = translated.replace(/\bWeather skip\b/g, weatherSkipLabel(language));
  translated = translated.replace(/\bWeather risk\b/g, weatherRiskLabel(language));
  translated = translated.replace(/\boffline multi-night estimate\b/g, offlineMultiNightEstimateLabel(language));
  translated = translated.replace(/\boffline estimate\b/g, offlineEstimateLabel(language));
  translated = translated.replace(/\bMissing reusable flats for\b/g, phrase("Missing reusable flats for"));
  translated = translated.replace(/\bMissing reusable darks for\b/g, phrase("Missing reusable darks for"));
  translated = translated.replace(/\bMissing flats for filters\b/g, phrase("Missing flats for filters"));
  translated = translated.replace(/\bMixed exposures in\b/g, phrase("Mixed exposures in"));
  translated = translated.replace(/\blight frames flagged for quality\b/g, phrase("light frames flagged for quality"));
  translated = translated.replace(/\bcalibration frames\b/g, phrase("calibration frames"));
  translated = translated.replace(/\bstrong matches\b/g, phrase("strong matches"));
  translated = translated.replace(/\busable groups\b/g, phrase("usable groups"));
  translated = translated.replace(/\breusable bias\b/g, phrase("reusable bias"));
  translated = translated.replace(/\btemperature unknown\b/g, phrase("temperature unknown"));
  translated = translated.replace(/\bbinning unknown\b/g, phrase("binning unknown"));
  translated = translated.replace(/\bcamera match\b/g, phrase("camera match"));
  translated = translated.replace(/\bcamera unknown\b/g, phrase("camera unknown"));
  translated = translated.replace(/\bno filter target\b/g, phrase("no filter target"));
  translated = translated.replace(/\bfilter unknown\b/g, phrase("filter unknown"));
  translated = translated.replace(/\bno exposure target\b/g, phrase("no exposure target"));
  translated = translated.replace(/\bfilter mismatch\b/g, phrase("filter mismatch"));
  translated = translated.replace(/\bcamera mismatch\b/g, phrase("camera mismatch"));
  translated = translated.replace(/\bbinning mismatch\b/g, phrase("binning mismatch"));
  translated = translated.replace(/\bclose to\b/g, phrase("close to"));
  translated = translated.replace(/\btemp gap\b/g, phrase("temp gap"));
  translated = translated.replace(/\bframes\b/g, phrase("frames"));
  translated = translated.replace(/\bfilter\b/g, phrase("filter"));
  translated = translated.replace(/\bexact\b/g, phrase("exact"));
  translated = translated.replace(/\bclose\b/g, phrase("close"));
  translated = translated.replace(/\bvs\b/g, phrase("vs"));
  translated = translated.replace(/\bframe\b/g, frameLabel(language));
  translated = translated.replace(/\bstart with short block\b/g, shortBlockLabel(language));
  translated = translated.replace(/\bkeep as backup or calibration night\b/g, backupCalibrationLabel(language));
  translated = translated.replace(/\bcalibration only\b/g, calibrationOnlyLabel(language));
  return translated;
}

export function translateKnownTexts(language: SupportedLanguage, values: string[]) {
  return values.map((value) => translateKnownText(language, value));
}

function lookupDictionaryLabel(section: LabelSection, language: SupportedLanguage, value: string) {
  const labels = dictionaries[language][section] as Record<string, string>;
  return labels[value] ?? value;
}

function weatherSkipLabel(language: SupportedLanguage) {
  return {
    en: "Weather skip",
    pl: "Pogoda do odpuszczenia",
    de: "Wetter: auslassen",
    it: "Meteo da saltare",
    es: "Tiempo para saltar"
  }[language];
}

function weatherRiskLabel(language: SupportedLanguage) {
  return {
    en: "Weather risk",
    pl: "Ryzyko pogody",
    de: "Wetterrisiko",
    it: "Rischio meteo",
    es: "Riesgo meteorológico"
  }[language];
}

function offlineEstimateLabel(language: SupportedLanguage) {
  return {
    en: "offline estimate",
    pl: "szacunek offline",
    de: "Offline-Schätzung",
    it: "stima offline",
    es: "estimación offline"
  }[language];
}

function offlineMultiNightEstimateLabel(language: SupportedLanguage) {
  return {
    en: "offline multi-night estimate",
    pl: "wielonocny szacunek offline",
    de: "Offline-Mehrnacht-Schätzung",
    it: "stima multi-notte offline",
    es: "estimación multinoche offline"
  }[language];
}

function frameLabel(language: SupportedLanguage) {
  return {
    en: "frame",
    pl: "kadr",
    de: "Bildfeld",
    it: "inquadratura",
    es: "encuadre"
  }[language];
}

function shortBlockLabel(language: SupportedLanguage) {
  return {
    en: "start with short block",
    pl: "zacznij od krótkiego bloku",
    de: "mit kurzem Block starten",
    it: "inizia con un blocco breve",
    es: "empieza con un bloque corto"
  }[language];
}

function backupCalibrationLabel(language: SupportedLanguage) {
  return {
    en: "keep as backup or calibration night",
    pl: "zostaw jako backup albo noc kalibracji",
    de: "als Backup oder Kalibriernacht behalten",
    it: "tieni come backup o notte di calibrazione",
    es: "dejar como respaldo o noche de calibración"
  }[language];
}

function calibrationOnlyLabel(language: SupportedLanguage) {
  return {
    en: "calibration only",
    pl: "tylko kalibracja",
    de: "nur Kalibrierung",
    it: "solo calibrazione",
    es: "solo calibración"
  }[language];
}

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && supportedLanguages.includes(value as SupportedLanguage);
}

export function loadInitialLanguage() {
  const storedLanguage = window.localStorage.getItem(languageStorageKey);
  if (isSupportedLanguage(storedLanguage)) return storedLanguage;

  const browserLanguage = window.navigator.language.slice(0, 2).toLowerCase();
  return isSupportedLanguage(browserLanguage) ? browserLanguage : "en";
}
