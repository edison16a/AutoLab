"use client";
import { Block, Cylinder, TextDecal } from "../primitives";

/**
 * P1000 air displacement pipette standing on its tip: filtered tip,
 * ejector sleeve, white body with the volume window, plunger on top.
 * Origin is on the body axis, about a third of the way up.
 */
export function PipetteModel() {
  return (
    <group>
      <Cylinder position={[0, 0.48, 0]} radius={0.11} height={0.62} material="plasticWhite" />
      <Cylinder position={[0, 0.84, 0]} radius={0.08} height={0.13} material="aluminium" />
      <Cylinder position={[0, 0.94, 0]} radius={0.145} height={0.065} material="plasticGrey" />
      <Block position={[0.12, 0.68, 0]} size={[0.16, 0.08, 0.17]} radius={0.03} material="plasticWhite" />
      <Block position={[0, 0.5, 0.106]} size={[0.13, 0.18, 0.022]} radius={0.008} material="plasticBlack" />
      <TextDecal text="1000" position={[0, 0.5, 0.118]} rotation={[0, 0, 0]} width={0.1} height={0.04} />
      <Cylinder position={[0, 0.09, 0]} radius={0.069} height={0.19} material="plasticWhite" />
      <Cylinder position={[0, -0.07, 0]} radius={0.044} height={0.16} material="steel" />
      {/* The tip narrows to a point, so its top radius is five times the bottom one. */}
      <Cylinder position={[0, -0.27, 0]} radius={0.009} taper={5.1} height={0.26} material="glass" />
      <Cylinder position={[0.08, 0.04, 0]} radius={0.016} height={0.42} low material="steel" />
    </group>
  );
}
