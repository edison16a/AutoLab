"use client";
import { Block, Cylinder, TextDecal } from "../primitives";
import type { Vec3 } from "../types";
import { Header } from "./details/Header";
import { Ic } from "./details/Ic";
import { Passives, type PassiveRun } from "./details/Passives";
import { Pcb } from "./details/Pcb";
import { mm } from "./details/units";

/** The isolated carrier is about 44 x 32 mm, BNC on the -X edge, parts on +Y. */
const L = mm(44);
const W = mm(32);
const T = mm(1.6);
const TOP = T / 2;
const HOLES = [-1, 1].flatMap((x) => [-1, 1].map((z) => ({ x: x * (L / 2 - mm(3)), z: z * (W / 2 - mm(3)), radius: mm(1.6) })));
/** The EZO circuit: 13.97 x 20.16 mm, plugged in on two sockets. */
const EZO = { x: mm(6), width: mm(14), length: mm(20.2), socket: mm(8.5) } as const;
const RUNS: PassiveRun[] = [
  { from: [mm(1), mm(-11)], step: [mm(2.4), 0], count: 4, kind: "cap" },
  { from: [mm(1), mm(11)], step: [mm(2.4), 0], count: 3, kind: "res" },
];

/** A right angle PCB BNC jack: square metal base, the barrel with its two bayonet studs, the PTFE insulator and centre pin. */
function Bnc({ position }: { position: Vec3 }) {
  const axis = mm(5.5);
  return (
    <group position={position}>
      <Block position={[0, axis, 0]} size={[mm(10), mm(11), mm(11)]} radius={mm(0.6)} material="steel" />
      <group position={[-mm(5), axis, 0]} rotation={[0, 0, Math.PI / 2]}>
        <Cylinder position={[0, mm(5), 0]} radius={mm(4.8)} height={mm(10)} material="steel" />
        <Cylinder position={[0, mm(8), 0]} radius={mm(1)} height={mm(2.4)} rotation={[Math.PI / 2, 0, 0]} low material="steel" />
        <Cylinder position={[0, mm(10.05), 0]} radius={mm(3.6)} height={mm(0.2)} material="plasticWhite" />
        <Cylinder position={[0, mm(10.1), 0]} radius={mm(0.7)} height={mm(0.4)} low material="aluminium" />
      </group>
    </group>
  );
}

/** The EZO-pH circuit standing on its sockets, with its label. */
function EzoCircuit() {
  const top = TOP + EZO.socket;
  return (
    <group position={[EZO.x, 0, 0]}>
      {[-1, 1].map((side) => (
        <Header key={side} position={[side * (EZO.length / 2 - mm(1.5)), TOP, 0]} count={side < 0 ? 5 : 2} along="z" female tailLength={0} />
      ))}
      <Block position={[0, top + T / 2, 0]} size={[EZO.length, T, EZO.width]} radius={mm(0.6)} material="pcbWhite" />
      <Ic position={[mm(1), top + T, 0]} body={[mm(7), mm(7)]} leads={8} style="qfp" />
      <TextDecal text="EZO pH" position={[mm(-6.5), top + T + 0.0004, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} width={mm(9)} height={mm(2.6)} ink="dark" weight={700} />
    </group>
  );
}

/**
 * Atlas Scientific EZO-pH on its electrically isolated carrier: the BNC
 * jack the probe cable screws onto, the isolation chip and its DC-DC
 * converter, the EZO circuit on two sockets, and the data header.
 * Standoffs hold it off the electronics box floor. Origin at the middle of
 * the carrier.
 */
export function PHModuleModel() {
  return (
    <group>
      <Pcb name="ezo-carrier" size={[L, T, W]} holes={HOLES} corner={mm(1.5)} />
      {HOLES.map((hole) => (
        <Cylinder key={`${hole.x}${hole.z}`} position={[hole.x, -TOP - mm(5.5), hole.z]} radius={mm(2.4)} height={mm(11)} low material="steel" />
      ))}
      <Bnc position={[-L / 2 + mm(5), TOP, 0]} />
      <Ic position={[mm(-6), TOP, mm(-11.5)]} body={[mm(10.3), mm(7.5)]} leads={8} label="ISO" />
      <Block position={[mm(-7), TOP + mm(2.5), mm(11)]} size={[mm(8), mm(5), mm(5)]} radius={mm(0.4)} material="plasticBlack" />
      <Passives runs={RUNS} top={TOP} />
      <EzoCircuit />
      <Header position={[L / 2 - mm(2), TOP, 0]} count={5} along="z" board={T} />
      <TextDecal text="pH" position={[-L / 2 + mm(5), TOP + 0.0004, mm(9)]} width={mm(4)} height={mm(2.4)} weight={700} />
      <TextDecal text={"GND  TX  RX  VCC  OFF"} position={[L / 2 - mm(4.6), TOP + 0.0004, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} width={mm(14)} height={mm(1.4)} weight={500} />
    </group>
  );
}
