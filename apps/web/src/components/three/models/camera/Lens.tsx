"use client";
import { unitGeometry } from "../../geometries";
import { getMaterial } from "../../materials";
import { Block, Cylinder, Ring, TextDecal } from "../../primitives";
import type { Vec3 } from "../../types";
import { Knurl } from "./Knurl";
import { LENS_TOP } from "./layout";

/** The barrel, top to bottom, as [top, bottom] heights. */
const REAR = [LENS_TOP, -0.16] as const;
const APERTURE = [REAR[1], -0.21] as const;
const INDEX_BAND = [APERTURE[1], -0.24] as const;
const FOCUS = [INDEX_BAND[1], -0.335] as const;
const BEZEL = [FOCUS[1], -0.38] as const;
const FRONT = BEZEL[1];

const mid = ([top, bottom]: readonly [number, number]) => (top + bottom) / 2;
const span = ([top, bottom]: readonly [number, number]) => top - bottom;

/** Faces a flat decal down the lens axis, text upright when the lens points at you. */
const FACING_DOWN: Vec3 = [Math.PI / 2, 0, 0];
/** The front element bulges a little past the retaining ring. */
const DOME: Vec3 = [0.14, 0.022, 0.14];

/** A knurled thumb screw that locks a ring, sticking out radially at `angle` (0 is +Z). */
function ThumbScrew({ y, radius, angle }: { y: number; radius: number; angle: number }) {
  return (
    <group position={[0, y, 0]} rotation={[0, angle, 0]}>
      <Cylinder position={[0, 0, radius + 0.012]} rotation={[Math.PI / 2, 0, 0]} radius={0.008} height={0.024} low material="steel" />
      <Cylinder position={[0, 0, radius + 0.03]} rotation={[Math.PI / 2, 0, 0]} radius={0.018} height={0.016} material="plasticBlack" />
    </group>
  );
}

/**
 * The 6 mm wide angle CS lens: a black barrel with a knurled aperture
 * ring and a deeper knurled focus ring, each with its locking thumb screw,
 * a white index mark, and the front element behind a retaining ring.
 */
export function Lens() {
  return (
    <group>
      <Cylinder position={[0, mid(REAR), 0]} radius={0.19} height={span(REAR)} material="graphite" />
      <Knurl y={mid(APERTURE)} radius={0.205} height={span(APERTURE)} teeth={40} depth={0.06} material="plasticBlack" />
      <ThumbScrew y={mid(APERTURE)} radius={0.2} angle={0} />
      <Cylinder position={[0, mid(INDEX_BAND), 0]} radius={0.197} height={span(INDEX_BAND)} material="graphite" />
      <Block position={[0, mid(INDEX_BAND), 0.197]} size={[0.006, 0.018, 0.004]} material="silkscreen" />
      <Knurl y={mid(FOCUS)} radius={0.215} height={span(FOCUS)} teeth={48} depth={0.07} material="plasticBlack" />
      <ThumbScrew y={mid(FOCUS)} radius={0.21} angle={-Math.PI / 2} />
      <Cylinder position={[0, mid(BEZEL), 0]} radius={0.2} height={span(BEZEL)} taper={1.04} material="graphite" />
      {/* Front: the dark interior, the curved front element and its retaining ring. */}
      <Cylinder position={[0, FRONT - 0.0005, 0]} radius={0.145} height={0.001} material="rubber" />
      <Ring position={[0, FRONT - 0.001, 0]} radius={0.075} thin material="graphite" />
      <mesh geometry={unitGeometry("sphere")} material={getMaterial("glass")} position={[0, FRONT, 0]} scale={DOME} dispose={null} />
      <Ring position={[0, FRONT - 0.001, 0]} radius={0.148} thin material="graphite" />
      <TextDecal text="6mm 1:1.2" position={[0, FRONT - 0.0008, 0.173]} rotation={FACING_DOWN} width={0.1} height={0.02} weight={600} />
    </group>
  );
}
