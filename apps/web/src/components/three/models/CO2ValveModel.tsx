"use client";
import { Block, Cylinder, Ring } from "../primitives";

/** A push-in tube fitting: threaded body, hex and the collet the tube goes into. Points along +X. */
function Fitting({ side }: { side: 1 | -1 }) {
  return (
    <group position={[side * 0.19, 0.08, 0]} rotation={[0, 0, -side * (Math.PI / 2)]}>
      <Cylinder position={[0, 0.02, 0]} radius={0.034} height={0.04} low material="steel" />
      <Cylinder position={[0, 0.055, 0]} radius={0.042} height={0.03} low material="aluminium" />
      <Ring position={[0, 0.074, 0]} radius={0.028} material="plasticGrey" />
    </group>
  );
}

/**
 * CO₂ solenoid valve: the brass body (drawn in aluminium) with a push-in
 * fitting each side, the armature tube and nut, and the black coil with
 * its DIN connector. The gas lines are plumbing, so the frame draws them
 * (machine/GasLines.tsx) and they stay put in the exploded view. Origin at
 * the bottom of the body, on the roof plate.
 */
export function CO2ValveModel() {
  return (
    <group>
      <Block position={[0, 0.08, 0]} size={[0.3, 0.16, 0.2]} radius={0.02} material="aluminium" />
      <Fitting side={-1} />
      <Fitting side={1} />
      <Block position={[0, 0.27, 0]} size={[0.2, 0.22, 0.2]} radius={0.03} material="plasticBlack" />
      <Cylinder position={[0, 0.4, 0]} radius={0.035} height={0.06} low material="steel" />
      <Cylinder position={[0, 0.43, 0]} radius={0.048} height={0.02} low material="steel" />
      {/* DIN plug with its retaining screw. */}
      <Block position={[0, 0.27, 0.15]} size={[0.14, 0.16, 0.1]} radius={0.015} material="plasticGrey" />
      <Cylinder position={[0, 0.27, 0.205]} rotation={[Math.PI / 2, 0, 0]} radius={0.016} height={0.012} low material="steel" />
    </group>
  );
}
