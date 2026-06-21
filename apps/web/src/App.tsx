import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Aperture,
  CalendarRange,
  FileSearch,
  GalleryHorizontal,
  Gauge,
  Languages,
  LocateFixed,
  LogOut,
  Moon,
  Radio,
  RotateCw,
  SlidersHorizontal,
  Telescope,
  UserCircle,
  type LucideIcon
} from "lucide-react";
import { AuthLanding } from "./components/AuthLanding";
import { TargetRail } from "./components/TargetRail";
import { FovConsole } from "./components/FovConsole";
import { ProfileDock } from "./components/ProfileDock";
import { CapturePlan } from "./components/CapturePlan";
import { CalibrationLibraryPanel } from "./components/CalibrationLibraryPanel";
import { FitsIngestPanel } from "./components/FitsIngestPanel";
import { MultiSessionPlanner } from "./components/MultiSessionPlanner";
import { ProcessingPlanner } from "./components/ProcessingPlanner";
import { SessionControl } from "./components/SessionControl";
import { SessionTimeline } from "./components/SessionTimeline";
import { SkyConditions } from "./components/SkyConditions";
import { TonightBoard } from "./components/TonightBoard";
import { createMultiSessionCalendar } from "./lib/exports/calendar";
import { downloadTextFile } from "./lib/exports/download";
import {
  createCaptureMarkdown,
  createMultiSessionMarkdown,
  createMultiSessionNotes,
  createSessionArchiveNotes
} from "./lib/exports/markdown";
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  type AuthSession
} from "./lib/auth";
import {
  createFallbackSkyForecast,
  fetchSkyForecast,
  type ForecastRefreshMinutes,
  type SkyForecast
} from "./lib/forecast";
import { calculateFov, type FovResult } from "./lib/fov";
import {
  languageOptions,
  languageStorageKey,
  loadInitialLanguage,
  translateArchiveStatus,
  translateSeason,
  translateTargetType,
  translations,
  type SupportedLanguage
} from "./lib/i18n";
import {
  createFallbackProfiles,
  createProfile,
  deleteProfile as deleteStoredProfile,
  fetchProfiles,
  profileToPayload,
  profileToSessionSettings,
  updateProfile as updateStoredProfile,
  type EquipmentProfile,
  type ProfilePayload
} from "./lib/profiles";
import { sensorPresets } from "./lib/sensors";
import {
  curateSkyTargets,
  filterSkyTargets,
  formatObjectFootprint,
  isSkyDisplayMode,
  type SkyDisplayMode,
  type SkyFitFilter
} from "./lib/sky";
import {
  createFallbackCapturePlan,
  createFallbackMultiSessionPlan,
  createFallbackProcessingPlan,
  createFallbackSessionPlan,
  createFallbackTonightBoard,
  fetchCapturePlan,
  fetchMultiSessionPlan,
  fetchProcessingPlan,
  fetchSessionArchive,
  fetchSessionPlan,
  fetchTonightBoard,
  getTodayIsoDate,
  saveSessionArchive,
  type CalibrationLibraryResult,
  type CapturePlan as CapturePlanModel,
  type MultiSessionPlan as MultiSessionPlanModel,
  type MultiSessionPlanItem,
  type ProcessingPlan as ProcessingPlanModel,
  type SessionArchiveEntry,
  type SessionArchivePayload,
  type SessionPlan,
  type TonightBoard as TonightBoardModel,
  type SessionSettings
} from "./lib/session";
import { fallbackTargets, fetchTargets, type Target } from "./lib/targets";

const SkyScene = lazy(() =>
  import("./components/SkyScene").then((module) => ({ default: module.SkyScene }))
);

type WorkspaceMode = "planner" | "capture" | "process" | "frames" | "multi";
type ArchiveState = "idle" | "saving" | "saved" | "failed";

const workspaceOrder: WorkspaceMode[] = ["planner", "capture", "process", "frames", "multi"];

const workspaceIcons: Record<WorkspaceMode, LucideIcon> = {
  planner: LocateFixed,
  capture: Aperture,
  process: Activity,
  frames: FileSearch,
  multi: CalendarRange
};

export function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => loadAuthSession());

  function enterApp(session: AuthSession) {
    saveAuthSession(session);
    setAuthSession(session);
  }

  function leaveApp() {
    clearAuthSession();
    setAuthSession(null);
  }

  if (!authSession) return <AuthLanding onComplete={enterApp} />;

  return <MissionControlApp authSession={authSession} onLogout={leaveApp} />;
}

