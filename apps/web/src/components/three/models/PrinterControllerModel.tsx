"use client";
import { Block, Board, Chip, Cylinder, Pins, Repeat, TextDecal, type RepeatItem } from "../primitives";

const DRIVERS = [-0.3, 0, 0.3];
// Finned heatsinks on top of the three stepper drivers.
const FINS: RepeatItem[] = DRIVERS.flatMap((x) => [-0.055, -0.018, 0.018, 0.055].map((z) => ({ position: [x, 0.19, -0.2 + z] })));

/** The printer mainboard (Marlin) that drives the X, Y and Z motors. */
export function PrinterControllerModel() {
  return (
    <group>
      <Board size={[1, 0.04, 0.6]} />
      <Chip position={[0, 0.065, 0]} size={[0.23, 0.07, 0.23]} />
      <TextDecal text="MOTION CONTROL" position={[0, 0.023, 0.19]} width={0.6} height={0.05} />
      {DRIVERS.map((x) => (
        <Block key={x} position={[x, 0.11, -0.2]} size={[0.17, 0.14, 0.17]} material="plasticGrey" />
      ))}
      <Repeat items={FINS} material="aluminium" scale={[0.14, 0.055, 0.013]} />
      {[-0.38, 0.38].map((x) => (
        <Cylinder key={x} position={[x, 0.085, 0.07]} radius={0.04} height={0.12} material="plasticBlack" />
      ))}
      <group position={[0, 0, 0.25]}>
        <Pins count={16} length={0.85} />
      </group>
    </group>
  );
}
