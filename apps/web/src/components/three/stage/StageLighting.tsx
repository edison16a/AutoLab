"use client";
import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import type { Theme } from "@/hooks/use-theme";
import { STAGE_LOOKS } from "./stage-theme";

interface StageLightingProps {
  theme: Theme;
  /** Half width of the square the key light's shadow covers. Smaller is sharper. */
  shadowRadius: number;
}

/**
 * A softbox studio built from lightformers, so there is no HDR download.
 * The environment is rendered once per theme; after that it's a static
 * cube map and costs nothing per frame. One directional light adds
 * contact shading inside the enclosure.
 */
export function StageLighting({ theme, shadowRadius: r }: StageLightingProps) {
  const look = STAGE_LOOKS[theme];
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    gl.toneMappingExposure = look.exposure;
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, look, invalidate]);

  return (
    <>
      <Environment key={theme} resolution={128} frames={1} environmentIntensity={look.environment}>
        <color attach="background" args={[look.studio]} />
        <Lightformer form="rect" intensity={look.key} position={[0, 9, 3]} scale={[14, 9, 1]} />
        <Lightformer form="rect" intensity={look.fill} position={[-9, 3, 5]} scale={[8, 5, 1]} />
        <Lightformer form="rect" intensity={look.fill * 0.6} position={[9, 3, 5]} scale={[8, 5, 1]} />
        <Lightformer form="rect" intensity={look.rim} position={[0, 4, -10]} scale={[16, 4, 1]} />
      </Environment>
      <ambientLight intensity={look.ambient} />
      <directionalLight
        key={r}
        castShadow
        position={[6, 11, 7]}
        intensity={look.sun}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={4}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
    </>
  );
}
