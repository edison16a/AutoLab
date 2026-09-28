"use client";
import {
  Component,
  memo,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import AutolabModel from "./AutolabModel";
import SceneCamera from "./SceneCamera";
import ComponentConnections from "./ComponentConnections";
import { ModelResources } from "./models/Primitives";
import type { AutolabComponentState } from "./state/useAutolab3DState";
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function WebGLScene({
  children,
  camera = [8, 6.5, 10],
  onUnavailable,
}: {
  children: ReactNode;
  camera?: [number, number, number];
  onUnavailable?: () => void;
}) {
  const [supported, setSupported] = useState<boolean | null>(null),
    [lost, setLost] = useState(false);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    setSupported(!!context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  }, []);
  useEffect(() => {
    if (supported === false || lost) onUnavailable?.();
  }, [supported, lost, onUnavailable]);
  const fallback = (
    <div className="scene-fallback">
      <strong>3D view is unavailable in this browser.</strong>
      <p>
        Use the component list and setup instructions below. All device actions
        still work.
      </p>
    </div>
  );
  if (supported === null)
    return <div className="scene-loading">Preparing your Autolab…</div>;
  if (!supported || lost) return fallback;
  return (
    <SceneBoundary fallback={fallback}>
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: camera, fov: 38, near: 0.1, far: 80 }}
        gl={{
          antialias: true,
          powerPreference: "low-power",
          preserveDrawingBuffer: false,
        }}
        fallback={fallback}
        onCreated={({ gl }) => {
          gl.domElement.setAttribute(
            "aria-label",
            "Interactive 3D Autolab machine",
          );
          gl.domElement.addEventListener(
            "webglcontextlost",
            () => setLost(true),
            { once: true },
          );
        }}
      >
        <color attach="background" args={["#0b1119"]} />
        <ambientLight intensity={0.9} />
        <hemisphereLight args={["#d9eaff", "#35404b", 1.2]} />
        <directionalLight
          position={[3, 9, 5]}
          intensity={2.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
          shadow-bias={-0.001}
        />
        <directionalLight
          position={[-5, 4, -3]}
          intensity={1.5}
          color="#8cb6d1"
        />
        <Suspense fallback={null}>
          <ModelResources>{children}</ModelResources>
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}
export default memo(function AutolabScene({
  states,
  selected,
  exploded,
  connections,
  reset,
  onSelect,
}: {
  states: Record<string, AutolabComponentState>;
  selected: string | null;
  exploded: boolean;
  connections: boolean;
  reset: number;
  onSelect: (id: string) => void;
}) {
  return (
    <WebGLScene>
      <SceneCamera selected={selected} exploded={exploded} reset={reset} />
      <AutolabModel
        states={states}
        selected={selected}
        exploded={exploded}
        onSelect={onSelect}
      />
      {connections && (
        <ComponentConnections
          selected={selected}
          exploded={exploded}
          online={!!states.raspberry_pi.online}
        />
      )}
      <Grid
        position={[0, -0.3, 0]}
        args={[18, 18]}
        cellSize={0.5}
        sectionSize={2}
        cellColor="#1b2835"
        sectionColor="#273c50"
        fadeDistance={24}
        fadeStrength={1.5}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.31, 0]}
        receiveShadow
      >
        <planeGeometry args={[25, 25]} />
        <shadowMaterial opacity={0.2} />
      </mesh>
    </WebGLScene>
  );
});
