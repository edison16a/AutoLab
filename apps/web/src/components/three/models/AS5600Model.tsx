"use client";
import { Board, Chip, Cylinder, Pins, Ring, TextDecal } from "../primitives";

/** AS5600 breakout with the diametric magnet held above the chip. */
export function AS5600Model() {
  return (
    <group>
      <Board size={[0.3, 0.03, 0.3]} />
      <Chip position={[0, 0.045, 0]} size={[0.085, 0.04, 0.075]} />
      <Cylinder position={[0, 0.15, 0]} radius={0.052} height={0.04} material="steel" />
      <Ring position={[0, 0.174, 0]} radius={0.04} material="plasticBlack" />
      <group position={[0, 0, -0.12]}>
        <Pins count={4} length={0.18} />
      </group>
      <TextDecal text="AS5600" position={[0, 0.017, 0.095]} width={0.18} height={0.03} />
    </group>
  );
}
