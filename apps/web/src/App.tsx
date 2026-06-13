import { useEffect, useMemo, useState } from "react";
import { Activity, Aperture, Gauge, LocateFixed, Moon, Radio, Telescope } from "lucide-react";
import { SkyScene } from "./components/SkyScene";
import { TargetRail } from "./components/TargetRail";
import { FovConsole } from "./components/FovConsole";
import { SessionTimeline } from "./components/SessionTimeline";
import { calculateFov } from "./lib/fov";
import { createFallbackSessionPlan, fetchSessionPlan } from "./lib/session";
import { targets } from "./lib/targets";

export function App() {
  const [selectedTargetId, setSelectedTargetId] = useState("m42");
  const [focalLengthMm, setFocalLengthMm] = useState(480);
  const [sensorWidthMm, setSensorWidthMm] = useState(23.5);
  const [sensorHeightMm, setSensorHeightMm] = useState(15.7);
  const [pixelSizeUm, setPixelSizeUm] = useState(3.76);
  const [reducer, setReducer] = useState(1);
  const [isPlanning, setIsPlanning] = useState(false);

  const selectedTarget = targets.find((target) => target.id === selectedTargetId) ?? targets[0];
  const [sessionPlan, setSessionPlan] = useState(() => createFallbackSessionPlan(selectedTarget));
  const fov = useMemo(
    () => calculateFov({ focalLengthMm, sensorWidthMm, sensorHeightMm, pixelSizeUm, reducer }),
    [focalLengthMm, sensorWidthMm, sensorHeightMm, pixelSizeUm, reducer]
  );

  useEffect(() => {
    let ignore = false;
    setIsPlanning(true);
    setSessionPlan(createFallbackSessionPlan(selectedTarget));

    fetchSessionPlan(selectedTarget.id)
      .then((plan) => {
        if (!ignore) setSessionPlan(plan);
      })
      .catch(() => {
        if (!ignore) setSessionPlan(createFallbackSessionPlan(selectedTarget));
      })
      .finally(() => {
        if (!ignore) setIsPlanning(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedTarget]);

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
        <aside className="panel left-panel" aria-label="Target selector">
          <TargetRail
            targets={targets}
            selectedTarget={selectedTarget}
            onSelectTarget={setSelectedTargetId}
          />
        </aside>

        <section className="sky-stage" aria-label="Interactive sky map">
          <SkyScene
            targets={targets}
            selectedTarget={selectedTarget}
            fov={fov}
            onSelectTarget={setSelectedTargetId}
          />
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

        <aside className="panel right-panel" aria-label="Imaging controls">
          <FovConsole
            fov={fov}
            focalLengthMm={focalLengthMm}
            sensorWidthMm={sensorWidthMm}
            sensorHeightMm={sensorHeightMm}
            pixelSizeUm={pixelSizeUm}
            reducer={reducer}
            onFocalLengthChange={setFocalLengthMm}
            onSensorWidthChange={setSensorWidthMm}
            onSensorHeightChange={setSensorHeightMm}
            onPixelSizeChange={setPixelSizeUm}
            onReducerChange={setReducer}
          />
        </aside>
      </section>

      <SessionTimeline target={selectedTarget} plan={sessionPlan} loading={isPlanning} />
    </main>
  );
}
