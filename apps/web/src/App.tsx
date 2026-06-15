import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Activity, Aperture, Gauge, LocateFixed, Moon, Radio, RotateCw, Telescope } from "lucide-react";
import { TargetRail } from "./components/TargetRail";
import { FovConsole } from "./components/FovConsole";
import { ProfileDock } from "./components/ProfileDock";
import { CapturePlan } from "./components/CapturePlan";
import { SessionControl } from "./components/SessionControl";
import { SessionTimeline } from "./components/SessionTimeline";
import { SkyConditions } from "./components/SkyConditions";
import { TonightBoard } from "./components/TonightBoard";
import {
  createFallbackSkyForecast,
  fetchSkyForecast,
  type SkyForecast
} from "./lib/forecast";
import { calculateFov } from "./lib/fov";
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
  createFallbackSessionPlan,
  createFallbackTonightBoard,
  fetchCapturePlan,
  fetchSessionPlan,
  fetchTonightBoard,
  getTodayIsoDate,
  type CapturePlan as CapturePlanModel,
  type TonightBoard as TonightBoardModel,
  type SessionSettings
} from "./lib/session";
import { fallbackTargets, fetchTargets } from "./lib/targets";

const SkyScene = lazy(() =>
  import("./components/SkyScene").then((module) => ({ default: module.SkyScene }))
);

export function App() {
  const [selectedTargetId, setSelectedTargetId] = useState("ngc7000");
  const [focalLengthMm, setFocalLengthMm] = useState(480);
  const [sensorWidthMm, setSensorWidthMm] = useState(23.5);
  const [sensorHeightMm, setSensorHeightMm] = useState(15.7);
  const [pixelSizeUm, setPixelSizeUm] = useState(3.76);
  const [selectedSensorId, setSelectedSensorId] = useState("imx571");
  const [reducer, setReducer] = useState(1);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [isBoardLoading, setIsBoardLoading] = useState(false);
  const [isCaptureLoading, setIsCaptureLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [skyAutoRotate, setSkyAutoRotate] = useState(() => {
    return window.localStorage.getItem("astrofoto-sky-auto-rotate") !== "false";
  });
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

  useEffect(() => {
    window.localStorage.setItem(
      "astrofoto-sky-auto-rotate",
      skyAutoRotate ? "true" : "false"
    );
  }, [skyAutoRotate]);

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
    setIsPlanning(true);
    setSessionPlan(createFallbackSessionPlan(selectedTarget, sessionSettings));

    fetchSessionPlan(selectedTarget.id, sessionSettings)
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
  }, [selectedTarget, sessionSettings]);

  useEffect(() => {
    let ignore = false;
    setIsForecastLoading(true);
    setSkyForecast(createFallbackSkyForecast(sessionSettings));

    fetchSkyForecast(sessionSettings)
      .then((forecast) => {
        if (!ignore) setSkyForecast(forecast);
      })
      .catch(() => {
        if (!ignore) setSkyForecast(createFallbackSkyForecast(sessionSettings));
      })
      .finally(() => {
        if (!ignore) setIsForecastLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [sessionSettings]);

  useEffect(() => {
    let ignore = false;
    setIsBoardLoading(true);
    setTonightBoard(createFallbackTonightBoard(targetCatalog, sessionSettings, fov));

    fetchTonightBoard(sessionSettings, fov)
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
  }, [sessionSettings, fov, targetCatalog]);

  useEffect(() => {
    let ignore = false;
    setIsCaptureLoading(true);
    setCapturePlan(createFallbackCapturePlan(selectedTarget, sessionSettings, fov));

    fetchCapturePlan(selectedTarget.id, sessionSettings, fov)
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
  }, [selectedTarget, sessionSettings, fov]);

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <Telescope size={22} aria-hidden="true" />
          <div>
            <span>Astrofoto</span>
            <strong>Mission Control</strong>
          </div>
        </div>

        <nav className="mode-tabs" aria-label="Workspace modes">
          <button className="is-active" type="button" title="Planner">
            <LocateFixed size={17} aria-hidden="true" />
            Planner
          </button>
          <button type="button" title="Capture">
            <Aperture size={17} aria-hidden="true" />
            Capture
          </button>
          <button type="button" title="Signal">
            <Activity size={17} aria-hidden="true" />
            Signal
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

      <section className="mission-grid">
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
              targets={targetCatalog}
              selectedTarget={selectedTarget}
              fov={fov}
              autoRotate={skyAutoRotate}
              onSelectTarget={setSelectedTargetId}
            />
          </Suspense>
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
          </div>
          <div className="scene-hud bottom-right">
            <span>FOV</span>
            <strong>
              {fov.horizontalDeg.toFixed(2)} x {fov.verticalDeg.toFixed(2)} deg
            </strong>
          </div>
        </section>

        <aside className="right-stack" aria-label="Session and imaging controls">
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

      <section className="bottom-grid" aria-label="Timeline and tonight board">
        <SessionTimeline target={selectedTarget} plan={sessionPlan} loading={isPlanning} />
        <TonightBoard
          board={tonightBoard}
          loading={isBoardLoading}
          selectedTargetId={selectedTarget.id}
          onSelectTarget={setSelectedTargetId}
        />
        <CapturePlan plan={capturePlan} loading={isCaptureLoading} />
      </section>
    </main>
  );
}

function estimateAperture(focalLengthMm: number) {
  return Math.round(Math.max(40, Math.min(300, focalLengthMm / 6)));
}
