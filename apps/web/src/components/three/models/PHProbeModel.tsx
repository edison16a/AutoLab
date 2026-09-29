"use client";
import { Cylinder, Ring, Sphere, TextDecal } from "../primitives";

/** A lab pH probe: black body, grip rings, a guarded glass bulb at the tip. */
export function PHProbeModel() {
  return (
    <group>
      <Cylinder radius={0.065} height={0.6} material="plasticBlack" />
      {[0.18, 0.22, 0.26].map((y) => (
        <Ring key={y} position={[0, y, 0]} radius={0.066} material="graphite" />
      ))}
      <Sphere position={[0, -0.445, 0]} radius={0.037} material="glass" />
      <group position={[0, 0.03, 0.066]} rotation={[Math.PI / 2, 0, 0]}>
        <TextDecal text="pH" position={[0, 0, 0]} width={0.07} height={0.045} />
      </group>
      <Cylinder position={[0, -0.35, 0]} radius={0.035} height={0.15} material="plasticWhite" />
      <Cylinder position={[0, 0.35, 0]} radius={0.07} height={0.1} material="plasticGrey" />
    </group>
  );
}
