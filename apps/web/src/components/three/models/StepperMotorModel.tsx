"use client";
import { Block, Bolt, Cylinder } from "../primitives";

/** Real NEMA 17 face is 42.3 mm, about 0.52 units. */
const FACE = 0.52;
const BODY = 0.46;
const BOLTS: [number, number][] = [-1, 1].flatMap((x) => [-1, 1].map((z) => [x * 0.18, z * 0.18] as [number, number]));

/**
 * NEMA 17 stepper: black stator between two aluminium end caps, shaft and
 * coupler along +Y, connector on the side. Used for the pipette drive
 * (flipped, shaft down) and the gantry axes.
 */
export function StepperMotorModel() {
  return (
    <group>
      <Block size={[FACE - 0.02, BODY - 0.1, FACE - 0.02]} radius={0.03} material="plasticBlack" />
      {[-1, 1].map((side) => (
        <Block key={side} position={[0, side * (BODY / 2 - 0.035), 0]} size={[FACE, 0.07, FACE]} radius={0.035} material="aluminium" />
      ))}
      <Cylinder position={[0, BODY / 2 + 0.01, 0]} radius={0.14} height={0.02} material="aluminium" />
      <Cylinder position={[0, BODY / 2 + 0.1, 0]} radius={0.03} height={0.18} material="steel" />
      <Cylinder position={[0, BODY / 2 + 0.16, 0]} radius={0.065} height={0.1} material="aluminium" />
      {BOLTS.map(([x, z]) => (
        <Bolt key={`${x}${z}`} position={[x, BODY / 2 + 0.002, z]} radius={0.028} />
      ))}
      <Block position={[FACE / 2 + 0.03, -0.06, 0]} size={[0.06, 0.1, 0.18]} material="plasticWhite" />
    </group>
  );
}
