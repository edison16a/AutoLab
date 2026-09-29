"use client";
import { Block, Cylinder, TextDecal } from "../primitives";
import { Header } from "./details/Header";
import { Ic } from "./details/Ic";
import { Pcb } from "./details/Pcb";
import { mm } from "./details/units";

/** The common 23 mm square breakout, held 11 mm above the motor's back face. */
const SIDE = mm(23);
const T = mm(1.6);
const BOARD_Y = mm(11) + T / 2;
const HOLES = [-1, 1].map((x) => ({ x: x * mm(8), z: mm(6.5), radius: mm(1.6) }));
const PIN_LABELS = "VCC OUT GND DIR SCL SDA GPO";

/**
 * AS5600 magnetic encoder on the back of the pipette motor: a diametric
 * magnet on the rear shaft, and the breakout held over it on two standoffs
 * with the sensor chip facing down at the magnet. The seven pin header
 * points up. Origin at the centre of the motor's back face.
 */
export function AS5600Model() {
  return (
    <group>
      <Cylinder position={[0, mm(3), 0]} radius={mm(2.5)} height={mm(6)} material="steel" />
      {/* Diametric magnet: one nickel disc, with the pole line across its face. */}
      <Cylinder position={[0, mm(7.25), 0]} radius={mm(3)} height={mm(2.5)} material="steel" />
      <Block position={[0, mm(8.55), 0]} size={[mm(6), 0.0008, mm(0.6)]} material="graphite" />
      {HOLES.map((hole) => (
        <Cylinder key={hole.x} position={[hole.x, mm(5.5), hole.z]} radius={mm(1.7)} height={mm(11)} low material="plasticGrey" />
      ))}
      <group position={[0, BOARD_Y, 0]}>
        <Pcb name="as5600" size={[SIDE, T, SIDE]} holes={HOLES} corner={mm(2)} material="pcbWhite" />
        {/* The sensor under the board, facing the magnet. */}
        <group position={[0, -T / 2, 0]} rotation={[Math.PI, 0, 0]}>
          <Ic position={[0, 0, 0]} body={[mm(3.9), mm(4.9)]} height={mm(1.5)} leads={4} />
        </group>
        <Header position={[0, T / 2, -mm(9)]} count={7} pinLength={mm(6)} board={T} tailLength={mm(1.5)} />
        <TextDecal text={PIN_LABELS} position={[0, T / 2 + 0.0004, -mm(6)]} width={mm(18)} height={mm(1.6)} ink="dark" weight={500} />
        <TextDecal text="AS5600" position={[0, T / 2 + 0.0004, mm(1)]} width={mm(10)} height={mm(2.6)} ink="dark" />
        <Block position={[mm(-4), T / 2 + mm(0.3), mm(6.5)]} size={[mm(1.6), mm(0.6), mm(0.8)]} material="plasticGrey" />
        <Block position={[mm(4), T / 2 + mm(0.3), mm(6.5)]} size={[mm(1.6), mm(0.6), mm(0.8)]} material="plasticBlack" />
      </group>
    </group>
  );
}
