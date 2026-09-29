"use client";
import { Block, Cylinder, TextDecal } from "../primitives";
import type { Vec3 } from "../types";
import { Electrolytic, Jst, MicroUsb, ScrewTerminal } from "./details/Connectors";
import { DriverModules } from "./details/DriverModule";
import { Ic } from "./details/Ic";
import { Passives, type PassiveRun } from "./details/Passives";
import { Pcb } from "./details/Pcb";
import { mm } from "./details/units";
import type { PartModelProps } from "./model-props";

/** A 96 x 66 mm printer mainboard, long along X. Motor sockets face the front (+Z). */
const L = mm(96);
const W = mm(66);
const T = mm(1.6);
const TOP = T / 2;
const HOLES = [-1, 1].flatMap((x) => [-1, 1].map((z) => ({ x: x * (L / 2 - mm(3.5)), z: z * (W / 2 - mm(3.5)), radius: mm(1.6) })));
const AXES = ["X", "Y", "Z", "E"];
const DRIVER_X = [-26, -8, 10, 28].map(mm);
const DRIVERS: Vec3[] = DRIVER_X.map((x) => [x, TOP, mm(-9)]);
const RUNS: PassiveRun[] = [
  { from: [mm(-38), mm(10)], step: [0, mm(2)], count: 5, kind: "cap", turned: true },
  { from: [mm(-17), mm(10)], step: [0, mm(2)], count: 4, kind: "res", turned: true },
  { from: [mm(-33), mm(6.5)], step: [mm(2.4), 0], count: 6, kind: "res" },
  { from: [mm(-8), mm(17)], step: [mm(2.4), 0], count: 5, kind: "cap" },
];

/**
 * The printer's mainboard running Marlin: four plug-in stepper drivers
 * under finned heatsinks, the 32-bit MCU, motor, endstop and fan sockets,
 * screw terminals for power and the heater, bulk capacitors, the heater
 * MOSFETs, USB and the microSD slot. It drives the X, Y and Z motors.
 * Origin at the middle of the board.
 */
export function PrinterControllerModel({ live = false }: PartModelProps) {
  return (
    <group>
      <Pcb name="mainboard" size={[L, T, W]} holes={HOLES} corner={mm(2)} />
      {HOLES.map((hole) => (
        <Cylinder key={`${hole.x}${hole.z}`} position={[hole.x, -TOP - mm(1.5), hole.z]} radius={mm(2.6)} height={mm(3)} low material="steel" />
      ))}
      <DriverModules spots={DRIVERS} labels={AXES} />
      {DRIVER_X.map((x) => (
        <Jst key={x} position={[x, TOP, W / 2 - mm(4)]} count={4} />
      ))}
      <Ic position={[mm(-27), TOP, mm(16)]} body={[mm(10), mm(10)]} leads={16} style="qfp" label="32-BIT MCU" />
      <Passives runs={RUNS} top={TOP} />
      {[mm(0), mm(11), mm(22)].map((z) => (
        <Jst key={z} position={[L / 2 - mm(4), TOP, z]} count={3} rotation={Math.PI / 2} />
      ))}
      <ScrewTerminal position={[L / 2 - mm(4.5), TOP, mm(-22)]} count={2} rotation={Math.PI / 2} />
      <ScrewTerminal position={[L / 2 - mm(4.5), TOP, mm(-10)]} count={2} rotation={Math.PI / 2} />
      <Electrolytic position={[mm(28), TOP, mm(15)]} radius={mm(4)} height={mm(10)} />
      <Electrolytic position={[mm(18), TOP, mm(15)]} radius={mm(3.2)} height={mm(8)} />
      {[mm(27), mm(33)].map((x) => (
        <group key={x} position={[x, TOP, mm(-27)]}>
          <Block position={[0, mm(1.1), 0]} size={[mm(5), mm(2.3), mm(5.5)]} material="plasticBlack" />
          <Block position={[0, mm(0.3), mm(-3)]} size={[mm(5.2), mm(0.6), mm(1.6)]} material="steel" />
        </group>
      ))}
      <MicroUsb position={[-L / 2 + mm(3), TOP, mm(-20)]} rotation={-Math.PI / 2} />
      <Block position={[-L / 2 + mm(7), TOP + mm(1), mm(-6)]} size={[mm(14), mm(2), mm(15)]} radius={mm(0.3)} material="steel" />
      <Block position={[-L / 2 + mm(1.2), TOP + mm(1), mm(-6)]} size={[mm(2.4), mm(1.2), mm(11)]} material="plasticBlack" />
      <Block position={[mm(-14), TOP + mm(0.3), mm(24)]} size={[mm(1.6), mm(0.6), mm(0.8)]} material={live ? "ledOn" : "ledOff"} />
      <TextDecal text="MAINBOARD" position={[mm(4), TOP + 0.0004, mm(24)]} width={mm(22)} height={mm(3.2)} weight={600} />
    </group>
  );
}
