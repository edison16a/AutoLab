"use client";
import { Block, Cylinder, Repeat, TextDecal, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { Jst } from "./details/Connectors";
import { Pcb } from "./details/Pcb";
import { mm } from "./details/units";

/** The carrier is a 20 x 22 mm board standing in the XY plane, facing +Z. */
const CARRIER = { width: mm(20), height: mm(22), thickness: mm(1.6) } as const;
const FRONT = CARRIER.thickness / 2;
const HOLES = [-1, 1].map((x) => ({ x: x * mm(7), z: mm(6), radius: mm(1.4) }));
/** The SHT85's four pins are on a 1.27 mm pitch. */
const FINE_PITCH = mm(1.27);
const SOCKET = { y: mm(7), height: mm(4.5), depth: mm(3) } as const;
const SENSOR = { width: mm(5.6), length: mm(14), thickness: mm(1), bottom: SOCKET.y + SOCKET.height / 2 } as const;
const SENSOR_Z = FRONT + SOCKET.depth / 2;
const SOCKET_HOLES: RepeatItem[] = [0, 1, 2, 3].map((i) => ({ position: [(i - 1.5) * FINE_PITCH, SOCKET.y + SOCKET.height / 2 + 0.0004, SENSOR_Z] as Vec3 }));
const SOCKET_HOLE_SCALE: Vec3 = [mm(0.5), 0.0008, mm(0.5)];

/** The sensor itself: a slim board rising out of the socket, with the filter cap at its tip. */
function Sensor() {
  const { width, length, thickness, bottom } = SENSOR;
  const capY = bottom + length - mm(2.6);
  return (
    <group position={[0, 0, SENSOR_Z]}>
      <Block position={[0, bottom + length / 2, 0]} size={[width, length, thickness]} radius={mm(0.3)} material="pcbGraphite" />
      <TextDecal text="SHT85" position={[0, bottom + mm(5), thickness / 2 + 0.0004]} rotation={[0, 0, Math.PI / 2]} width={mm(6)} height={mm(1.6)} weight={600} />
      {/* The grey cap over the die, with its white PTFE membrane facing the chamber. */}
      <Block position={[0, capY, mm(0.6)]} size={[mm(7.2), mm(5.2), mm(3.4)]} radius={mm(0.8)} material="plasticGrey" />
      <Cylinder position={[0, capY, mm(2.35)]} rotation={[Math.PI / 2, 0, 0]} radius={mm(1.7)} height={mm(0.2)} material="plasticWhite" />
    </group>
  );
}

/**
 * Sensirion SHT85 temperature and humidity sensor, plugged into a 1.27 mm
 * socket on a small carrier that stands off the back wall's sensor rail.
 * The carrier's JST socket at the bottom takes the I²C cable to the Pi.
 * Origin at the middle of the carrier.
 */
export function SHT85Model() {
  const { width, height, thickness } = CARRIER;
  return (
    <group>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <Pcb name="sht85-carrier" size={[width, thickness, height]} holes={HOLES} corner={mm(1.5)} />
      </group>
      {HOLES.map((hole) => (
        <Cylinder key={hole.x} position={[hole.x, -hole.z, -FRONT - mm(3)]} rotation={[Math.PI / 2, 0, 0]} radius={mm(2)} height={mm(6)} low material="steel" />
      ))}
      <Block position={[0, SOCKET.y, FRONT + SOCKET.depth / 2]} size={[FINE_PITCH * 4 + mm(1), SOCKET.height, SOCKET.depth]} material="plasticBlack" />
      <Repeat items={SOCKET_HOLES} shape="cylinderLow" material="graphite" scale={SOCKET_HOLE_SCALE} />
      <Sensor />
      <group position={[0, -mm(7), FRONT]} rotation={[Math.PI / 2, 0, 0]}>
        <Jst position={[0, 0, 0]} count={4} kind="ph" />
      </group>
      <TextDecal text="SCL VDD GND SDA" position={[0, mm(2), FRONT + 0.0004]} rotation={[0, 0, 0]} width={mm(13)} height={mm(1.5)} weight={500} />
    </group>
  );
}