function MissionControlApp({
  authSession,
  onLogout
}: {
  authSession: AuthSession;
  onLogout: () => void;
}) {
  const [selectedTargetId, setSelectedTargetId] = useState("ngc7000");
  const [focalLengthMm, setFocalLengthMm] = useState(480);
  const [sensorWidthMm, setSensorWidthMm] = useState(23.5);
  const [sensorHeightMm, setSensorHeightMm] = useState(15.7);
  const [pixelSizeUm, setPixelSizeUm] = useState(3.76);
  const [selectedSensorId, setSelectedSensorId] = useState("imx571");
  const [reducer, setReducer] = useState(1);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => {
    const storedMode = window.localStorage.getItem("astrofoto-workspace-mode");
    return isWorkspaceMode(storedMode) ? storedMode : "planner";
  });
  const [language, setLanguage] = useState<SupportedLanguage>(() => loadInitialLanguage());
  const [isPlanning, setIsPlanning] = useState(false);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [isBoardLoading, setIsBoardLoading] = useState(false);
  const [isCaptureLoading, setIsCaptureLoading] = useState(false);
  const [isProcessingLoading, setIsProcessingLoading] = useState(false);
  const [isMultiSessionLoading, setIsMultiSessionLoading] = useState(false);
  const [multiSessionNights, setMultiSessionNights] = useState(() => {
    const storedNights = Number(window.localStorage.getItem("astrofoto-multi-session-nights"));
    return [3, 7, 14].includes(storedNights) ? storedNights : 7;
  });
  const [weatherRefreshMinutes, setWeatherRefreshMinutes] =
    useState<ForecastRefreshMinutes>(() => {
      const storedMinutes = Number(window.localStorage.getItem("astrofoto-weather-refresh-minutes"));
      return isForecastRefreshMinutes(storedMinutes) ? storedMinutes : 15;
    });
  const [weatherRefreshTick, setWeatherRefreshTick] = useState(0);
  const forceWeatherRefreshRef = useRef(false);
  const [archiveState, setArchiveState] = useState<ArchiveState>("idle");
  const [multiArchiveState, setMultiArchiveState] = useState<ArchiveState>("idle");
  const [multiArchivedItemKey, setMultiArchivedItemKey] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [skyAutoRotate, setSkyAutoRotate] = useState(() => {
    return window.localStorage.getItem("astrofoto-sky-auto-rotate") !== "false";
  });
  const [skyDisplayMode, setSkyDisplayMode] = useState<SkyDisplayMode>(() => {
    const storedMode = window.localStorage.getItem("astrofoto-sky-display-mode");
    return isSkyDisplayMode(storedMode) ? storedMode : "tonight";
  });
  const [skyTypeFilter, setSkyTypeFilter] = useState("All");
  const [skySeasonFilter, setSkySeasonFilter] = useState("All");
  const [skyFitFilter, setSkyFitFilter] = useState<SkyFitFilter>("All");
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [profiles, setProfiles] = useState<EquipmentProfile[]>(() => createFallbackProfiles());
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(1);
  const [targetCatalog, setTargetCatalog] = useState(() => fallbackTargets);
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>({
    date: getTodayIsoDate(),
    latitudeDeg: 50.2649,
    longitudeDeg: 19.0238,
    timezone: "Europe/Warsaw",
    bortle: 5
  });

  const selectedTarget =
    targetCatalog.find((target) => target.id === selectedTargetId) ?? targetCatalog[0];
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const [sessionPlan, setSessionPlan] = useState(() =>
    createFallbackSessionPlan(selectedTarget, sessionSettings)
  );
  const [skyForecast, setSkyForecast] = useState<SkyForecast>(() =>
    createFallbackSkyForecast(sessionSettings)
  );
  const fov = useMemo(
    () => calculateFov({ focalLengthMm, sensorWidthMm, sensorHeightMm, pixelSizeUm, reducer }),
    [focalLengthMm, sensorWidthMm, sensorHeightMm, pixelSizeUm, reducer]
  );
  const [tonightBoard, setTonightBoard] = useState<TonightBoardModel>(() =>
    createFallbackTonightBoard(targetCatalog, sessionSettings, fov)
  );
  const [capturePlan, setCapturePlan] = useState<CapturePlanModel>(() =>
    createFallbackCapturePlan(selectedTarget, sessionSettings, fov)
  );
  const [processingPlan, setProcessingPlan] = useState<ProcessingPlanModel>(() =>
    createFallbackProcessingPlan(
      selectedTarget,
      sessionSettings,
      fov,
      sessionPlan,
      capturePlan
    )
  );
  const [multiSessionPlan, setMultiSessionPlan] = useState<MultiSessionPlanModel>(() =>
    createFallbackMultiSessionPlan(targetCatalog, sessionSettings, fov, multiSessionNights)
  );
  const [sessionArchives, setSessionArchives] = useState<SessionArchiveEntry[]>([]);
  const [calibrationLibrary, setCalibrationLibrary] = useState<CalibrationLibraryResult | null>(null);
  const text = translations[language];
  const skyTargetTypes = useMemo(
    () => uniqueValues(targetCatalog.map((target) => target.type)),
    [targetCatalog]
  );
  const skySeasons = useMemo(
    () => uniqueValues(targetCatalog.map((target) => target.season)),
    [targetCatalog]
  );
  const filteredSkyTargets = useMemo(
    () => filterSkyTargets(targetCatalog, fov, skyTypeFilter, skySeasonFilter, skyFitFilter),
    [targetCatalog, fov, skyTypeFilter, skySeasonFilter, skyFitFilter]
  );
  const visibleSkyTargets = useMemo(
    () =>
      curateSkyTargets({
        mode: skyDisplayMode,
        selectedTarget,
        allTargets: targetCatalog,
        filteredTargets: filteredSkyTargets,
        tonightTargetIds: tonightBoard.items.map((item) => item.targetId),
        showcaseIndex
      }),
    [
      skyDisplayMode,
      selectedTarget,
      targetCatalog,
      filteredSkyTargets,
      tonightBoard.items,
      showcaseIndex
    ]
  );
  const skySceneSummary = useMemo(
    () =>
      sceneSummary({
        mode: skyDisplayMode,
        visibleCount: visibleSkyTargets.length,
        filteredCount: filteredSkyTargets.length,
        totalCount: targetCatalog.length,
        language
      }),
    [skyDisplayMode, visibleSkyTargets.length, filteredSkyTargets.length, targetCatalog.length, language]
  );
  const framingAdvice = useMemo(() => analyzeFraming(selectedTarget, fov, language), [selectedTarget, fov, language]);

  const requestWeatherRefresh = () => {
    forceWeatherRefreshRef.current = true;
    setWeatherRefreshTick((current) => current + 1);
  };

  const selectMultiSessionItem = (item: MultiSessionPlanItem) => {
    setSelectedTargetId(item.targetId);
    setSessionSettings((currentSettings) => ({
      ...currentSettings,
      date: item.date
    }));
    setWorkspaceMode("capture");
  };

  const archiveMultiSessionItem = async (item: MultiSessionPlanItem) => {
    const target = targetCatalog.find((catalogItem) => catalogItem.id === item.targetId);
    if (!target) return;

    setMultiArchivedItemKey(multiSessionItemKey(item));
    setMultiArchiveState("saving");

    try {
      const savedArchive = await saveSessionArchive(
        createMultiSessionArchivePayload({
          item,
          target,
          selectedProfile,
          settings: sessionSettings,
          fov,
          language
        })
      );
      setSessionArchives((items) =>
        [savedArchive, ...items.filter((archive) => archive.id !== savedArchive.id)].slice(0, 5)
      );
      setMultiArchiveState("saved");
      window.setTimeout(() => {
        setMultiArchiveState("idle");
        setMultiArchivedItemKey(null);
      }, 1600);
    } catch {
      setMultiArchiveState("failed");
    }
  };

  const downloadMultiSessionCalendar = () => {
    const calendarItems = bestMultiSessionItemsByNight(multiSessionPlan);
    const content = createMultiSessionCalendar({
      items: calendarItems,
      selectedProfile,
      settings: sessionSettings,
      fov,
      language
    });
    downloadTextFile(
      `${multiSessionPlan.startDate}-${multiSessionPlan.endDate}-astro-plan.ics`,
      content,
      "text/calendar;charset=utf-8"
    );
  };

  const selectSensorPreset = (sensorId: string) => {
    setSelectedSensorId(sensorId);
    const sensor = sensorPresets.find((item) => item.id === sensorId);
    if (!sensor) return;
    setSensorWidthMm(sensor.sensorWidthMm);
    setSensorHeightMm(sensor.sensorHeightMm);
    setPixelSizeUm(sensor.pixelSizeUm);
  };

  const changeSensorWidth = (value: number) => {
    setSelectedSensorId("custom");
    setSensorWidthMm(value);
  };

  const changeSensorHeight = (value: number) => {
    setSelectedSensorId("custom");
    setSensorHeightMm(value);
  };

  const changePixelSize = (value: number) => {
    setSelectedSensorId("custom");
    setPixelSizeUm(value);
  };

  const applyProfile = (profile: EquipmentProfile) => {
    setSelectedProfileId(profile.id);
    setSessionSettings((currentSettings) =>
      profileToSessionSettings(profile, currentSettings.date)
    );
    setFocalLengthMm(profile.focalLengthMm);
    setReducer(profile.reducer);
    setSelectedSensorId(profile.sensorId);
    setSensorWidthMm(profile.sensorWidthMm);
    setSensorHeightMm(profile.sensorHeightMm);
    setPixelSizeUm(profile.pixelSizeUm);
  };

  const selectProfile = (profileId: number) => {
    const profile = profiles.find((item) => item.id === profileId);
    if (profile) applyProfile(profile);
  };

  const createPayloadFromCurrentSetup = (): ProfilePayload => {
    const sensor = sensorPresets.find((item) => item.id === selectedSensorId);
    return {
      name: `${sessionSettings.bortle <= 3 ? "Dark" : "Home"} ${focalLengthMm.toFixed(0)}mm`,
      siteName: sessionSettings.timezone.includes("Canary") ? "Tenerife" : "Custom site",
      latitudeDeg: sessionSettings.latitudeDeg,
      longitudeDeg: sessionSettings.longitudeDeg,
      timezone: sessionSettings.timezone,
      bortle: sessionSettings.bortle,
      telescopeName: selectedProfile?.telescopeName ?? `${focalLengthMm.toFixed(0)}mm imaging rig`,
      telescopeType: selectedProfile?.telescopeType ?? "Refractor",
      apertureMm: selectedProfile?.apertureMm ?? estimateAperture(focalLengthMm),
      focalLengthMm,
      reducerName: selectedProfile?.reducerName ?? (reducer === 1 ? "Native / flattener" : `${reducer.toFixed(2)}x reducer`),
      reducer,
      cameraName: selectedProfile?.cameraName ?? `${sensor?.name ?? "Custom sensor"} camera`,
      sensorId: selectedSensorId,
      sensorName: sensor?.name ?? "Custom sensor",
      sensorWidthMm,
      sensorHeightMm,
      pixelSizeUm,
      filterSet: selectedProfile?.filterSet ?? "LRGB + Ha/OIII/SII",
      filterWheel: selectedProfile?.filterWheel ?? "Filter drawer",
      guidingSetup: selectedProfile?.guidingSetup ?? "50mm guide scope",
      guideCameraName: selectedProfile?.guideCameraName ?? "ASI120MM class",
      focuserName: selectedProfile?.focuserName ?? "Manual focuser",
      mountName: selectedProfile?.mountName ?? "Equatorial mount"
    };
  };

  const saveCurrentProfile = async () => {
    const payload = createPayloadFromCurrentSetup();
    setIsProfileSaving(true);
    try {
      const profile = await createProfile(payload);
      setProfiles((items) => [...items, profile]);
      applyProfile(profile);
    } catch {
      const fallbackProfile: EquipmentProfile = {
        ...payload,
        id: Date.now(),
        updatedAt: new Date().toISOString()
      };
      setProfiles((items) => [...items, fallbackProfile]);
      applyProfile(fallbackProfile);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const updateExistingProfile = async (profileId: number, payload: ProfilePayload) => {
    setIsProfileSaving(true);
    try {
      const updatedProfile = await updateStoredProfile(profileId, payload);
      setProfiles((items) =>
        items.map((profile) => (profile.id === profileId ? updatedProfile : profile))
      );
      applyProfile(updatedProfile);
    } catch {
      const fallbackProfile: EquipmentProfile = {
        ...payload,
        id: profileId,
        updatedAt: new Date().toISOString()
      };
      setProfiles((items) =>
        items.map((profile) => (profile.id === profileId ? fallbackProfile : profile))
      );
      applyProfile(fallbackProfile);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const duplicateExistingProfile = async (profileId: number) => {
    const source = profiles.find((profile) => profile.id === profileId);
    if (!source) return;
    const payload: ProfilePayload = {
      ...profileToPayload(source),
      name: `${source.name} Copy`
    };

    setIsProfileSaving(true);
    try {
      const profile = await createProfile(payload);
      setProfiles((items) => [...items, profile]);
      applyProfile(profile);
    } catch {
      const fallbackProfile: EquipmentProfile = {
        ...payload,
        id: Date.now(),
        updatedAt: new Date().toISOString()
      };
      setProfiles((items) => [...items, fallbackProfile]);
      applyProfile(fallbackProfile);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const deleteExistingProfile = async (profileId: number) => {
    if (profiles.length <= 1) return;
    const remainingProfiles = profiles.filter((profile) => profile.id !== profileId);
    const nextProfile = remainingProfiles[0];

    setIsProfileSaving(true);
    try {
      await deleteStoredProfile(profileId);
    } catch {
      // Local fallback profiles can be removed even when no persisted row exists.
    } finally {
      setProfiles(remainingProfiles);
      if (selectedProfileId === profileId && nextProfile) applyProfile(nextProfile);
      setIsProfileSaving(false);
    }
  };

  const archiveCurrentSession = async () => {
    setArchiveState("saving");
    const payload = createArchivePayload({
      selectedTarget,
      selectedProfile,
      settings: sessionSettings,
      fov,
      sessionPlan,
      capturePlan,
      language
    });

    try {
      const savedArchive = await saveSessionArchive(payload);
      setSessionArchives((items) =>
        [savedArchive, ...items.filter((item) => item.id !== savedArchive.id)].slice(0, 5)
      );
      setArchiveState("saved");
      window.setTimeout(() => setArchiveState("idle"), 1600);
    } catch {
      setArchiveState("failed");
    }
  };

  const addSessionArchive = (archive: SessionArchiveEntry) => {
    setSessionArchives((items) =>
      [archive, ...items.filter((item) => item.id !== archive.id)].slice(0, 5)
    );
  };

  useEffect(() => {
    window.localStorage.setItem("astrofoto-workspace-mode", workspaceMode);
  }, [workspaceMode]);

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(
      "astrofoto-weather-refresh-minutes",
      String(weatherRefreshMinutes)
    );
  }, [weatherRefreshMinutes]);

  useEffect(() => {
    window.localStorage.setItem("astrofoto-multi-session-nights", String(multiSessionNights));
  }, [multiSessionNights]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      requestWeatherRefresh();
    }, weatherRefreshMinutes * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [weatherRefreshMinutes]);

  useEffect(() => {
    window.localStorage.setItem(
      "astrofoto-sky-auto-rotate",
      skyAutoRotate ? "true" : "false"
    );
  }, [skyAutoRotate]);

  useEffect(() => {
    window.localStorage.setItem("astrofoto-sky-display-mode", skyDisplayMode);
  }, [skyDisplayMode]);

  useEffect(() => {
    if (skyDisplayMode !== "showcase") return undefined;
    const timer = window.setInterval(() => {
      setShowcaseIndex((currentIndex) => currentIndex + 1);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [skyDisplayMode]);

  useEffect(() => {
    let ignore = false;

    fetchTargets()
      .then((loadedTargets) => {
        if (!ignore && loadedTargets.length) setTargetCatalog(loadedTargets);
      })
      .catch(() => {
        if (!ignore) setTargetCatalog(fallbackTargets);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchSessionArchive(5)
      .then((archives) => {
        if (!ignore) setSessionArchives(archives);
      })
      .catch(() => {
        if (!ignore) setSessionArchives([]);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    fetchProfiles()
      .then((loadedProfiles) => {
        if (ignore || !loadedProfiles.length) return;
        setProfiles(loadedProfiles);
        applyProfile(loadedProfiles[0]);
      })
      .catch(() => {
        if (!ignore) setProfiles(createFallbackProfiles());
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const forceRefresh = forceWeatherRefreshRef.current;
    setIsPlanning(true);
    setSessionPlan(createFallbackSessionPlan(selectedTarget, sessionSettings));

    fetchSessionPlan(selectedTarget.id, sessionSettings, {
      cacheTtlMinutes: weatherRefreshMinutes,
      forceRefresh
    })
      .then((plan) => {
        if (!ignore) setSessionPlan(plan);
      })
      .catch(() => {
        if (!ignore) setSessionPlan(createFallbackSessionPlan(selectedTarget, sessionSettings));
      })
      .finally(() => {
        if (!ignore) setIsPlanning(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedTarget, sessionSettings, weatherRefreshMinutes, weatherRefreshTick]);

  useEffect(() => {
    let ignore = false;
    const forceRefresh = forceWeatherRefreshRef.current;
    setIsForecastLoading(true);
    setSkyForecast(createFallbackSkyForecast(sessionSettings));

    fetchSkyForecast(sessionSettings, {
      cacheTtlMinutes: weatherRefreshMinutes,
      forceRefresh
    })
      .then((forecast) => {
        if (!ignore) setSkyForecast(forecast);
      })
      .catch(() => {
        if (!ignore) setSkyForecast(createFallbackSkyForecast(sessionSettings));
      })
      .finally(() => {
        if (forceRefresh) forceWeatherRefreshRef.current = false;
        if (!ignore) setIsForecastLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [sessionSettings, weatherRefreshMinutes, weatherRefreshTick]);

  useEffect(() => {
    let ignore = false;
    const forceRefresh = forceWeatherRefreshRef.current;
    setIsBoardLoading(true);
    setTonightBoard(createFallbackTonightBoard(targetCatalog, sessionSettings, fov));

    fetchTonightBoard(sessionSettings, fov, {
      cacheTtlMinutes: weatherRefreshMinutes,
      forceRefresh
    })
      .then((board) => {
        if (!ignore) setTonightBoard(board);
      })
      .catch(() => {
        if (!ignore) setTonightBoard(createFallbackTonightBoard(targetCatalog, sessionSettings, fov));
      })
      .finally(() => {
        if (!ignore) setIsBoardLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [sessionSettings, fov, targetCatalog, weatherRefreshMinutes, weatherRefreshTick]);

  useEffect(() => {
    let ignore = false;
    const forceRefresh = forceWeatherRefreshRef.current;
    setIsMultiSessionLoading(true);
    setMultiSessionPlan(
      createFallbackMultiSessionPlan(targetCatalog, sessionSettings, fov, multiSessionNights)
    );

    fetchMultiSessionPlan({
      settings: sessionSettings,
      fov,
      targetIds: targetCatalog.map((target) => target.id),
      nights: multiSessionNights,
      weatherOptions: {
        cacheTtlMinutes: weatherRefreshMinutes,
        forceRefresh
      }
    })
      .then((plan) => {
        if (!ignore) setMultiSessionPlan(plan);
      })
      .catch(() => {
        if (!ignore) {
          setMultiSessionPlan(
            createFallbackMultiSessionPlan(targetCatalog, sessionSettings, fov, multiSessionNights)
          );
        }
      })
      .finally(() => {
        if (!ignore) setIsMultiSessionLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [
    sessionSettings,
    fov,
    targetCatalog,
    multiSessionNights,
    weatherRefreshMinutes,
    weatherRefreshTick
  ]);

  useEffect(() => {
    let ignore = false;
    const forceRefresh = forceWeatherRefreshRef.current;
    setIsCaptureLoading(true);
    setCapturePlan(createFallbackCapturePlan(selectedTarget, sessionSettings, fov));

    fetchCapturePlan(selectedTarget.id, sessionSettings, fov, {
      cacheTtlMinutes: weatherRefreshMinutes,
      forceRefresh
    })
      .then((plan) => {
        if (!ignore) setCapturePlan(plan);
      })
      .catch(() => {
        if (!ignore) setCapturePlan(createFallbackCapturePlan(selectedTarget, sessionSettings, fov));
      })
      .finally(() => {
        if (!ignore) setIsCaptureLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedTarget, sessionSettings, fov, weatherRefreshMinutes, weatherRefreshTick]);

  useEffect(() => {
    let ignore = false;
    setIsProcessingLoading(true);
    setProcessingPlan(
      createFallbackProcessingPlan(selectedTarget, sessionSettings, fov, sessionPlan, capturePlan)
    );

    fetchProcessingPlan({
      targetId: selectedTarget.id,
      settings: sessionSettings,
      fov,
      sessionPlan,
      capturePlan
    })
      .then((plan) => {
        if (!ignore) setProcessingPlan(plan);
      })
      .catch(() => {
        if (!ignore) {
          setProcessingPlan(
            createFallbackProcessingPlan(
              selectedTarget,
              sessionSettings,
              fov,
              sessionPlan,
              capturePlan
            )
          );
        }
      })
      .finally(() => {
        if (!ignore) setIsProcessingLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedTarget, sessionSettings, fov, sessionPlan, capturePlan]);

  return (
    <main className={`app-shell workspace-${workspaceMode}`}>
      <header className="top-bar">
        <div className="brand">
          <Telescope size={22} aria-hidden="true" />
          <div>
            <span>{text.shell.brandKicker}</span>
            <strong>{text.shell.brandName}</strong>
          </div>
        </div>

        <nav className="mode-tabs" aria-label={text.shell.workspaceAria}>
          {workspaceOrder.map((mode) => {
            const Icon = workspaceIcons[mode];
            return (
              <button
                className={workspaceMode === mode ? "is-active" : ""}
                key={mode}
                type="button"
                title={text.shell.workspaceTitles[mode]}
                onClick={() => setWorkspaceMode(mode)}
              >
                <Icon size={17} aria-hidden="true" />
                {text.shell.workspaces[mode]}
              </button>
            );
          })}
        </nav>

        <div className="top-actions">
          <div className="signal-strip" aria-label={text.shell.statusAria}>
            <span>
              <Moon size={16} aria-hidden="true" />
              {sessionPlan.moonIlluminationPercent}%
            </span>
            <span>
              <Gauge size={16} aria-hidden="true" />
              {sessionPlan.conditionScore}/100
            </span>
            <span>
              <Radio size={16} aria-hidden="true" />
              {isPlanning ? text.shell.sync : text.shell.live}
            </span>
          </div>
          <label className="language-switcher" title={text.shell.language}>
            <Languages size={15} aria-hidden="true" />
            <span>{text.shell.language}</span>
            <select
              aria-label={text.shell.language}
              value={language}
              onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
            >
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.shortLabel}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label={`Log out ${authSession.displayName}`}
            className="account-pill"
            title={`Log out ${authSession.displayName}`}
            type="button"
            onClick={onLogout}
          >
            <UserCircle size={16} aria-hidden="true" />
            <span>{authSession.displayName}</span>
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      {workspaceMode === "planner" && (
        <section className="workspace-page planner-page" aria-label={text.sky.plannerWorkspace}>
          <aside className="left-stack" aria-label={text.sky.targetsAndProfiles}>
            <section className="panel left-panel" aria-label={text.sky.targetSelector}>
              <TargetRail
                targets={targetCatalog}
                selectedTarget={selectedTarget}
                fov={fov}
                language={language}
                onSelectTarget={setSelectedTargetId}
              />
            </section>

            <section className="panel profile-panel" aria-label={text.sky.equipmentProfiles}>
              <ProfileDock
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                busy={isProfileSaving}
                language={language}
                onSelectProfile={selectProfile}
                onSaveCurrent={saveCurrentProfile}
                onUpdateProfile={updateExistingProfile}
                onDuplicateProfile={duplicateExistingProfile}
                onDeleteProfile={deleteExistingProfile}
              />
            </section>
          </aside>

          <section className="sky-stage" aria-label={text.sky.interactiveMap}>
            <Suspense
              fallback={
                <div className="sky-loading">
                  <span>{text.sky.skyEngine}</span>
                  <strong>{text.sky.initializingWebGL}</strong>
                </div>
              }
            >
              <SkyScene
                targets={visibleSkyTargets}
                selectedTarget={selectedTarget}
                fov={fov}
                autoRotate={skyAutoRotate}
                layoutMode={skyDisplayMode === "showcase" || skyDisplayMode === "catalog" ? "showcase" : "sky"}
                onSelectTarget={setSelectedTargetId}
              />
            </Suspense>
            <div className="scene-controls" aria-label={text.sky.displayControls}>
              <div className="scene-mode-tabs">
                <button
                  className={skyDisplayMode === "focus" ? "is-active" : ""}
                  type="button"
                  title={text.sky.focusTitle}
                  onClick={() => setSkyDisplayMode("focus")}
                >
                  <LocateFixed size={14} aria-hidden="true" />
                  {text.sky.focus}
                </button>
                <button
                  className={skyDisplayMode === "tonight" ? "is-active" : ""}
                  type="button"
                  title={text.sky.tonightTitle}
                  onClick={() => setSkyDisplayMode("tonight")}
                >
                  <Moon size={14} aria-hidden="true" />
                  {text.sky.tonight}
                </button>
                <button
                  className={skyDisplayMode === "showcase" ? "is-active" : ""}
                  type="button"
                  title={text.sky.showTitle}
                  onClick={() => setSkyDisplayMode("showcase")}
                >
                  <GalleryHorizontal size={14} aria-hidden="true" />
                  {text.sky.show}
                </button>
                <button
                  className={skyDisplayMode === "catalog" ? "is-active" : ""}
                  type="button"
                  title={text.sky.filterTitle}
                  onClick={() => setSkyDisplayMode("catalog")}
                >
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  {text.sky.filter}
                </button>
              </div>

              {(skyDisplayMode === "showcase" || skyDisplayMode === "catalog") && (
                <div className="scene-filter-row">
                  <label>
                    <span>{text.sky.type}</span>
                    <select value={skyTypeFilter} onChange={(event) => setSkyTypeFilter(event.target.value)}>
                      <option value="All">{text.common.all}</option>
                      {skyTargetTypes.map((type) => (
                        <option key={type} value={type}>
                          {translateTargetType(language, type)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{text.sky.season}</span>
                    <select value={skySeasonFilter} onChange={(event) => setSkySeasonFilter(event.target.value)}>
                      <option value="All">{text.common.all}</option>
                      {skySeasons.map((season) => (
                        <option key={season} value={season}>
                          {translateSeason(language, season)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{text.sky.fov}</span>
                    <select
                      value={skyFitFilter}
                      onChange={(event) => setSkyFitFilter(event.target.value as SkyFitFilter)}
                    >
                      <option value="All">{text.common.all}</option>
                      <option value="Small">{text.sky.fitOptions.Small}</option>
                      <option value="Fits">{text.sky.fitOptions.Fits}</option>
                      <option value="Tight">{text.sky.fitOptions.Tight}</option>
                      <option value="Mosaic">{text.sky.fitOptions.Mosaic}</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
            <button
              className={`scene-toggle ${skyAutoRotate ? "is-active" : ""}`}
              type="button"
              title={skyAutoRotate ? text.sky.disableAutoRotate : text.sky.enableAutoRotate}
              aria-pressed={skyAutoRotate}
              onClick={() => setSkyAutoRotate((current) => !current)}
            >
              <RotateCw size={15} aria-hidden="true" />
              <span>{skyAutoRotate ? text.sky.auto : text.sky.still}</span>
            </button>
            <div className="scene-hud top-left">
              <span>{translateTargetType(language, selectedTarget.type)}</span>
              <strong>{selectedTarget.name}</strong>
              <em>{skySceneSummary}</em>
            </div>
            <div className="scene-hud bottom-left">
              <span>{text.sky.objectScale}</span>
              <strong>{formatObjectFootprint(selectedTarget, fov)}</strong>
              <em>{framingAdvice}</em>
            </div>
            <div className="scene-hud bottom-right">
              <span>{text.sky.fov}</span>
              <strong>
                {fov.horizontalDeg.toFixed(2)} x {fov.verticalDeg.toFixed(2)} deg
              </strong>
            </div>
          </section>

          <aside className="planner-controls" aria-label="Planner controls">
            <section className="panel optics-panel" aria-label="Imaging controls">
              <FovConsole
                fov={fov}
                profile={selectedProfile}
                selectedSensorId={selectedSensorId}
                focalLengthMm={focalLengthMm}
                sensorWidthMm={sensorWidthMm}
                sensorHeightMm={sensorHeightMm}
                pixelSizeUm={pixelSizeUm}
                reducer={reducer}
                language={language}
                onSensorPresetChange={selectSensorPreset}
                onFocalLengthChange={setFocalLengthMm}
                onSensorWidthChange={changeSensorWidth}
                onSensorHeightChange={changeSensorHeight}
                onPixelSizeChange={changePixelSize}
                onReducerChange={setReducer}
              />
            </section>

            <section className="panel session-panel" aria-label="Session controls">
              <SessionControl
                settings={sessionSettings}
                plan={sessionPlan}
                loading={isPlanning}
                language={language}
                onChange={setSessionSettings}
              />
            </section>
          </aside>
        </section>
      )}

      {workspaceMode === "capture" && (
        <section className="workspace-page capture-page" aria-label="Capture workspace">
          <aside className="capture-settings-stack" aria-label="Session setup">
            <section className="panel session-panel" aria-label="Session controls">
              <SessionControl
                settings={sessionSettings}
                plan={sessionPlan}
                loading={isPlanning}
                language={language}
                onChange={setSessionSettings}
              />
            </section>
            <section className="panel conditions-panel" aria-label="Sky conditions">
            <SkyConditions
              forecast={skyForecast}
              plan={sessionPlan}
              loading={isForecastLoading}
              refreshMinutes={weatherRefreshMinutes}
              language={language}
              onRefreshMinutesChange={setWeatherRefreshMinutes}
              onRefresh={requestWeatherRefresh}
            />
            </section>
          </aside>

          <section className="capture-command-stack" aria-label="Capture runbook">
            <SessionTimeline
              target={selectedTarget}
              plan={sessionPlan}
              loading={isPlanning}
              language={language}
            />
            <CapturePlan
              plan={capturePlan}
              loading={isCaptureLoading}
              language={language}
              archiveState={archiveState}
              archives={sessionArchives}
              onArchive={archiveCurrentSession}
            />
          </section>

          <aside className="capture-board-stack" aria-label="Tonight board">
            <TonightBoard
              board={tonightBoard}
              loading={isBoardLoading}
              selectedTargetId={selectedTarget.id}
              language={language}
              onSelectTarget={setSelectedTargetId}
            />
          </aside>
        </section>
      )}

      {workspaceMode === "process" && (
        <section className="workspace-page process-page" aria-label="Processing workspace">
          <aside className="process-target-stack" aria-label="Processing target selector">
            <section className="panel left-panel" aria-label="Target selector">
              <TargetRail
                targets={targetCatalog}
                selectedTarget={selectedTarget}
                fov={fov}
                language={language}
                onSelectTarget={setSelectedTargetId}
              />
            </section>
          </aside>

          <ProcessingPlanner
            plan={processingPlan}
            capturePlan={capturePlan}
            archives={sessionArchives}
            loading={isProcessingLoading}
            language={language}
          />

          <aside className="process-side-stack" aria-label="Processing context">
            <section className="panel conditions-panel" aria-label="Sky conditions">
              <SkyConditions
                forecast={skyForecast}
                plan={sessionPlan}
                loading={isForecastLoading}
                refreshMinutes={weatherRefreshMinutes}
                language={language}
                onRefreshMinutesChange={setWeatherRefreshMinutes}
                onRefresh={requestWeatherRefresh}
              />
            </section>
            <section className="panel optics-panel" aria-label="Imaging controls">
              <FovConsole
                fov={fov}
                profile={selectedProfile}
                selectedSensorId={selectedSensorId}
                focalLengthMm={focalLengthMm}
                sensorWidthMm={sensorWidthMm}
                sensorHeightMm={sensorHeightMm}
                pixelSizeUm={pixelSizeUm}
                reducer={reducer}
                language={language}
                onSensorPresetChange={selectSensorPreset}
                onFocalLengthChange={setFocalLengthMm}
                onSensorWidthChange={changeSensorWidth}
                onSensorHeightChange={changeSensorHeight}
                onPixelSizeChange={changePixelSize}
                onReducerChange={setReducer}
              />
            </section>
          </aside>
        </section>
      )}

      {workspaceMode === "frames" && (
        <section className="workspace-page frames-page" aria-label="Frames workspace">
          <FitsIngestPanel
            targets={targetCatalog}
            selectedProfile={selectedProfile}
            settings={sessionSettings}
            fov={fov}
            calibrationLibrary={calibrationLibrary}
            language={language}
            onArchiveCreated={addSessionArchive}
          />

          <aside className="frames-context-stack" aria-label="Frame context">
            <section className="panel frame-expectation-panel" aria-label="Expected capture frames">
              <div className="frame-context-head">
                <span>{capturePlan.targetName}</span>
                <strong>{text.frames.expectedLights}</strong>
              </div>
              <div className="frame-expectation-list">
                {capturePlan.exposureSteps.map((step) => (
                  <div key={step.filterName}>
                    <span>{step.filterName}</span>
                    <strong>
                      {step.frames} x {step.exposureSeconds}s
                    </strong>
                    <em>{step.integrationMinutes} min / {step.binning}</em>
                  </div>
                ))}
              </div>
            </section>

            <CalibrationLibraryPanel
              capturePlan={capturePlan}
              selectedProfile={selectedProfile}
              language={language}
              onLibraryChange={setCalibrationLibrary}
            />

            <section className="panel frame-archive-panel" aria-label="Recent capture archive">
              <div className="frame-context-head">
                <span>{sessionArchives.length ? text.frames.recent : text.frames.empty}</span>
                <strong>{text.frames.archive}</strong>
              </div>
              <div className="frame-archive-list">
                {sessionArchives.length ? (
                  sessionArchives.slice(0, 4).map((archive) => (
                    <div key={archive.id}>
                      <span>{translateArchiveStatus(language, archive.status)}</span>
                      <strong>{archive.targetName}</strong>
                      <em>
                        {archive.capturedFrames || archive.plannedFrames} frames /{" "}
                        {archive.totalIntegrationMinutes} min
                      </em>
                    </div>
                  ))
                ) : (
                  <div>
                    <span>{text.frames.noSessions}</span>
                    <strong>{text.frames.archiveWaiting}</strong>
                    <em>{text.frames.captureLogsWillAppear}</em>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </section>
      )}

      {workspaceMode === "multi" && (
        <section className="workspace-page multi-page" aria-label="Multi-session workspace">
          <MultiSessionPlanner
            plan={multiSessionPlan}
            loading={isMultiSessionLoading}
            language={language}
            nights={multiSessionNights}
            archiveState={multiArchiveState}
            archivedItemKey={multiArchivedItemKey}
            onNightsChange={setMultiSessionNights}
            onSelectItem={selectMultiSessionItem}
            onArchiveItem={archiveMultiSessionItem}
            onDownloadCalendar={downloadMultiSessionCalendar}
          />

          <aside className="multi-context-stack" aria-label="Multi-session context">
            <section className="panel session-panel" aria-label="Session controls">
              <SessionControl
                settings={sessionSettings}
                plan={sessionPlan}
                loading={isPlanning}
                language={language}
                onChange={setSessionSettings}
              />
            </section>
            <section className="panel conditions-panel" aria-label="Sky conditions">
              <SkyConditions
                forecast={skyForecast}
                plan={sessionPlan}
                loading={isForecastLoading}
                refreshMinutes={weatherRefreshMinutes}
                language={language}
                onRefreshMinutesChange={setWeatherRefreshMinutes}
                onRefresh={requestWeatherRefresh}
              />
            </section>
          </aside>
        </section>
      )}
    </main>
  );
}

function createArchivePayload({
  selectedTarget,
  selectedProfile,
  settings,
  fov,
  sessionPlan,
  capturePlan,
  language
}: {
  selectedTarget: Target;
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
  sessionPlan: SessionPlan;
  capturePlan: CapturePlanModel;
  language: SupportedLanguage;
}): SessionArchivePayload {
  const plannedFrames = capturePlan.exposureSteps.reduce((sum, step) => sum + step.frames, 0);

  return {
    targetId: selectedTarget.id,
    targetName: selectedTarget.name,
    sessionDate: settings.date,
    status: "planned",
    profileId: selectedProfile?.id ?? null,
    profileName: selectedProfile?.name ?? null,
    siteName: selectedProfile?.siteName ?? settings.timezone,
    bortle: settings.bortle,
    fovHorizontalDeg: fov.horizontalDeg,
    fovVerticalDeg: fov.verticalDeg,
    pixelScaleArcsec: fov.pixelScaleArcsec,
    imagingMode: capturePlan.imagingMode,
    filterNames: capturePlan.exposureSteps.map((step) => step.filterName),
    totalIntegrationMinutes: capturePlan.totalIntegrationMinutes,
    plannedFrames,
    capturedFrames: 0,
    windowStart: capturePlan.windowStart,
    windowEnd: capturePlan.windowEnd,
    weatherStatus: sessionPlan.weatherStatus,
    weatherScore: sessionPlan.weatherScore,
    moonIlluminationPercent: sessionPlan.moonIlluminationPercent,
    whiteNight: sessionPlan.whiteNight,
    notes: createSessionArchiveNotes({
      sessionPlan,
      profile: selectedProfile,
      language
    }),
    captureMarkdown: createCaptureMarkdown(capturePlan, language)
  };
}

function createMultiSessionArchivePayload({
  item,
  target,
  selectedProfile,
  settings,
  fov,
  language
}: {
  item: MultiSessionPlanItem;
  target: Target;
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
  language: SupportedLanguage;
}): SessionArchivePayload {
  const filterNames = filtersForMultiSessionItem(item, target);
  const windowMinutes = sessionWindowMinutes(item.startTime, item.endTime);
  const exposureSeconds = item.recommendedMode.toLowerCase().includes("narrowband") ? 300 : 180;
  const totalIntegrationMinutes = Math.max(45, Math.min(360, windowMinutes - 18));
  const plannedFrames = Math.max(
    filterNames.length * 6,
    Math.round((totalIntegrationMinutes * 60) / exposureSeconds)
  );

  return {
    targetId: item.targetId,
    targetName: item.targetName,
    sessionDate: item.date,
    status: "planned",
    profileId: selectedProfile?.id ?? null,
    profileName: selectedProfile?.name ?? null,
    siteName: selectedProfile?.siteName ?? settings.timezone,
    bortle: settings.bortle,
    fovHorizontalDeg: fov.horizontalDeg,
    fovVerticalDeg: fov.verticalDeg,
    pixelScaleArcsec: fov.pixelScaleArcsec,
    imagingMode: item.recommendedMode,
    filterNames,
    totalIntegrationMinutes,
    plannedFrames,
    capturedFrames: 0,
    windowStart: item.startTime,
    windowEnd: item.endTime,
    weatherStatus: weatherStatusFromScore(item.weatherScore),
    weatherScore: item.weatherScore,
    moonIlluminationPercent: item.moonIlluminationPercent,
    whiteNight: item.whiteNight,
    notes: createMultiSessionNotes({
      item,
      target,
      profile: selectedProfile,
      language
    }),
    captureMarkdown: createMultiSessionMarkdown({
      item,
      target,
      filterNames,
      totalIntegrationMinutes,
      plannedFrames,
      exposureSeconds,
      selectedProfile,
      fov,
      language
    })
  };
}

function filtersForMultiSessionItem(item: MultiSessionPlanItem, target: Target) {
  const mode = item.recommendedMode.toLowerCase();
  const targetType = target.type.toLowerCase();

  if (mode.includes("calibration")) return ["Calibration"];
  if (mode.includes("narrowband") || targetType.includes("nebula") || targetType.includes("remnant")) {
    return ["Ha", "OIII"];
  }
  if (mode.includes("luminance")) return ["L"];
  if (mode.includes("short")) return ["RGB"];
  if (targetType.includes("galaxy")) return ["L", "R", "G", "B"];
  return ["L", "RGB"];
}

function weatherStatusFromScore(score: number) {
  if (score >= 72) return "shoot";
  if (score >= 45) return "risk";
  return "skip";
}

function bestMultiSessionItemsByNight(plan: MultiSessionPlanModel) {
  return plan.nightsSummary
    .map((night) => {
      const rankedItem = plan.items.find(
        (item) => item.date === night.date && item.targetId === night.bestTargetId
      );
      if (rankedItem) return rankedItem;

      return {
        date: night.date,
        targetId: night.bestTargetId,
        targetName: night.bestTargetName,
        catalogId: night.catalogId,
        targetType: night.targetType,
        score: night.score,
        astronomyScore: night.score,
        weatherScore: night.weatherScore,
        fovScore: 0,
        fovFit: night.fovFit,
        moonIlluminationPercent: night.moonIlluminationPercent,
        whiteNight: night.whiteNight,
        maxAltitudeDeg: night.maxAltitudeDeg,
        startTime: night.startTime,
        endTime: night.endTime,
        bestTime: night.bestTime,
        recommendedMode: night.recommendedMode,
        reason: night.reason
      };
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

function multiSessionItemKey(item: MultiSessionPlanItem) {
  return `${item.date}-${item.targetId}`;
}

function sessionWindowMinutes(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) end += 24 * 60;
  return Math.max(45, end - start);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}

function isWorkspaceMode(value: string | null): value is WorkspaceMode {
  return (
    value === "planner" ||
    value === "capture" ||
    value === "process" ||
    value === "frames" ||
    value === "multi"
  );
}

function isForecastRefreshMinutes(value: number): value is ForecastRefreshMinutes {
  return value === 15 || value === 30 || value === 60;
}

function sceneSummary({
  mode,
  visibleCount,
  filteredCount,
  totalCount,
  language
}: {
  mode: SkyDisplayMode;
  visibleCount: number;
  filteredCount: number;
  totalCount: number;
  language: SupportedLanguage;
}) {
  const labels = {
    en: { focus: "Focus", object: "object", objects: "objects", tonight: "Tonight", showcase: "Showcase", filtered: "Filtered", of: "of" },
    pl: { focus: "Fokus", object: "obiekt", objects: "obiektĂłw", tonight: "DziĹ›", showcase: "Showcase", filtered: "Filtr", of: "z" },
    de: { focus: "Fokus", object: "Objekt", objects: "Objekte", tonight: "Heute", showcase: "Showcase", filtered: "Gefiltert", of: "von" },
    it: { focus: "Focus", object: "oggetto", objects: "oggetti", tonight: "Stasera", showcase: "Showcase", filtered: "Filtrati", of: "di" },
    es: { focus: "Foco", object: "objeto", objects: "objetos", tonight: "Hoy", showcase: "Showcase", filtered: "Filtrado", of: "de" }
  }[language];

  if (mode === "focus") return `${labels.focus} / 1 ${labels.object}`;
  if (mode === "tonight") return `${labels.tonight} / ${visibleCount} ${labels.objects}`;
  if (mode === "showcase") return `${labels.showcase} / ${visibleCount} ${labels.of} ${filteredCount}`;
  return `${labels.filtered} / ${visibleCount} ${labels.of} ${totalCount}`;
}

function analyzeFraming(target: Target, fov: FovResult, language: SupportedLanguage) {
  const fovWidthArcmin = fov.horizontalDeg * 60;
  const fovHeightArcmin = fov.verticalDeg * 60;
  const load = Math.max(
    target.angularWidthArcmin / fovWidthArcmin,
    target.angularHeightArcmin / fovHeightArcmin
  );
  const swappedLoad = Math.max(
    target.angularWidthArcmin / fovHeightArcmin,
    target.angularHeightArcmin / fovWidthArcmin
  );

  if (load > 1.05) {
    const columns = Math.max(1, Math.ceil(target.angularWidthArcmin / (fovWidthArcmin * 0.82)));
    const rows = Math.max(1, Math.ceil(target.angularHeightArcmin / (fovHeightArcmin * 0.82)));
    const overlap = {
      en: "mosaic / 18% overlap",
      pl: "mozaika / 18% zakĹ‚adki",
      de: "Mosaik / 18% Ăśberlappung",
      it: "mosaico / 18% sovrapposizione",
      es: "mosaico / 18% solape"
    }[language];
    return `${columns} x ${rows} ${overlap}`;
  }

  if (swappedLoad + 0.05 < load) {
    return {
      en: "Rotate 90 deg for better margin",
      pl: "ObrĂłÄ‡ 90 deg dla lepszego marginesu",
      de: "90 deg drehen fĂĽr besseren Rand",
      it: "Ruota 90 deg per piĂą margine",
      es: "Gira 90 deg para mejor margen"
    }[language];
  }
  if (load > 0.78) {
    return {
      en: "Tight frame / check rotation",
      pl: "Ciasny kadr / sprawdĹş rotacjÄ™",
      de: "Knappes Bildfeld / Rotation prĂĽfen",
      it: "Inquadratura stretta / controlla rotazione",
      es: "Encuadre justo / revisa rotaciĂłn"
    }[language];
  }

  const marginPercent = Math.round((1 - load) * 100);
  const marginLabel = {
    en: "Margin",
    pl: "Margines",
    de: "Rand",
    it: "Margine",
    es: "Margen"
  }[language];
  const singlePanel = {
    en: "single panel",
    pl: "pojedynczy panel",
    de: "Einzelpanel",
    it: "pannello singolo",
    es: "panel Ăşnico"
  }[language];
  return `${marginLabel} +${marginPercent}% / ${singlePanel}`;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function estimateAperture(focalLengthMm: number) {
  return Math.round(Math.max(40, Math.min(300, focalLengthMm / 6)));
}
