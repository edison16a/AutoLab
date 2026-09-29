"use client";
import "@/styles/hardware-stage.css";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { Canvas, events as pointerEvents } from "@react-three/fiber";
import { NeutralToneMapping, PCFShadowMap, type WebGLRenderer } from "three";
import { useTheme } from "@/hooks/use-theme";
import { releaseResources, retainResources } from "./resources";
import { preferInnerHits } from "./stage/pick-filter";
import { StageBoundary, StageFallback } from "./stage/StageFallback";
import { StageLighting } from "./stage/StageLighting";
import { StageShadows } from "./stage/StageShadows";
import { STAGE_LOOKS } from "./stage/stage-theme";
import { useWebGLSupport } from "./stage/webgl";
import type { Vec3 } from "./types";

export interface StageProps {
  children: ReactNode;
  /** Accessible name for the canvas, such as "3D model of the Autolab". */
  label: string;
  className?: string;
  /** Where the camera starts. Focus controls usually take over at once. */
  cameraPosition?: Vec3;
  fov?: number;
  /** Half size of the area the key light's shadow covers, in scene units. */
  shadowRadius?: number;
  /** A click that hit nothing selectable. */
  onPointerMissed?: () => void;
}

// Stable objects, so the canvas never reconfigures the renderer on re-render.
const GL = { antialias: true, alpha: true, stencil: true, powerPreference: "high-performance", toneMapping: NeutralToneMapping } as const;
// The shadow map only redraws when told to (see StageShadows).
const SHADOWS = { enabled: true, type: PCFShadowMap, autoUpdate: false } as const;
const DPR: [number, number] = [1, 1.75];

function createEvents(store: Parameters<typeof pointerEvents>[0]) {
  return { ...pointerEvents(store), filter: preferInnerHits };
}

/**
 * The canvas every 3D view is drawn in. Renders on demand only, follows the
 * light and dark theme, lights the scene as a softbox studio with a soft
 * floor shadow, and falls back to one plain sentence when WebGL is missing
 * or the context is lost. The canvas background is transparent, so the
 * surrounding CSS (tokens) decides the backdrop colour.
 */
export function Stage({ children, label, className = "", cameraPosition = [8, 6, 10], fov = 32, shadowRadius = 5.5, onPointerMissed }: StageProps) {
  const supported = useWebGLSupport();
  const [lost, setLost] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    retainResources();
    return releaseResources;
  }, []);

  const onCreated = useCallback(
    ({ gl }: { gl: WebGLRenderer }) => {
      gl.domElement.setAttribute("aria-label", label);
      gl.domElement.setAttribute("role", "img");
      gl.domElement.addEventListener(
        "webglcontextlost",
        (event) => {
          event.preventDefault();
          setLost(true);
        },
        { once: true },
      );
    },
    [label],
  );

  const unavailable = supported === false || lost;
  let content: ReactNode = null;
  if (unavailable) content = <StageFallback />;
  else if (supported)
    content = (
      <StageBoundary>
        <Canvas
          frameloop="demand"
          dpr={DPR}
          gl={GL}
          shadows={SHADOWS}
          camera={{ position: cameraPosition, fov, near: 0.05, far: 150 }}
          events={createEvents}
          onCreated={onCreated}
          onPointerMissed={onPointerMissed}
          // Rendered inside <canvas>, so it only ever shows where canvas itself is unsupported.
          fallback={<StageFallback />}
        >
          <StageLighting theme={theme} shadowRadius={shadowRadius} />
          <StageShadows opacity={STAGE_LOOKS[theme].shadowOpacity} castOpacity={STAGE_LOOKS[theme].castShadowOpacity} scale={shadowRadius * 3.6}>
            <Suspense fallback={null}>{children}</Suspense>
          </StageShadows>
        </Canvas>
      </StageBoundary>
    );

  return (
    <div className={`stage3d${unavailable ? " stage3d--unavailable" : ""} ${className}`} aria-busy={supported === null}>
      {content}
    </div>
  );
}
