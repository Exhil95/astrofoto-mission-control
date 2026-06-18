import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Aperture,
  CalendarRange,
  FileSearch,
  GalleryHorizontal,
  Gauge,
  LocateFixed,
  Moon,
  Radio,
  RotateCw,
  SlidersHorizontal,
  Telescope
} from "lucide-react";
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
import {
  createFallbackSkyForecast,
  fetchSkyForecast,
  type ForecastRefreshMinutes,
  type SkyForecast
} from "./lib/forecast";
import { calculateFov, type FovResult } from "./lib/fov";
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

type SkyDisplayMode = "focus" | "tonight" | "showcase" | "catalog";
type SkyFitFilter = "All" | "Small" | "Fits" | "Tight" | "Mosaic";
type WorkspaceMode = "planner" | "capture" | "process" | "frames" | "multi";
type ArchiveState = "idle" | "saving" | "saved" | "failed";

export function App() {
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
        totalCount: targetCatalog.length
      }),
    [skyDisplayMode, visibleSkyTargets.length, filteredSkyTargets.length, targetCatalog.length]
  );
  const framingAdvice = useMemo(() => analyzeFraming(selectedTarget, fov), [selectedTarget, fov]);

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
          fov
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
      fov
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
      capturePlan
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
            <span>Astrofoto</span>
            <strong>Mission Control</strong>
          </div>
        </div>

        <nav className="mode-tabs" aria-label="Workspace modes">
          <button
            className={workspaceMode === "planner" ? "is-active" : ""}
            type="button"
            title="Planner"
            onClick={() => setWorkspaceMode("planner")}
          >
            <LocateFixed size={17} aria-hidden="true" />
            Planner
          </button>
          <button
            className={workspaceMode === "capture" ? "is-active" : ""}
            type="button"
            title="Capture"
            onClick={() => setWorkspaceMode("capture")}
          >
            <Aperture size={17} aria-hidden="true" />
            Capture
          </button>
          <button
            className={workspaceMode === "process" ? "is-active" : ""}
            type="button"
            title="Process"
            onClick={() => setWorkspaceMode("process")}
          >
            <Activity size={17} aria-hidden="true" />
            Process
          </button>
          <button
            className={workspaceMode === "frames" ? "is-active" : ""}
            type="button"
            title="Frames"
            onClick={() => setWorkspaceMode("frames")}
          >
            <FileSearch size={17} aria-hidden="true" />
            Frames
          </button>
          <button
            className={workspaceMode === "multi" ? "is-active" : ""}
            type="button"
            title="Multi-session"
            onClick={() => setWorkspaceMode("multi")}
          >
            <CalendarRange size={17} aria-hidden="true" />
            Multi
          </button>
        </nav>

        <div className="signal-strip" aria-label="Session status">
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
            {isPlanning ? "Sync" : "Live"}
          </span>
        </div>
      </header>

      {workspaceMode === "planner" && (
        <section className="workspace-page planner-page" aria-label="Planner workspace">
          <aside className="left-stack" aria-label="Targets and profiles">
            <section className="panel left-panel" aria-label="Target selector">
              <TargetRail
                targets={targetCatalog}
                selectedTarget={selectedTarget}
                fov={fov}
                onSelectTarget={setSelectedTargetId}
              />
            </section>

            <section className="panel profile-panel" aria-label="Equipment profiles">
              <ProfileDock
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                busy={isProfileSaving}
                onSelectProfile={selectProfile}
                onSaveCurrent={saveCurrentProfile}
                onUpdateProfile={updateExistingProfile}
                onDuplicateProfile={duplicateExistingProfile}
                onDeleteProfile={deleteExistingProfile}
              />
            </section>
          </aside>

          <section className="sky-stage" aria-label="Interactive sky map">
            <Suspense
              fallback={
                <div className="sky-loading">
                  <span>Sky engine</span>
                  <strong>Initializing WebGL</strong>
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
            <div className="scene-controls" aria-label="Sky display controls">
              <div className="scene-mode-tabs">
                <button
                  className={skyDisplayMode === "focus" ? "is-active" : ""}
                  type="button"
                  title="Show selected target only"
                  onClick={() => setSkyDisplayMode("focus")}
                >
                  <LocateFixed size={14} aria-hidden="true" />
                  Focus
                </button>
                <button
                  className={skyDisplayMode === "tonight" ? "is-active" : ""}
                  type="button"
                  title="Show selected target and Tonight Board objects"
                  onClick={() => setSkyDisplayMode("tonight")}
                >
                  <Moon size={14} aria-hidden="true" />
                  Tonight
                </button>
                <button
                  className={skyDisplayMode === "showcase" ? "is-active" : ""}
                  type="button"
                  title="Rotate through a filtered target showcase"
                  onClick={() => setSkyDisplayMode("showcase")}
                >
                  <GalleryHorizontal size={14} aria-hidden="true" />
                  Show
                </button>
                <button
                  className={skyDisplayMode === "catalog" ? "is-active" : ""}
                  type="button"
                  title="Show filtered catalog targets"
                  onClick={() => setSkyDisplayMode("catalog")}
                >
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  Filter
                </button>
              </div>

              {(skyDisplayMode === "showcase" || skyDisplayMode === "catalog") && (
                <div className="scene-filter-row">
                  <label>
                    <span>Type</span>
                    <select value={skyTypeFilter} onChange={(event) => setSkyTypeFilter(event.target.value)}>
                      <option value="All">All</option>
                      {skyTargetTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Season</span>
                    <select value={skySeasonFilter} onChange={(event) => setSkySeasonFilter(event.target.value)}>
                      <option value="All">All</option>
                      {skySeasons.map((season) => (
                        <option key={season} value={season}>
                          {season}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>FOV</span>
                    <select
                      value={skyFitFilter}
                      onChange={(event) => setSkyFitFilter(event.target.value as SkyFitFilter)}
                    >
                      <option value="All">All</option>
                      <option value="Small">Small</option>
                      <option value="Fits">Fits</option>
                      <option value="Tight">Tight</option>
                      <option value="Mosaic">Mosaic</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
            <button
              className={`scene-toggle ${skyAutoRotate ? "is-active" : ""}`}
              type="button"
              title={skyAutoRotate ? "Disable sky auto-rotate" : "Enable sky auto-rotate"}
              aria-pressed={skyAutoRotate}
              onClick={() => setSkyAutoRotate((current) => !current)}
            >
              <RotateCw size={15} aria-hidden="true" />
              <span>{skyAutoRotate ? "Auto" : "Still"}</span>
            </button>
            <div className="scene-hud top-left">
              <span>{selectedTarget.type}</span>
              <strong>{selectedTarget.name}</strong>
              <em>{skySceneSummary}</em>
            </div>
            <div className="scene-hud bottom-left">
              <span>Object scale</span>
              <strong>{formatObjectFootprint(selectedTarget, fov)}</strong>
              <em>{framingAdvice}</em>
            </div>
            <div className="scene-hud bottom-right">
              <span>FOV</span>
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
                onChange={setSessionSettings}
              />
            </section>
            <section className="panel conditions-panel" aria-label="Sky conditions">
            <SkyConditions
              forecast={skyForecast}
              plan={sessionPlan}
              loading={isForecastLoading}
              refreshMinutes={weatherRefreshMinutes}
              onRefreshMinutesChange={setWeatherRefreshMinutes}
              onRefresh={requestWeatherRefresh}
            />
            </section>
          </aside>

          <section className="capture-command-stack" aria-label="Capture runbook">
            <SessionTimeline target={selectedTarget} plan={sessionPlan} loading={isPlanning} />
            <CapturePlan
              plan={capturePlan}
              loading={isCaptureLoading}
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
                onSelectTarget={setSelectedTargetId}
              />
            </section>
          </aside>

          <ProcessingPlanner
            plan={processingPlan}
            capturePlan={capturePlan}
            archives={sessionArchives}
            loading={isProcessingLoading}
          />

          <aside className="process-side-stack" aria-label="Processing context">
            <section className="panel conditions-panel" aria-label="Sky conditions">
              <SkyConditions
                forecast={skyForecast}
                plan={sessionPlan}
                loading={isForecastLoading}
                refreshMinutes={weatherRefreshMinutes}
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
            onArchiveCreated={addSessionArchive}
          />

          <aside className="frames-context-stack" aria-label="Frame context">
            <section className="panel frame-expectation-panel" aria-label="Expected capture frames">
              <div className="frame-context-head">
                <span>{capturePlan.targetName}</span>
                <strong>Expected Lights</strong>
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
            />

            <section className="panel frame-archive-panel" aria-label="Recent capture archive">
              <div className="frame-context-head">
                <span>{sessionArchives.length ? "Recent" : "Empty"}</span>
                <strong>Archive</strong>
              </div>
              <div className="frame-archive-list">
                {sessionArchives.length ? (
                  sessionArchives.slice(0, 4).map((archive) => (
                    <div key={archive.id}>
                      <span>{archive.status}</span>
                      <strong>{archive.targetName}</strong>
                      <em>
                        {archive.capturedFrames || archive.plannedFrames} frames /{" "}
                        {archive.totalIntegrationMinutes} min
                      </em>
                    </div>
                  ))
                ) : (
                  <div>
                    <span>No sessions</span>
                    <strong>Archive waiting</strong>
                    <em>Capture logs will appear here</em>
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
                onChange={setSessionSettings}
              />
            </section>
            <section className="panel conditions-panel" aria-label="Sky conditions">
              <SkyConditions
                forecast={skyForecast}
                plan={sessionPlan}
                loading={isForecastLoading}
                refreshMinutes={weatherRefreshMinutes}
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
  capturePlan
}: {
  selectedTarget: Target;
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
  sessionPlan: SessionPlan;
  capturePlan: CapturePlanModel;
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
    notes: createArchiveNotes(sessionPlan, selectedProfile),
    captureMarkdown: capturePlan.exportMarkdown
  };
}

function createMultiSessionArchivePayload({
  item,
  target,
  selectedProfile,
  settings,
  fov
}: {
  item: MultiSessionPlanItem;
  target: Target;
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
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
    notes: createMultiSessionNotes(item, target, selectedProfile),
    captureMarkdown: createMultiSessionMarkdown({
      item,
      target,
      filterNames,
      totalIntegrationMinutes,
      plannedFrames,
      exposureSeconds,
      selectedProfile,
      fov
    })
  };
}

function createArchiveNotes(
  sessionPlan: SessionPlan,
  profile: EquipmentProfile | null
) {
  return [
    sessionPlan.recommendation,
    sessionPlan.whiteNight ? "White night: favor narrowband and brighter structures" : "Astronomical darkness available",
    `Weather ${sessionPlan.weatherScore}/100: ${sessionPlan.weatherSummary}`,
    `Profile: ${profile?.name ?? "Custom setup"}`
  ].join("\n");
}

function createMultiSessionNotes(
  item: MultiSessionPlanItem,
  target: Target,
  profile: EquipmentProfile | null
) {
  return [
    item.reason,
    `Mode: ${item.recommendedMode}`,
    `FOV: ${item.fovFit}, ${target.angularWidthArcmin} x ${target.angularHeightArcmin} arcmin`,
    `Weather ${item.weatherScore}/100, Moon ${item.moonIlluminationPercent}%`,
    item.whiteNight ? "White night: favor narrowband and brighter structures" : "Astronomical darkness available",
    `Profile: ${profile?.name ?? "Custom setup"}`
  ].join("\n");
}

function createMultiSessionMarkdown({
  item,
  target,
  filterNames,
  totalIntegrationMinutes,
  plannedFrames,
  exposureSeconds,
  selectedProfile,
  fov
}: {
  item: MultiSessionPlanItem;
  target: Target;
  filterNames: string[];
  totalIntegrationMinutes: number;
  plannedFrames: number;
  exposureSeconds: number;
  selectedProfile: EquipmentProfile | null;
  fov: FovResult;
}) {
  const framesPerFilter = Math.max(1, Math.round(plannedFrames / Math.max(1, filterNames.length)));
  const lights = filterNames
    .map((filterName) => `- ${filterName}: ${framesPerFilter} x ${exposureSeconds}s`)
    .join("\n");

  return [
    `# Multi-session Plan: ${item.targetName}`,
    "",
    `- Date: ${item.date}`,
    `- Window: ${item.startTime} - ${item.endTime}`,
    `- Mode: ${item.recommendedMode}`,
    `- Score: ${item.score}/100`,
    `- Weather: ${item.weatherScore}/100`,
    `- Moon: ${item.moonIlluminationPercent}%`,
    `- FOV: ${fov.horizontalDeg.toFixed(2)} x ${fov.verticalDeg.toFixed(2)} deg`,
    `- Framing: ${item.fovFit}; ${target.framing}`,
    `- Profile: ${selectedProfile?.name ?? "Custom setup"}`,
    "",
    "## Lights",
    lights,
    "",
    `Total planned integration: ${totalIntegrationMinutes} min`,
    "",
    "## Notes",
    `- ${item.reason}`,
    `- Peak altitude: ${item.maxAltitudeDeg} deg at ${item.bestTime}`,
    item.whiteNight ? "- White night: keep broadband as backup only" : "- Astronomical darkness check passed",
    "- Confirm weather trend and first-frame plate solve before committing the full run"
  ].join("\n");
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

function createMultiSessionCalendar({
  items,
  selectedProfile,
  settings,
  fov
}: {
  items: MultiSessionPlanItem[];
  selectedProfile: EquipmentProfile | null;
  settings: SessionSettings;
  fov: FovResult;
}) {
  const timezone = settings.timezone || "Europe/Warsaw";
  const createdAt = toIcsUtc(new Date());
  const events = items.map((item) =>
    [
      "BEGIN:VEVENT",
      `UID:${icsSafeId(`${item.date}-${item.targetId}`)}@astrofoto-mission-control`,
      `DTSTAMP:${createdAt}`,
      `DTSTART;TZID=${timezone}:${toIcsLocal(item.date, item.startTime)}`,
      `DTEND;TZID=${timezone}:${toIcsLocal(eventEndDate(item.date, item.startTime, item.endTime), item.endTime)}`,
      `SUMMARY:${escapeIcsText(`${item.targetName} - ${item.recommendedMode}`)}`,
      `LOCATION:${escapeIcsText(selectedProfile?.siteName ?? timezone)}`,
      `DESCRIPTION:${escapeIcsText(
        [
          item.reason,
          `Score ${item.score}/100`,
          `Weather ${item.weatherScore}/100`,
          `Moon ${item.moonIlluminationPercent}%`,
          `FOV ${fov.horizontalDeg.toFixed(2)} x ${fov.verticalDeg.toFixed(2)} deg`,
          item.whiteNight ? "White night" : "Darkness available"
        ].join("\n")
      )}`,
      "END:VEVENT"
    ].join("\r\n")
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Astrofoto Mission Control//Multi-session Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText("Astrofoto Mission Plan")}`,
    `X-WR-TIMEZONE:${timezone}`,
    ...events,
    "END:VCALENDAR"
  ].join("\r\n");
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

function multiSessionItemKey(item: MultiSessionPlanItem) {
  return `${item.date}-${item.targetId}`;
}

function sessionWindowMinutes(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) end += 24 * 60;
  return Math.max(45, end - start);
}

function eventEndDate(dateIso: string, startTime: string, endTime: string) {
  return timeToMinutes(endTime) <= timeToMinutes(startTime) ? addDaysIso(dateIso, 1) : dateIso;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}

function addDaysIso(dateIso: string, days: number) {
  const nextDate = new Date(`${dateIso}T12:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function toIcsLocal(dateIso: string, time: string) {
  const [hours, minutes] = time.split(":");
  return `${dateIso.replace(/-/g, "")}T${hours.padStart(2, "0")}${minutes.padStart(2, "0")}00`;
}

function toIcsUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icsSafeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

function formatObjectFootprint(target: Target, fov: FovResult) {
  const widthPercent = Math.round((target.angularWidthArcmin / (fov.horizontalDeg * 60)) * 100);
  const heightPercent = Math.round((target.angularHeightArcmin / (fov.verticalDeg * 60)) * 100);
  return `${target.angularWidthArcmin} x ${target.angularHeightArcmin}' / ${widthPercent}% x ${heightPercent}%`;
}

function isSkyDisplayMode(value: string | null): value is SkyDisplayMode {
  return value === "focus" || value === "tonight" || value === "showcase" || value === "catalog";
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

function filterSkyTargets(
  targets: Target[],
  fov: FovResult,
  typeFilter: string,
  seasonFilter: string,
  fitFilter: SkyFitFilter
) {
  return targets.filter((target) => {
    const fit = calculateFitLabel(target, fov);
    return (
      (typeFilter === "All" || target.type === typeFilter) &&
      (seasonFilter === "All" || target.season === seasonFilter) &&
      (fitFilter === "All" || fit === fitFilter)
    );
  });
}

function curateSkyTargets({
  mode,
  selectedTarget,
  allTargets,
  filteredTargets,
  tonightTargetIds,
  showcaseIndex
}: {
  mode: SkyDisplayMode;
  selectedTarget: Target;
  allTargets: Target[];
  filteredTargets: Target[];
  tonightTargetIds: string[];
  showcaseIndex: number;
}) {
  if (mode === "focus") return [selectedTarget];

  if (mode === "tonight") {
    const tonightTargets = tonightTargetIds
      .map((targetId) => allTargets.find((target) => target.id === targetId))
      .filter((target): target is Target => Boolean(target));
    return uniqueTargets([selectedTarget, ...tonightTargets]).slice(0, 6);
  }

  if (mode === "showcase") {
    const showcasedTargets = rotatingWindow(filteredTargets, showcaseIndex, 7);
    return uniqueTargets([selectedTarget, ...showcasedTargets]).slice(0, 8);
  }

  return uniqueTargets([selectedTarget, ...filteredTargets]).slice(0, 12);
}

function rotatingWindow(targets: Target[], index: number, limit: number) {
  if (!targets.length) return [];
  return Array.from({ length: Math.min(limit, targets.length) }, (_, offset) => {
    return targets[(index + offset) % targets.length];
  });
}

function uniqueTargets(targets: Target[]) {
  const seenTargetIds = new Set<string>();
  return targets.filter((target) => {
    if (seenTargetIds.has(target.id)) return false;
    seenTargetIds.add(target.id);
    return true;
  });
}

function sceneSummary({
  mode,
  visibleCount,
  filteredCount,
  totalCount
}: {
  mode: SkyDisplayMode;
  visibleCount: number;
  filteredCount: number;
  totalCount: number;
}) {
  if (mode === "focus") return "Focus / 1 object";
  if (mode === "tonight") return `Tonight / ${visibleCount} objects`;
  if (mode === "showcase") return `Showcase / ${visibleCount} of ${filteredCount}`;
  return `Filtered / ${visibleCount} of ${totalCount}`;
}

function analyzeFraming(target: Target, fov: FovResult) {
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
    return `${columns} x ${rows} mosaic / 18% overlap`;
  }

  if (swappedLoad + 0.05 < load) return "Rotate 90 deg for better margin";
  if (load > 0.78) return "Tight frame / check rotation";

  const marginPercent = Math.round((1 - load) * 100);
  return `Margin +${marginPercent}% / single panel`;
}

function calculateFitLabel(target: Target, fov: FovResult): SkyFitFilter {
  const load = Math.max(
    target.angularWidthArcmin / (fov.horizontalDeg * 60),
    target.angularHeightArcmin / (fov.verticalDeg * 60)
  );
  if (load <= 0.18) return "Small";
  if (load <= 0.78) return "Fits";
  if (load <= 1.05) return "Tight";
  return "Mosaic";
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function estimateAperture(focalLengthMm: number) {
  return Math.round(Math.max(40, Math.min(300, focalLengthMm / 6)));
}
