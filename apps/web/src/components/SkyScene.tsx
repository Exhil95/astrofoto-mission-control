import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { FovResult } from "../lib/fov";
import type { Target } from "../lib/targets";

type SkySceneProps = {
  targets: Target[];
  selectedTarget: Target;
  fov: FovResult;
  autoRotate: boolean;
  onSelectTarget: (targetId: string) => void;
};

function NebulaField({ tint, autoRotate }: { tint: string; autoRotate: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !autoRotate) return;
    meshRef.current.rotation.z = state.clock.elapsedTime * 0.04;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.08;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -1.4]}>
      <planeGeometry args={[8.6, 5.4, 48, 48]} />
      <meshBasicMaterial color={tint} transparent opacity={0.08} side={THREE.DoubleSide} />
    </mesh>
  );
}

function TargetMarker({
  target,
  selected,
  onSelect
}: {
  target: Target;
  selected: boolean;
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(target.tint), [target.tint]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const pulse = selected ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08 : 1;
    groupRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={groupRef} position={target.position} onClick={onSelect}>
      <mesh>
        <sphereGeometry args={[selected ? 0.11 : 0.075, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 2.5 : 1.1} />
      </mesh>
      {selected && (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.38, 0.01, 8, 80]} />
            <meshBasicMaterial color={target.tint} transparent opacity={0.9} />
          </mesh>
          <pointLight color={target.tint} intensity={2.2} distance={3.6} />
        </>
      )}
    </group>
  );
}

function FovFrame({ target, fov, autoRotate }: { target: Target; fov: FovResult; autoRotate: boolean }) {
  const frameRef = useRef<THREE.Group>(null);
  const width = Math.max(0.55, Math.min(2.9, fov.horizontalDeg * 0.62));
  const height = Math.max(0.38, Math.min(2.0, fov.verticalDeg * 0.62));

  useFrame((state) => {
    if (!frameRef.current || !autoRotate) return;
    frameRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.35) * 0.06;
  });

  return (
    <group ref={frameRef} position={[target.position[0], target.position[1], target.position[2] + 0.03]}>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
        <lineBasicMaterial color="#f7c873" transparent opacity={0.95} />
      </lineSegments>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#f7c873" transparent opacity={0.055} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SkyObjects({ targets, selectedTarget, fov, autoRotate, onSelectTarget }: SkySceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current || !autoRotate) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.1;
    groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.09) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <NebulaField tint={selectedTarget.tint} autoRotate={autoRotate} />
      {targets.map((target) => (
        <TargetMarker
          key={target.id}
          target={target}
          selected={target.id === selectedTarget.id}
          onSelect={() => onSelectTarget(target.id)}
        />
      ))}
      <FovFrame target={selectedTarget} fov={fov} autoRotate={autoRotate} />
    </group>
  );
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
