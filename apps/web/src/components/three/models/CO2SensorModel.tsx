"use client";
import { Block, Cylinder, TextDecal } from "../primitives";
import { Header } from "./details/Header";
import { Ic } from "./details/Ic";
import { Passives, type PassiveRun } from "./details/Passives";
import { Pcb } from "./details/Pcb";
import { mm } from "./details/units";

/** 57 x 51 mm, long along X, parts on +Y. The registry turns it to face the chamber. */
const L = mm(57);
const W = mm(51);
const T = mm(1.6);
const TOP = T / 2;
const HOLES = [-1, 1].flatMap((x) => [-1, 1].map((z) => ({ x: x * (L / 2 - mm(3.5)), z: z * (W / 2 - mm(3.5)), radius: mm(1.6) })));
/** The optical cell: a gold plated tube (drawn in aluminium) lying along X across the upper half. */
const CELL = { radius: mm(6.5), length: mm(42), z: -mm(9) } as const;
const CELL_Y = TOP + mm(1.5) + CELL.radius;
const RUNS: PassiveRun[] = [
  { from: [mm(-22), mm(3)], step: [0, mm(2.2)], count: 5, kind: "cap", turned: true },
  { from: [mm(4), mm(17)], step: [mm(2.4), 0], count: 5, kind: "res" },
  { from: [mm(18), mm(5)], step: [0, mm(2.2)], count: 4, kind: "cap", turned: true },
];

/** Printed standoffs that hold the board off the back wall rail. */
function Standoffs() {
  return (
    <>
      {HOLES.map((hole) => (
        <Cylinder key={`${hole.x}${hole.z}`} position={[hole.x, -TOP - mm(3), hole.z]} radius={mm(2.4)} height={mm(6)} low material="steel" />
      ))}
    </>
  );
}

/**
 * Senseair K33 ICB-F CO₂ module: the NDIR optical cell (lamp at one end,
 * the thermopile detector can at the other, the filter strip over its
 * diffusion holes) on its board, with the microcontroller, the analog front
 * end and the I²C and UART headers. Origin at the middle of the board.
 */
export function CO2SensorModel() {
  const { radius, length, z } = CELL;
  return (
    <group>
      <Pcb name="k33" size={[L, T, W]} holes={HOLES} corner={mm(2)} />
      <Standoffs />
      {/* Cell cradles, then the cell and its end caps. */}
      {[-1, 1].map((side) => (
        <Block key={side} position={[side * (length / 2 - mm(4)), TOP + mm(1.5), z]} size={[mm(3), mm(3), radius * 1.8]} material="plasticBlack" />
      ))}
      <Cylinder position={[0, CELL_Y, z]} rotation={[0, 0, Math.PI / 2]} radius={radius} height={length} material="aluminium" />
      <Cylinder position={[-length / 2 - mm(2), CELL_Y, z]} rotation={[0, 0, Math.PI / 2]} radius={radius * 0.9} height={mm(4)} material="plasticBlack" />
      <Cylinder position={[length / 2 + mm(2.5), CELL_Y, z]} rotation={[0, 0, Math.PI / 2]} radius={mm(4.6)} height={mm(5)} material="steel" />
      {/* The ICB-F's filter strip over the diffusion holes along the top of the cell. */}
      <Block position={[0, CELL_Y + radius - mm(0.6), z]} size={[mm(26), mm(1.2), mm(7)]} radius={mm(0.3)} material="plasticWhite" />
      <TextDecal text="Senseair K33" position={[0, CELL_Y, z + radius + 0.0004]} rotation={[0, 0, 0]} width={mm(24)} height={mm(3.4)} ink="dark" weight={600} />
      <Ic position={[mm(-8), TOP, mm(8)]} body={[mm(7), mm(7)]} leads={8} style="qfp" />
      <Ic position={[mm(8), TOP, mm(8)]} body={[mm(4.9), mm(3.9)]} leads={4} />
      <Passives runs={RUNS} top={TOP} />
      <Header position={[mm(-4), TOP, W / 2 - mm(3)]} count={5} board={T} />
      <Header position={[mm(14), TOP, W / 2 - mm(3)]} count={4} board={T} />
      <TextDecal text="ICB-F 10%" position={[mm(-4), TOP + 0.0004, mm(15)]} width={mm(14)} height={mm(2)} weight={500} />
    </group>
  );
}
