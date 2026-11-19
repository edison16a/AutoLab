"use client";
import { HideWhenExploded } from "../../explode/ExplodeContext";
import { Block, Cylinder, Tube } from "../../primitives";
import type { Vec3 } from "../../types";

/**
 * Where the CO₂ valve sits (its registry position) and the ends of its two
 * push-in fittings, so the lines start exactly at the valve.
 */
const VALVE: Vec3 = [-1.95, 4.41, 1.45];
const at = (dx: number, dy: number, dz: number): Vec3 => [VALVE[0] + dx, VALVE[1] + dy, VALVE[2] + dz];

/**
 * Supply from the regulator: up the outside of the back left post, forward
 * along the outside of the left top rail and into the valve's left fitting.
 * It keeps clear of the front left corner, where the fluid lines pass the
 * pump panel.
 */
const SUPPLY: Vec3[] = [
  at(-0.26, 0.08, 0),
  at(-0.4, 0.07, 0),
  at(-0.47, -0.08, -0.12),
  [-2.42, 4.34, 0.4],
  [-2.42, 4.34, -1.6],
  [-2.42, 4.15, -1.99],
  [-2.42, 2.2, -1.99],
  [-2.42, 0.35, -1.99],
  [-2.4, 0.09, -2.16],
];
/** Dosing line: out of the right fitting, through the roof grommet and down beside the front left post. */
const DOSING: Vec3[] = [at(0.26, 0.08, 0), at(0.34, 0.06, 0), at(0.33, -0.3, 0.06), at(0.1, -0.7, 0.16), at(-0.12, -1.3, 0.21), at(-0.12, -3.3, 0.21), at(-0.1, -3.74, 0.18)];
/** Clips that hold the dosing line to the post on its way down. */
const CLIPS = [-1.6, -2.4, -3.1].map((dy) => at(-0.13, dy, 0.22));
const DIFFUSER = at(-0.1, -3.8, 0.18);

/**
 * The CO₂ gas lines in clear PU tubing: the supply up the outside of the
 * back left post and along the left top rail, and the dosing line clipped down the front left post to a
 * diffuser stone just above the chamber floor, as in the system design
 * sketch.
 */
export function GasLines() {
  // Like the wiring, the lines stay on the frame while the valve lifts away, so they hide in the exploded view.
  return (
    <HideWhenExploded>
      <Tube points={SUPPLY} radius={0.026} material="tubing" segments={64} />
      <Tube points={DOSING} radius={0.026} material="tubing" segments={64} />
      {CLIPS.map((position) => (
        <Block key={position[1]} position={position} size={[0.1, 0.04, 0.1]} radius={0.012} material="plasticBlack" />
      ))}
      <Cylinder position={DIFFUSER} radius={0.045} height={0.12} material="aluminium" />
      <Cylinder position={[DIFFUSER[0], DIFFUSER[1] - 0.07, DIFFUSER[2]]} radius={0.05} height={0.03} low material="plasticGrey" />
    </HideWhenExploded>
  );
}
