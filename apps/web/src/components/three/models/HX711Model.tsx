"use client";
import { Board, Chip, Pins, TextDecal } from "../primitives";

/** HX711 load cell amplifier: one chip, bridge pins on one edge and the digital pins on the other. */
export function HX711Model() {
  return (
    <group>
      <Board size={[0.4, 0.03, 0.27]} />
      <Chip position={[0, 0.045, 0]} size={[0.15, 0.035, 0.1]} />
      <TextDecal text="HX711" position={[0, 0.066, 0]} width={0.13} height={0.03} />
      <group position={[0, 0, -0.1]}>
        <Pins count={6} length={0.25} />
      </group>
      <group position={[0, 0, 0.1]}>
        <Pins count={4} length={0.25} />
      </group>
    </group>
  );
}
