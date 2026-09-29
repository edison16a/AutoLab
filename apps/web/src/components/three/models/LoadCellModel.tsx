"use client";
import { castsShadow, getMaterial } from "../materials";
import { Block, Cylinder, TextDecal, Tube } from "../primitives";
import type { Vec3 } from "../types";
import { binocularBar } from "./geometry/shapes";
import { mm } from "./details/units";

/** A 12.7 mm square bar, shortened to fit the tool, standing on Y. */
const SIDE = mm(12.7);
const LENGTH = 0.6;
const HOLE = { radius: mm(4.6), offset: mm(4.8), slot: mm(1.1) } as const;
/** Two tapped holes at each end, through the side faces. */
const BOLTS = [-1, 1].flatMap((end) => [0.2, 0.25].map((d) => end * d));
/** The four bridge leads in the standard colours: red E+, black E-, white A- and green A+. */
const LEADS = ["wireRed", "wireBlack", "wireWhite", "wireGreen"] as const;

/**
 * A lead leaving the potting on the +X face and running down to the
 * HX711's bridge header, which sits below and to the right on the tool.
 */
function leadPath(index: number): Vec3[] {
  const z = (index - 1.5) * mm(1.4);
  const x = SIDE / 2 + mm(2);
  return [
    [x, 0.02, z],
    [x + 0.04, 0.05, z],
    [x + 0.09, -0.08, z * 1.6],
    [x + 0.16, -0.32, z * 2],
    [0.3, -0.47, z * 3],
  ];
}

/**
 * The 1 kg straight bar load cell in line between the nut block and the
 * plunger: a bead blasted aluminium bar with the binocular cut through its front,
 * the strain gauges under white potting on both sides, tapped holes at
 * each end, the capacity printed on the face and the four coloured bridge
 * leads. Origin at its centre.
 */
export function LoadCellModel() {
  return (
    <group>
      <mesh
        geometry={binocularBar(SIDE, LENGTH, SIDE, HOLE.radius, HOLE.offset, HOLE.slot)}
        material={getMaterial("aluminiumBlasted")}
        castShadow={castsShadow("aluminiumBlasted")}
        receiveShadow
        dispose={null}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[side * (SIDE / 2 + mm(0.5)), 0, 0]} size={[mm(1.2), HOLE.offset * 2 + HOLE.radius * 2.2, SIDE * 0.72]} radius={mm(0.5)} material="plasticWhite" />
          {BOLTS.map((y) => (
            <Cylinder key={y} position={[side * (SIDE / 2 + 0.0004), y, 0]} rotation={[0, 0, Math.PI / 2]} radius={mm(2)} height={0.002} low material="plasticBlack" />
          ))}
        </group>
      ))}
      <TextDecal text="1 kg" position={[0, 0.19, SIDE / 2 + 0.0006]} rotation={[0, 0, 0]} width={SIDE * 0.7} height={0.03} ink="dark" weight={700} />
      {LEADS.map((material, i) => (
        <Tube key={material} points={leadPath(i)} radius={mm(0.6)} material={material} segments={24} />
      ))}
    </group>
  );
}
