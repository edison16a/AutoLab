"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";

const ShadowRefresh = createContext<() => void>(() => undefined);

/**
 * Call the returned function whenever geometry moves (an exploded view
 * animating, a part appearing). Shadows are otherwise frozen, because
 * redrawing them on every camera move is most of the frame cost on
 * software GL and they don't change when only the camera moves.
 */
export function useShadowRefresh() {
  return useContext(ShadowRefresh);
}

/** How long shadows keep redrawing after the last refresh call. */
const SETTLE_MS = 300;

/**
 * The soft floor shadow, plus the switch that keeps both shadow passes frozen while nothing moves.
 * `scale` is the floor area it covers; keep it close to the subject so small
 * parts still get a defined shadow.
 */
interface StageShadowsProps {
  /** Contact shadow strength. */
  opacity: number;
  /** Strength of the key light's shadow on the floor. */
  castOpacity: number;
  scale: number;
  children: ReactNode;
}

export function StageShadows({ opacity, castOpacity, scale, children }: StageShadowsProps) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const [live, setLive] = useState(true);
  const liveRef = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    gl.shadowMap.needsUpdate = true;
    if (!liveRef.current) {
      liveRef.current = true;
      setLive(true);
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      liveRef.current = false;
      setLive(false);
      gl.shadowMap.needsUpdate = true;
      invalidate();
    }, SETTLE_MS);
    invalidate();
  }, [gl, invalidate]);

  useEffect(() => {
    refresh();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  return (
    <ShadowRefresh.Provider value={refresh}>
      {children}
      {/* Catches only the key light's shadow; the floor itself stays the page colour. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[scale * 2, scale * 2]} />
        <shadowMaterial transparent opacity={castOpacity} depthWrite={false} />
      </mesh>
      {/* frames={1} draws once more on each re-render, which is exactly the settle frame we want. */}
      <ContactShadows
        frames={live ? Infinity : 1}
        position={[0, 0.002, 0]}
        scale={scale}
        resolution={512}
        blur={4}
        far={2.4}
        opacity={opacity}
        color="#000000"
      />
    </ShadowRefresh.Provider>
  );
}
