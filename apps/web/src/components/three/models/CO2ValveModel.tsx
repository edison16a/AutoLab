"use client";
import { Block, Cylinder, Ring, TextDecal } from "../primitives";

/** A brass push-in tube fitting: threaded body, hex and the black collet the tube goes into. Points along +X. */
function Fitting({ side }: { side: 1 | -1 }) {
  return (
    <group position={[side * 0.19, 0.08, 0]} rotation={[0, 0, -side * (Math.PI / 2)]}>
      <Cylinder position={[0, 0.02, 0]} radius={0.034} height={0.04} low material="brass" />
      <Cylinder position={[0, 0.055, 0]} radius={0.042} height={0.03} low material="brass" />
      <Ring position={[0, 0.074, 0]} radius={0.028} material="plasticBlack" />
    </group>
  );
}

/**
 * CO₂ solenoid valve: the brass body with a push-in fitting each side, the
 * plated armature tube and nut, and the black epoxy coil with its rating
 * label and black DIN connector. The gas lines are plumbing, so the frame
 * draws them (machine/GasLines.tsx) and they stay put in the exploded
 * view. Origin at the bottom of the body, on the roof plate.
 */
export function CO2ValveModel() {
  return (
    <group>
      <Block position={[0, 0.08, 0]} size={[0.3, 0.16, 0.2]} radius={0.02} material="brass" />
      <Fitting side={-1} />
      <Fitting side={1} />
      <Block position={[0, 0.27, 0]} size={[0.2, 0.22, 0.2]} radius={0.03} material="plasticBlack" />
      {/* Rating label on the coil's right side. */}
      <group position={[0.101, 0.27, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Block size={[0.13, 0.1, 0.002]} material="labelWhite" />
        <TextDecal text="12V DC" position={[0, 0, 0.002]} rotation={[0, 0, 0]} width={0.11} height={0.04} ink="dark" weight={700} />
      </group>
      <Cylinder position={[0, 0.4, 0]} radius={0.035} height={0.06} low material="steel" />
      <Cylinder position={[0, 0.43, 0]} radius={0.048} height={0.02} low material="steel" />
      {/* DIN plug with its retaining screw. */}
      <Block position={[0, 0.27, 0.15]} size={[0.14, 0.16, 0.1]} radius={0.015} material="plasticBlack" />
      <Cylinder position={[0, 0.27, 0.205]} rotation={[Math.PI / 2, 0, 0]} radius={0.016} height={0.012} low material="steel" />
    </group>
  );
}
