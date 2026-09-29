"use client";
import { Block, Cylinder } from "../../primitives";
import type { Vec3 } from "../../types";
import { mm } from "./units";

/**
 * A right angle PCB BNC jack, barrel toward -X: the square nickel plated
 * base, the barrel with its bayonet stud, the white PTFE insulator and the
 * centre socket.
 */
export function BncJack({ position }: { position: Vec3 }) {
  const axis = mm(5.5);
  return (
    <group position={position}>
      <Block position={[0, axis, 0]} size={[mm(10), mm(11), mm(11)]} radius={mm(0.6)} material="tin" />
      <group position={[-mm(5), axis, 0]} rotation={[0, 0, Math.PI / 2]}>
        <Cylinder position={[0, mm(5), 0]} radius={mm(4.8)} height={mm(10)} material="tin" />
        <Cylinder position={[0, mm(8), 0]} radius={mm(1)} height={mm(2.4)} rotation={[Math.PI / 2, 0, 0]} low material="tin" />
        <Cylinder position={[0, mm(10.05), 0]} radius={mm(3.6)} height={mm(0.2)} material="plasticWhite" />
        <Cylinder position={[0, mm(10.1), 0]} radius={mm(0.7)} height={mm(0.4)} low material="gold" />
      </group>
    </group>
  );
}

/**
 * A BNC plug on the end of a cable. The cable comes in at the origin from
 * +Y and the plug runs down -Y: the black strain relief boot, the crimp
 * ferrule, the nickel bayonet coupling nut, and the white insulator with
 * the gold centre pin in its mouth.
 */
export function BncPlug({ position, rotation }: { position?: Vec3; rotation?: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <Cylinder position={[0, -mm(9), 0]} radius={mm(4.4)} taper={0.5} height={mm(18)} material="plasticBlack" />
      <Cylinder position={[0, -mm(22), 0]} radius={mm(4.2)} height={mm(8)} material="tin" />
      <Cylinder position={[0, -mm(32), 0]} radius={mm(7.2)} height={mm(12)} material="tin" />
      <Cylinder position={[0, -mm(29), 0]} radius={mm(7.35)} height={mm(1.2)} material="steel" />
      <Cylinder position={[0, -mm(38.05), 0]} radius={mm(3.4)} height={mm(0.2)} material="plasticWhite" />
      <Cylinder position={[0, -mm(38.2), 0]} radius={mm(0.55)} height={mm(0.6)} low material="gold" />
    </group>
  );
}
