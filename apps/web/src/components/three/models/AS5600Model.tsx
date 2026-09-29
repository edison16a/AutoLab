"use client";
import { Cylinder, TextDecal } from "../primitives";
import { Header } from "./details/Header";
import { Ic } from "./details/Ic";
import { Passives, type PassiveRun } from "./details/Passives";
import { Pcb } from "./details/Pcb";
import { mm } from "./details/units";

/**
 * The common 23 mm square white breakout, held on standoffs 9.5 mm above
 * the motor's back face. That leaves the chip about 2.6 mm over the magnet
 * through the board, inside the sensor's working range.
 */
const SIDE = mm(23);
const T = mm(1.6);
const LIFT = mm(9.5);
const BOARD_Y = LIFT + T / 2;
const HOLES = [-1, 1].map((x) => ({ x: x * mm(8), z: mm(6.5), radius: mm(1.6) }));
const PIN_LABELS = "VCC OUT GND DIR SCL SDA GPO";
const RUNS: PassiveRun[] = [
  { from: [mm(-4.5), mm(-1.2)], step: [0, mm(2.4)], count: 2, kind: "cap", turned: true },
  { from: [mm(4.5), mm(-1.2)], step: [0, mm(2.4)], count: 2, kind: "res", turned: true },
];

/**
 * AS5600 magnetic encoder on the back of the pipette motor, like the white
 * board in the team's photo: black SOIC chip in the middle with its two
 * decoupling caps and pull ups, gold pads, dark print and the seven pin
 * header pointing up. A nickel plated diametric magnet sits on the rear
 * shaft right under the chip. Origin at the centre of the motor's back face.
 */
export function AS5600Model() {
  return (
    <group>
      <Cylinder position={[0, mm(3), 0]} radius={mm(2.5)} height={mm(6)} material="steel" />
      <Cylinder position={[0, mm(7.25), 0]} radius={mm(3)} height={mm(2.5)} material="tin" />
      {HOLES.map((hole) => (
        <Cylinder key={hole.x} position={[hole.x, LIFT / 2, hole.z]} radius={mm(1.7)} height={LIFT} low material="brass" />
      ))}
      <group position={[0, BOARD_Y, 0]}>
        <Pcb name="as5600" size={[SIDE, T, SIDE]} holes={HOLES} corner={mm(2)} material="pcbWhite" finish="gold" />
        <Ic position={[0, T / 2, 0]} body={[mm(4.9), mm(3.9)]} height={mm(1.5)} leads={4} label="AS5600" />
        <Passives runs={RUNS} top={T / 2} />
        <Header position={[0, T / 2, -mm(9)]} count={7} pinLength={mm(6)} board={T} tailLength={mm(1.5)} />
        <TextDecal text={PIN_LABELS} position={[0, T / 2 + 0.0004, -mm(6.2)]} width={mm(18)} height={mm(1.6)} ink="dark" weight={500} />
        <TextDecal text="AS5600" position={[0, T / 2 + 0.0004, mm(5)]} width={mm(10)} height={mm(2.6)} ink="dark" />
      </group>
    </group>
  );
}
