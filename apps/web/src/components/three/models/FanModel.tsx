"use client";
import { castsShadow, getMaterial } from "../materials";
import { Block, Bolt, Cylinder, Repeat, Ring, TextDecal, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { perforatedPlate, type PlateHole } from "./geometry/shapes";

const SIZE = 0.8;
const DEPTH = 0.2;
const THROAT = 0.375;
const CORNER = 0.34;
/** The frame: a square with the round throat and four corner mounting holes cut through it. */
const FRAME_HOLES: PlateHole[] = [
  { x: 0, z: 0, radius: THROAT },
  ...[-1, 1].flatMap((x) => [-1, 1].map((z) => ({ x: x * CORNER, z: z * CORNER, radius: 0.028 }))),
];
// Seven pitched blades round the hub. Each is twisted about its own length, then swung into place (ZYX order).
const BLADES: RepeatItem[] = Array.from({ length: 7 }, (_, i) => {
  const a = (i * Math.PI * 2) / 7;
  return { position: [Math.cos(a) * 0.245, Math.sin(a) * 0.245, 0] as Vec3, rotation: [0, 0.55, a - Math.PI / 2] as Vec3 };
});
const BLADE_SCALE: Vec3 = [0.15, 0.23, 0.01];
/** Motor struts across the back of the throat. */
const STRUTS: RepeatItem[] = [0, 1, 2, 3].map((i) => {
  const a = (i * Math.PI) / 2 + Math.PI / 4;
  return { position: [Math.cos(a) * 0.25, Math.sin(a) * 0.25, -DEPTH / 2 + 0.015] as Vec3, rotation: [0, 0, a] as Vec3 };
});
const STRUT_SCALE: Vec3 = [0.26, 0.022, 0.03];
const GUARD_Z = DEPTH / 2 + 0.018;
const GUARD_RINGS = [0.1, 0.2, 0.29, 0.37];
/** Guard spokes: four wires across the face. */
const SPOKES: RepeatItem[] = [0, 1, 2, 3].map((i) => ({ position: [0, 0, GUARD_Z] as Vec3, rotation: [0, 0, (i * Math.PI) / 4] as Vec3 }));
const SPOKE_SCALE: Vec3 = [0.76, 0.01, 0.01];
const CORNERS: Vec3[] = [-1, 1].flatMap((x) => [-1, 1].map((y) => [x * CORNER, y * CORNER, DEPTH / 2] as Vec3));

/**
 * The circulation fan, blowing along +Z: a moulded frame with its round
 * throat and corner holes, seven pitched blades round the labelled hub,
 * motor struts behind, and a wire finger guard on the chamber side.
 */
export function FanModel() {
  return (
    <group>
      <mesh
        geometry={perforatedPlate("fan-frame", SIZE, SIZE, DEPTH, 0.05, FRAME_HOLES)}
        material={getMaterial("plasticBlack")}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow={castsShadow("plasticBlack")}
        receiveShadow
        dispose={null}
      />
      <Cylinder rotation={[Math.PI / 2, 0, 0]} radius={0.13} height={DEPTH * 0.8} material="plasticBlack" />
      <Cylinder position={[0, 0, DEPTH * 0.4 + 0.001]} rotation={[Math.PI / 2, 0, 0]} radius={0.1} height={0.002} material="plasticGrey" />
      <TextDecal text="12V" position={[0, 0, DEPTH * 0.4 + 0.003]} rotation={[0, 0, 0]} width={0.1} height={0.05} ink="dark" weight={600} />
      <Repeat items={BLADES} material="plasticBlack" scale={BLADE_SCALE} order="ZYX" />
      <Repeat items={STRUTS} material="plasticBlack" scale={STRUT_SCALE} />
      {GUARD_RINGS.map((r) => (
        <Ring key={r} position={[0, 0, GUARD_Z]} rotation={[0, 0, 0]} radius={r} thin material="steel" />
      ))}
      <Repeat items={SPOKES} material="steel" scale={SPOKE_SCALE} />
      {CORNERS.map((position) => (
        <group key={position.join()} position={position} rotation={[Math.PI / 2, 0, 0]}>
          <Bolt radius={0.03} />
        </group>
      ))}
      <Block position={[SIZE / 2 - 0.1, -SIZE / 2 + 0.02, DEPTH / 2 - 0.03]} size={[0.12, 0.03, 0.03]} radius={0.01} material="rubber" />
    </group>
  );
}
