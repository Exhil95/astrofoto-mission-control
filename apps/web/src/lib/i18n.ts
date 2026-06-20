export const supportedLanguages = ["en", "pl", "de", "it", "es"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageOptions: Array<{ code: SupportedLanguage; label: string; shortLabel: string }> = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "pl", label: "Polski", shortLabel: "PL" },
  { code: "de", label: "Deutsch", shortLabel: "DE" },
  { code: "it", label: "Italiano", shortLabel: "IT" },
  { code: "es", label: "Español", shortLabel: "ES" }
];

export const languageStorageKey = "astrofoto-language";

export const languageLocale: Record<SupportedLanguage, string> = {
  en: "en",
  pl: "pl-PL",
  de: "de-DE",
  it: "it-IT",
  es: "es-ES"
};

export const translations = {
  en: {
    common: {
      all: "All",
      waiting: "waiting"
    },
    shell: {
      brandKicker: "Astrofoto",
      brandName: "Mission Control",
      workspaceAria: "Workspace modes",
      statusAria: "Session status",
      language: "Language",
      sync: "Sync",
      live: "Live",
      workspaces: {
        planner: "Planner",
        capture: "Capture",
        process: "Process",
        frames: "Frames",
        multi: "Multi"
      },
      workspaceTitles: {
        planner: "Planner",
        capture: "Capture",
        process: "Process",
        frames: "Frames",
        multi: "Multi-session"
      }
    },
    sky: {
      plannerWorkspace: "Planner workspace",
      targetsAndProfiles: "Targets and profiles",
      targetSelector: "Target selector",
      equipmentProfiles: "Equipment profiles",
      interactiveMap: "Interactive sky map",
      skyEngine: "Sky engine",
      initializingWebGL: "Initializing WebGL",
      displayControls: "Sky display controls",
      focus: "Focus",
      tonight: "Tonight",
      show: "Show",
      filter: "Filter",
      focusTitle: "Show selected target only",
      tonightTitle: "Show selected target and Tonight Board objects",
      showTitle: "Rotate through a filtered target showcase",
      filterTitle: "Show filtered catalog targets",
      type: "Type",
      season: "Season",
      fov: "FOV",
      objectScale: "Object scale",
      auto: "Auto",
      still: "Still",
      enableAutoRotate: "Enable sky auto-rotate",
      disableAutoRotate: "Disable sky auto-rotate",
      fitOptions: {
        Small: "Small",
        Fits: "Fits",
        Tight: "Tight",
        Mosaic: "Mosaic"
      }
    },
    frames: {
      expectedLights: "Expected Lights",
      archive: "Archive",
      recent: "Recent",
      empty: "Empty",
      noSessions: "No sessions",
      archiveWaiting: "Archive waiting",
      captureLogsWillAppear: "Capture logs will appear here"
    },
    multiSession: {
      aria: "Multi-session planner",
      ranking: "Ranking",
      title: "Multi-session Planner",
      planningRange: "Planning range",
      nights: "nights",
      nightsShort: "n",
      noTarget: "No target",
      nightSummaries: "Night summaries",
      bestSessions: "Best Sessions",
      savePlannedSession: "Save planned session",
      planSignals: "Plan signals",
      signals: "Signals",
      target: "Target",
      moon: "Moon",
      weather: "Weather",
      whiteNight: "White night",
      darknessCheck: "darkness check",
      peak: "peak",
      planReady: "Plan ready",
      downloadCalendar: "Download calendar",
      plan: "Plan",
      saving: "Saving",
      saved: "Saved",
      retry: "Retry"
    }
  },
  pl: {
    common: {
      all: "Wszystko",
      waiting: "czekam"
    },
    shell: {
      brandKicker: "Astrofoto",
      brandName: "Mission Control",
      workspaceAria: "Tryby pracy",
      statusAria: "Status sesji",
      language: "Język",
      sync: "Sync",
      live: "Live",
      workspaces: {
        planner: "Planner",
        capture: "Sesja",
        process: "Obróbka",
        frames: "Klatki",
        multi: "Multi"
      },
      workspaceTitles: {
        planner: "Planner",
        capture: "Sesja",
        process: "Obróbka",
        frames: "Klatki",
        multi: "Multi-session"
      }
    },
    sky: {
      plannerWorkspace: "Przestrzeń planowania",
      targetsAndProfiles: "Obiekty i profile",
      targetSelector: "Wybór obiektu",
      equipmentProfiles: "Profile sprzętu",
      interactiveMap: "Interaktywna mapa nieba",
      skyEngine: "Silnik nieba",
      initializingWebGL: "Uruchamiam WebGL",
      displayControls: "Sterowanie widokiem nieba",
      focus: "Fokus",
      tonight: "Dziś",
      show: "Show",
      filter: "Filtr",
      focusTitle: "Pokaż tylko wybrany obiekt",
      tonightTitle: "Pokaż wybrany obiekt i cele z Tonight Board",
      showTitle: "Przewijaj filtrowaną karuzelę obiektów",
      filterTitle: "Pokaż przefiltrowany katalog obiektów",
      type: "Typ",
      season: "Sezon",
      fov: "FOV",
      objectScale: "Skala obiektu",
      auto: "Auto",
      still: "Stop",
      enableAutoRotate: "Włącz autoobrót mapy nieba",
      disableAutoRotate: "Wyłącz autoobrót mapy nieba",
      fitOptions: {
        Small: "Mały",
        Fits: "Mieści się",
        Tight: "Ciasno",
        Mosaic: "Mozaika"
      }
    },
    frames: {
      expectedLights: "Planowane lighty",
      archive: "Archiwum",
      recent: "Ostatnie",
      empty: "Pusto",
      noSessions: "Brak sesji",
      archiveWaiting: "Archiwum czeka",
      captureLogsWillAppear: "Logi sesji pojawią się tutaj"
    },
    multiSession: {
      aria: "Planner wielu sesji",
      ranking: "Ranking",
      title: "Planner wielu sesji",
      planningRange: "Zakres planowania",
      nights: "nocy",
      nightsShort: "n",
      noTarget: "Brak obiektu",
      nightSummaries: "Podsumowania nocy",
      bestSessions: "Najlepsze sesje",
      savePlannedSession: "Zapisz planowaną sesję",
      planSignals: "Sygnały planu",
      signals: "Sygnały",
      target: "Obiekt",
      moon: "Księżyc",
      weather: "Pogoda",
      whiteNight: "Biała noc",
      darknessCheck: "kontrola ciemności",
      peak: "maks.",
      planReady: "Plan gotowy",
      downloadCalendar: "Pobierz kalendarz",
      plan: "Plan",
      saving: "Zapisuję",
      saved: "Zapisano",
      retry: "Ponów"
    }
  },
  de: {
    common: {
      all: "Alle",
      waiting: "warte"
    },
    shell: {
      brandKicker: "Astrofoto",
      brandName: "Mission Control",
      workspaceAria: "Arbeitsbereiche",
      statusAria: "Sitzungsstatus",
      language: "Sprache",
      sync: "Sync",
      live: "Live",
      workspaces: {
        planner: "Planer",
        capture: "Aufnahme",
        process: "Stacking",
        frames: "Frames",
        multi: "Multi"
      },
      workspaceTitles: {
        planner: "Planer",
        capture: "Aufnahme",
        process: "Bearbeitung",
        frames: "Frames",
        multi: "Multi-Session"
      }
    },
    sky: {
      plannerWorkspace: "Planungsbereich",
      targetsAndProfiles: "Ziele und Profile",
      targetSelector: "Zielauswahl",
      equipmentProfiles: "Ausrüstungsprofile",
      interactiveMap: "Interaktive Himmelskarte",
      skyEngine: "Himmels-Engine",
      initializingWebGL: "WebGL wird gestartet",
      displayControls: "Himmelsansicht steuern",
      focus: "Fokus",
      tonight: "Heute",
      show: "Show",
      filter: "Filter",
      focusTitle: "Nur das ausgewählte Ziel anzeigen",
      tonightTitle: "Ausgewähltes Ziel und Tonight-Board-Ziele anzeigen",
      showTitle: "Gefilterte Zielshow rotieren",
      filterTitle: "Gefilterten Zielkatalog anzeigen",
      type: "Typ",
      season: "Saison",
      fov: "FOV",
      objectScale: "Objektskala",
      auto: "Auto",
      still: "Stopp",
      enableAutoRotate: "Auto-Rotation der Himmelskarte aktivieren",
      disableAutoRotate: "Auto-Rotation der Himmelskarte deaktivieren",
      fitOptions: {
        Small: "Klein",
        Fits: "Passt",
        Tight: "Knapp",
        Mosaic: "Mosaik"
      }
    },
    frames: {
      expectedLights: "Erwartete Lights",
      archive: "Archiv",
      recent: "Aktuell",
      empty: "Leer",
      noSessions: "Keine Sitzungen",
      archiveWaiting: "Archiv wartet",
      captureLogsWillAppear: "Aufnahmelogs erscheinen hier"
    },
    multiSession: {
      aria: "Multi-Session-Planer",
      ranking: "Ranking",
      title: "Multi-Session-Planer",
      planningRange: "Planungszeitraum",
      nights: "Nächte",
      nightsShort: "n",
      noTarget: "Kein Ziel",
      nightSummaries: "Nächteübersicht",
      bestSessions: "Beste Sessions",
      savePlannedSession: "Geplante Session speichern",
      planSignals: "Plansignale",
      signals: "Signale",
      target: "Ziel",
      moon: "Mond",
      weather: "Wetter",
      whiteNight: "Weiße Nacht",
      darknessCheck: "Dunkelheitscheck",
      peak: "Peak",
      planReady: "Plan bereit",
      downloadCalendar: "Kalender herunterladen",
      plan: "Plan",
      saving: "Speichere",
      saved: "Gespeichert",
      retry: "Erneut"
    }
  },
  it: {
    common: {
      all: "Tutto",
      waiting: "in attesa"
    },
    shell: {
      brandKicker: "Astrofoto",
      brandName: "Mission Control",
      workspaceAria: "Aree di lavoro",
      statusAria: "Stato sessione",
      language: "Lingua",
      sync: "Sync",
      live: "Live",
      workspaces: {
        planner: "Planner",
        capture: "Cattura",
        process: "Processa",
        frames: "Frame",
        multi: "Multi"
      },
      workspaceTitles: {
        planner: "Planner",
        capture: "Cattura",
        process: "Processo",
        frames: "Frame",
        multi: "Multi-sessione"
      }
    },
    sky: {
      plannerWorkspace: "Area planner",
      targetsAndProfiles: "Oggetti e profili",
      targetSelector: "Selettore oggetto",
      equipmentProfiles: "Profili attrezzatura",
      interactiveMap: "Mappa del cielo interattiva",
      skyEngine: "Motore del cielo",
      initializingWebGL: "Avvio WebGL",
      displayControls: "Controlli vista cielo",
      focus: "Focus",
      tonight: "Stasera",
      show: "Show",
      filter: "Filtro",
      focusTitle: "Mostra solo l'oggetto selezionato",
      tonightTitle: "Mostra oggetto selezionato e oggetti del Tonight Board",
      showTitle: "Ruota una vetrina filtrata di oggetti",
      filterTitle: "Mostra il catalogo oggetti filtrato",
      type: "Tipo",
      season: "Stagione",
      fov: "FOV",
      objectScale: "Scala oggetto",
      auto: "Auto",
      still: "Stop",
      enableAutoRotate: "Attiva auto-rotazione della mappa",
      disableAutoRotate: "Disattiva auto-rotazione della mappa",
      fitOptions: {
        Small: "Piccolo",
        Fits: "Entra",
        Tight: "Stretto",
        Mosaic: "Mosaico"
      }
    },
    frames: {
      expectedLights: "Light previsti",
      archive: "Archivio",
      recent: "Recenti",
      empty: "Vuoto",
      noSessions: "Nessuna sessione",
      archiveWaiting: "Archivio in attesa",
      captureLogsWillAppear: "I log di cattura appariranno qui"
    },
    multiSession: {
      aria: "Planner multi-sessione",
      ranking: "Classifica",
      title: "Planner multi-sessione",
      planningRange: "Intervallo di pianificazione",
      nights: "notti",
      nightsShort: "n",
      noTarget: "Nessun oggetto",
      nightSummaries: "Riepilogo notti",
      bestSessions: "Migliori sessioni",
      savePlannedSession: "Salva sessione pianificata",
      planSignals: "Segnali del piano",
      signals: "Segnali",
      target: "Oggetto",
      moon: "Luna",
      weather: "Meteo",
      whiteNight: "Notte bianca",
      darknessCheck: "controllo buio",
      peak: "picco",
      planReady: "Piano pronto",
      downloadCalendar: "Scarica calendario",
      plan: "Piano",
      saving: "Salvo",
      saved: "Salvato",
      retry: "Riprova"
    }
  },
  es: {
    common: {
      all: "Todo",
      waiting: "esperando"
    },
    shell: {
      brandKicker: "Astrofoto",
      brandName: "Mission Control",
      workspaceAria: "Espacios de trabajo",
      statusAria: "Estado de sesión",
      language: "Idioma",
      sync: "Sync",
      live: "Live",
      workspaces: {
        planner: "Planner",
        capture: "Captura",
        process: "Proceso",
        frames: "Frames",
        multi: "Multi"
      },
      workspaceTitles: {
        planner: "Planner",
        capture: "Captura",
        process: "Procesado",
        frames: "Frames",
        multi: "Multisesión"
      }
    },
    sky: {
      plannerWorkspace: "Área de planificación",
      targetsAndProfiles: "Objetos y perfiles",
      targetSelector: "Selector de objeto",
      equipmentProfiles: "Perfiles de equipo",
      interactiveMap: "Mapa celeste interactivo",
      skyEngine: "Motor del cielo",
      initializingWebGL: "Iniciando WebGL",
      displayControls: "Controles del mapa celeste",
      focus: "Foco",
      tonight: "Hoy",
      show: "Show",
      filter: "Filtro",
      focusTitle: "Mostrar solo el objeto seleccionado",
      tonightTitle: "Mostrar objeto seleccionado y objetos del Tonight Board",
      showTitle: "Rotar una vitrina filtrada de objetos",
      filterTitle: "Mostrar catálogo de objetos filtrado",
      type: "Tipo",
      season: "Temporada",
      fov: "FOV",
      objectScale: "Escala del objeto",
      auto: "Auto",
      still: "Stop",
      enableAutoRotate: "Activar auto-rotación del mapa",
      disableAutoRotate: "Desactivar auto-rotación del mapa",
      fitOptions: {
        Small: "Pequeño",
        Fits: "Encaja",
        Tight: "Justo",
        Mosaic: "Mosaico"
      }
    },
    frames: {
      expectedLights: "Lights previstos",
      archive: "Archivo",
      recent: "Reciente",
      empty: "Vacío",
      noSessions: "Sin sesiones",
      archiveWaiting: "Archivo en espera",
      captureLogsWillAppear: "Los logs de captura aparecerán aquí"
    },
    multiSession: {
      aria: "Planner multisesión",
      ranking: "Ranking",
      title: "Planner multisesión",
      planningRange: "Rango de planificación",
      nights: "noches",
      nightsShort: "n",
      noTarget: "Sin objeto",
      nightSummaries: "Resumen de noches",
      bestSessions: "Mejores sesiones",
      savePlannedSession: "Guardar sesión planificada",
      planSignals: "Señales del plan",
      signals: "Señales",
      target: "Objeto",
      moon: "Luna",
      weather: "Tiempo",
      whiteNight: "Noche blanca",
      darknessCheck: "control de oscuridad",
      peak: "pico",
      planReady: "Plan listo",
      downloadCalendar: "Descargar calendario",
      plan: "Plan",
      saving: "Guardando",
      saved: "Guardado",
      retry: "Reintentar"
    }
  }
} as const;

export type AppTranslations = (typeof translations)[SupportedLanguage];

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && supportedLanguages.includes(value as SupportedLanguage);
}

export function loadInitialLanguage() {
  const storedLanguage = window.localStorage.getItem(languageStorageKey);
  if (isSupportedLanguage(storedLanguage)) return storedLanguage;

  const browserLanguage = window.navigator.language.slice(0, 2).toLowerCase();
  return isSupportedLanguage(browserLanguage) ? browserLanguage : "en";
}
