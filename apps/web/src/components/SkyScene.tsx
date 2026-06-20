import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { useMemo, useRef, type CSSProperties } from "react";
import type { Group } from "three";
import type { FovResult } from "../lib/fov";
import type { Target } from "../lib/targets";

type SkySceneProps = {
  targets: Target[];
  selectedTarget: Target;
  fov: FovResult;
  autoRotate: boolean;
  layoutMode: "sky" | "showcase";
  onSelectTarget: (targetId: string) => void;
};

const MAX_COMPARISON_WIDTH = 2.9;
const MAX_COMPARISON_HEIGHT = 2.0;
const DEFAULT_DEGREE_SCALE = 0.62;
const SELECTED_SCENE_POSITION: [number, number, number] = [0, 0, 0.65];
const SKY_OBJECT_SLOTS = [
  { left: "8%", top: "25%" },
  { left: "96%", top: "25%" },
  { left: "8%", top: "50%" },
  { left: "96%", top: "50%" },
  { left: "8%", top: "75%" },
  { left: "96%", top: "75%" },
  { left: "31%", top: "86%" },
  { left: "69%", top: "86%" },
  { left: "43%", top: "91%" },
  { left: "57%", top: "91%" },
  { left: "50%", top: "17%" }
];

type ComparisonSize = {
  fovWidth: number;
  fovHeight: number;
  targetWidth: number;
  targetHeight: number;
};

function calculateComparisonSize(target: Target, fov: FovResult): ComparisonSize {
  const targetWidthDeg = target.angularWidthArcmin / 60;
  const targetHeightDeg = target.angularHeightArcmin / 60;
  const widestDeg = Math.max(fov.horizontalDeg, targetWidthDeg, 0.1);
  const tallestDeg = Math.max(fov.verticalDeg, targetHeightDeg, 0.1);
  const degreeScale = Math.min(
    DEFAULT_DEGREE_SCALE,
    MAX_COMPARISON_WIDTH / widestDeg,
    MAX_COMPARISON_HEIGHT / tallestDeg
  );

  return {
    fovWidth: Math.max(0.03, fov.horizontalDeg * degreeScale),
    fovHeight: Math.max(0.03, fov.verticalDeg * degreeScale),
    targetWidth: Math.max(0.025, targetWidthDeg * degreeScale),
    targetHeight: Math.max(0.025, targetHeightDeg * degreeScale)
  };
}

function TargetMarker({
  target,
  position,
  selected,
  onSelect
}: {
  target: Target;
  position: [number, number, number];
  selected: boolean;
  onSelect: () => void;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const pulse = selected ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08 : 1;
    groupRef.current.scale.setScalar(pulse);
  });

  if (selected) {
    return (
      <group ref={groupRef} position={position} onClick={onSelect}>
        <pointLight color={target.tint} intensity={2.2} distance={3.6} />
      </group>
    );
  }

  return null;
}

function SelectedScalePlate({
  target,
  position,
  fov
}: {
  target: Target;
  position: [number, number, number];
  fov: FovResult;
}) {
  const plate = useMemo(() => {
    const comparison = calculateComparisonSize(target, fov);
    const pixelsPerUnit = 150;
    const fovWidthPx = comparison.fovWidth * pixelsPerUnit;
    const fovHeightPx = comparison.fovHeight * pixelsPerUnit;
    const targetWidthPx = Math.max(1, comparison.targetWidth * pixelsPerUnit);
    const targetHeightPx = Math.max(1, comparison.targetHeight * pixelsPerUnit);
    const stageWidthPx = Math.max(fovWidthPx, targetWidthPx) + 34;
    const stageHeightPx = Math.max(fovHeightPx, targetHeightPx) + 34;

    return {
      fovWidthPx,
      fovHeightPx,
      targetWidthPx,
      targetHeightPx,
      stageWidthPx,
      stageHeightPx
    };
  }, [target, fov]);

  return (
    <Html
      center
      transform
      sprite
      distanceFactor={5.8}
      position={[position[0], position[1], position[2] + 0.01]}
      zIndexRange={[28, 14]}
    >
      <div
        className="selected-scale-plate"
        style={
          {
            "--target-tint": target.tint,
            "--stage-width": `${plate.stageWidthPx}px`,
            "--stage-height": `${plate.stageHeightPx}px`,
            "--target-width": `${plate.targetWidthPx}px`,
            "--target-height": `${plate.targetHeightPx}px`,
            "--fov-width": `${plate.fovWidthPx}px`,
            "--fov-height": `${plate.fovHeightPx}px`
          } as CSSProperties
        }
      >
        <div className="selected-object-image">
          <img src={target.imageUrl} alt="" draggable={false} />
        </div>
        <div className="selected-object-outline" />
        <div className="selected-fov-overlay">
          <span>FOV</span>
        </div>
      </div>
    </Html>
  );
}

