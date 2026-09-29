"use client";
import { Block, Pins, Repeat, TextDecal, type RepeatItem } from "../primitives";

const VENTS: RepeatItem[] = [-0.05, -0.025, 0, 0.025, 0.05].map((x) => ({ position: [x, 0.21, 0.081] }));

/** Sensirion SHT85 temperature and humidity sensor: a slim board under a white filter cap, pins down. */
export function SHT85Model() {
  return (
    <group>
      <Block size={[0.14, 0.4, 0.1]} radius={0.01} material="pcbGraphite" />
      <Block position={[0, 0.19, 0]} size={[0.18, 0.13, 0.16]} radius={0.02} material="plasticWhite" />
      <Repeat items={VENTS} material="plasticBlack" scale={[0.012, 0.065, 0.004]} />
      <group rotation={[Math.PI / 2, 0, 0]}>
        <TextDecal text="SHT85" position={[0, 0.052, -0.02]} width={0.11} height={0.03} />
      </group>
      <group position={[0, -0.25, 0]} rotation={[0, 0, Math.PI]}>
        <Pins count={4} length={0.12} />
      </group>
    </group>
  );
}
