"use client";
import { Block, Cylinder, Repeat, TextDecal, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { Jst } from "./details/Connectors";
import { Pcb } from "./details/Pcb";
import { mm } from "./details/units";
import { ChipMarking } from "./pi/ChipMarking";

/** The carrier is a 20 x 22 mm board standing in the XY plane, facing +Z. */
const CARRIER = { width: mm(20), height: mm(22), thickness: mm(1.6) } as const;
const FRONT = CARRIER.thickness / 2;
const HOLES = [-1, 1].map((x) => ({ x: x * mm(7), z: mm(6), radius: mm(1.4) }));
/** The SHT85's four pins are on a 1.27 mm pitch. */
const FINE_PITCH = mm(1.27);
const SOCKET = { y: mm(7), height: mm(4.5), depth: mm(3) } as const;
/** A millimetre of gold pin shows between the socket and the sensor's board. */
const GAP = mm(1);
const SENSOR = { width: mm(5.6), length: mm(13.5), thickness: mm(1), bottom: SOCKET.y + SOCKET.height / 2 + GAP } as const;
const SENSOR_Z = FRONT + SOCKET.depth / 2;
const PIN_XS = [0, 1, 2, 3].map((i) => (i - 1.5) * FINE_PITCH);
const SOCKET_HOLES: RepeatItem[] = PIN_XS.map((x) => ({ position: [x, SOCKET.y + SOCKET.height / 2 + 0.0004, SENSOR_Z] as Vec3 }));
const SOCKET_HOLE_SCALE: Vec3 = [mm(0.5), 0.0008, mm(0.5)];
const PINS: RepeatItem[] = PIN_XS.map((x) => ({ position: [x, SOCKET.y + SOCKET.height / 2 + GAP / 2, SENSOR_Z] as Vec3 }));
const PIN_SCALE: Vec3 = [mm(0.4), GAP + mm(0.4), mm(0.4)];

/**
 * The sensor itself: a slim black board rising out of the socket on its
 * gold pins, with the slot that keeps the board's heat off the die, and
 * the black cap at its tip holding the white PTFE membrane that faces the
 * chamber.
 */
function Sensor() {
  const { width, length, thickness, bottom } = SENSOR;
  const capY = bottom + length - mm(2.6);
  return (
    <group position={[0, 0, SENSOR_Z]}>
      <Block position={[0, bottom + length / 2, 0]} size={[width, length, thickness]} radius={mm(0.3)} material="pcbBlack" />
      <Block position={[0, bottom + mm(7.2), thickness / 2 + 0.0003]} size={[mm(0.8), mm(3.4), 0.0006]} material="plasticBlack" />
      <ChipMarking lines={[{ text: "SHT85" }]} position={[0, bottom + mm(3.2), thickness / 2 + 0.0004]} rotation={[0, 0, Math.PI / 2]} width={mm(4.6)} height={mm(1.4)} />
      <Block position={[0, capY, mm(0.6)]} size={[mm(6.2), mm(5.2), mm(3.2)]} radius={mm(0.7)} material="plasticBlack" />
      <Block position={[0, capY, mm(2.2)]} size={[mm(3.6), mm(3.6), mm(0.2)]} radius={mm(0.09)} material="labelWhite" />
    </group>
  );
}

/**
 * Sensirion SHT85 temperature and humidity sensor, plugged into a 1.27 mm
 * socket on a small green carrier that stands off the back wall's sensor
 * rail on brass standoffs. The carrier's JST socket at the bottom takes
 * the I²C cable to the Pi. Origin at the middle of the carrier.
 */
export function SHT85Model() {
  const { width, height, thickness } = CARRIER;
  return (
    <group>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <Pcb name="sht85-carrier" size={[width, thickness, height]} holes={HOLES} corner={mm(1.5)} material="pcbGreen" finish="gold" />
      </group>
      {HOLES.map((hole) => (
        <Cylinder key={hole.x} position={[hole.x, -hole.z, -FRONT - mm(3)]} rotation={[Math.PI / 2, 0, 0]} radius={mm(2)} height={mm(6)} low material="brass" />
      ))}
      <Block position={[0, SOCKET.y, FRONT + SOCKET.depth / 2]} size={[FINE_PITCH * 4 + mm(1), SOCKET.height, SOCKET.depth]} material="plasticBlack" />
      <Repeat items={SOCKET_HOLES} shape="cylinderLow" material="graphite" scale={SOCKET_HOLE_SCALE} />
      <Repeat items={PINS} material="gold" scale={PIN_SCALE} />
      <Sensor />
      <group position={[0, -mm(7), FRONT]} rotation={[Math.PI / 2, 0, 0]}>
        <Jst position={[0, 0, 0]} count={4} kind="ph" />
      </group>
      <TextDecal text="SCL VDD GND SDA" position={[0, mm(2), FRONT + 0.0004]} rotation={[0, 0, 0]} width={mm(13)} height={mm(1.5)} weight={500} />
    </group>
  );
}