function SkyObjects({ targets, selectedTarget, fov, autoRotate, layoutMode, onSelectTarget }: SkySceneProps) {
  const groupRef = useRef<Group>(null);
  const companionTargets = useMemo(
    () => layoutCompanionTargets(targets, selectedTarget, layoutMode),
    [targets, selectedTarget.id, layoutMode]
  );

  useFrame((state) => {
    if (!groupRef.current || !autoRotate) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.1;
    groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.09) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <SelectedScalePlate
        target={selectedTarget}
        position={SELECTED_SCENE_POSITION}
        fov={fov}
      />
      <TargetMarker
        target={selectedTarget}
        position={SELECTED_SCENE_POSITION}
        selected
        onSelect={() => onSelectTarget(selectedTarget.id)}
      />
      <Html fullscreen zIndexRange={[3, 2]} style={{ pointerEvents: "none" }}>
        <div className="sky-object-layer">
          {companionTargets.map(({ target, slot }) => (
            <button
              key={target.id}
              className="sky-object-thumb"
              style={
                {
                  "--target-tint": target.tint,
                  left: slot.left,
                  top: slot.top
                } as CSSProperties
              }
              type="button"
              title={`${target.catalogId} ${target.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectTarget(target.id);
              }}
            >
              <img src={target.imageUrl} alt="" draggable={false} />
            </button>
          ))}
        </div>
      </Html>
    </group>
  );
}

function layoutCompanionTargets(
  targets: Target[],
  selectedTarget: Target,
  layoutMode: "sky" | "showcase"
) {
  const companionTargets = targets.filter((target) => target.id !== selectedTarget.id);
  const orderedCompanions =
    layoutMode === "sky"
      ? sortByRelativeSkyAngle(companionTargets, selectedTarget)
      : companionTargets;

  return orderedCompanions.map((target, index) => ({
    target,
    slot: SKY_OBJECT_SLOTS[index % SKY_OBJECT_SLOTS.length]
  }));
}

function sortByRelativeSkyAngle(targets: Target[], selectedTarget: Target) {
  return [...targets].sort((left, right) => {
    const leftAngle = Math.atan2(
      left.position[1] - selectedTarget.position[1],
      left.position[0] - selectedTarget.position[0]
    );
    const rightAngle = Math.atan2(
      right.position[1] - selectedTarget.position[1],
      right.position[0] - selectedTarget.position[0]
    );
    return leftAngle - rightAngle;
  });
}

export function SkyScene(props: SkySceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 52 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={["#03040a"]} />
      <fog attach="fog" args={["#03040a", 6, 12]} />
      <ambientLight intensity={0.36} />
      <directionalLight position={[2, 2, 4]} intensity={1.2} color="#fff3d4" />
      <Stars radius={72} depth={36} count={2600} factor={4} saturation={0.55} fade speed={props.autoRotate ? 0.65 : 0} />
      <SkyObjects {...props} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.25}
        autoRotate={props.autoRotate}
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}
