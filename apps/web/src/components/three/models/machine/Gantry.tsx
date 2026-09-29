"use client";
import { Block, Cylinder } from "../../primitives";
import { StepperMotorModel } from "../StepperMotorModel";
import { Extrusion } from "./Extrusion";

/** Where the gantry sits: two uprights behind the plate, joined at the top. */
export const GANTRY = { halfX: 1.85, z: -0.55, top: 4.03, beamY: 3.05, beamZ: -0.31 } as const;

const { halfX: X, z: Z, top: TOP, beamY: BEAM_Y, beamZ: BEAM_Z } = GANTRY;
const FOOT_Y = 0.56;

/**
 * The printer's motion system, reshaped as an arch over the plate: Y rods
 * on the floor carry two uprights, a crossbar ties them together, and the X
 * beam rides up and down between them carrying the pipette tool.
 */
export function Gantry() {
  const uprightLength = TOP - (FOOT_Y + 0.07);
  return (
    <group>
      {[-X, X].map((x) => (
        <group key={x}>
          {/* Y rod with its end supports, and the carriage block the upright stands on. */}
          <Cylinder position={[x, FOOT_Y - 0.04, Z + 0.1]} rotation={[Math.PI / 2, 0, 0]} radius={0.035} height={2.3} material="steel" />
          {[Z - 1.02, Z + 1.22].map((z) => (
            <Block key={z} position={[x, FOOT_Y - 0.05, z]} size={[0.2, 0.14, 0.1]} radius={0.02} material="aluminium" />
          ))}
          <Block position={[x, FOOT_Y, Z]} size={[0.3, 0.14, 0.44]} radius={0.03} material="aluminium" />
          <Extrusion position={[x, FOOT_Y + 0.07 + uprightLength / 2, Z]} length={uprightLength} profile="2040" />
          {/* End plates that carry the X beam. */}
          <Block position={[x, BEAM_Y, BEAM_Z - 0.06]} size={[0.34, 0.5, 0.05]} radius={0.02} material="aluminium" />
        </group>
      ))}
      <Extrusion position={[0, TOP + 0.08, Z]} length={X * 2 + 0.16} axis="x" profile="2040" />
      <Extrusion position={[0, BEAM_Y, BEAM_Z]} length={X * 2 - 0.16} axis="x" profile="2040" />
      {/* X belt along the front of the beam. */}
      <Block position={[0, BEAM_Y + 0.1, BEAM_Z + 0.085]} size={[X * 2 - 0.5, 0.04, 0.01]} material="rubber" />
      {/* Z drive: motor at the foot of the left upright, lead screw up its back. */}
      <group position={[-X, 0.95, Z - 0.44]}>
        <StepperMotorModel />
      </group>
      <Cylinder position={[-X, 2.55, Z - 0.44]} radius={0.028} height={2.9} low material="steel" />
      {/* X drive behind the left end of the beam, shaft forward through it, next to the X endstop. */}
      <group position={[-X + 0.4, BEAM_Y, BEAM_Z - 0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <StepperMotorModel />
      </group>
    </group>
  );
}
