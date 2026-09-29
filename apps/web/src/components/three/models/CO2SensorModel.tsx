"use client";
import { Block, Board, Bolt, Pins, Repeat, TextDecal, type RepeatItem } from "../primitives";

const SLOTS: RepeatItem[] = [-0.18, -0.06, 0.06, 0.18].map((x) => ({ position: [x, 0.26, 0] }));
const CORNERS: [number, number][] = [-0.24, 0.24].flatMap((x) => [-0.14, 0.14].map((z) => [x, z] as [number, number]));

/** Senseair K33: a board carrying the metal optical cell, with a header along one edge. */
export function CO2SensorModel() {
  return (
    <group>
      <Board size={[0.72, 0.04, 0.5]} />
      <Block position={[0, 0.14, 0]} size={[0.56, 0.23, 0.35]} radius={0.02} material="aluminium" />
      <TextDecal text="Senseair K33" position={[0, 0.258, -0.12]} width={0.39} height={0.04} ink="dark" />
      {CORNERS.map(([x, z]) => (
        <Bolt key={`${x}${z}`} position={[x, 0.26, z]} radius={0.018} />
      ))}
      <Repeat items={SLOTS} material="plasticBlack" scale={[0.045, 0.012, 0.23]} />
      <group position={[0, 0.05, 0.22]}>
        <Pins count={6} length={0.4} />
      </group>
    </group>
  );
}
