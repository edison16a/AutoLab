"use client";
import { Block, Cylinder, Ring } from "../../primitives";
import { Knurl } from "./Knurl";
import { BOARD_BOTTOM, LENS_TOP } from "./layout";

/** The optics stack, top to bottom, as [top, bottom] heights. */
const BASE = [BOARD_BOTTOM, -0.044] as const;
const FOCUS_RING = [BASE[1], -0.112] as const;
const ADAPTER = [FOCUS_RING[1], LENS_TOP] as const;

const mid = ([top, bottom]: readonly [number, number]) => (top + bottom) / 2;
const span = ([top, bottom]: readonly [number, number]) => top - bottom;

/** The locking screw sits on the front of the focus ring (toward the enclosure door). */
function LockingScrew() {
  const y = mid(FOCUS_RING);
  return (
    <group position={[0, y, 0]}>
      <Cylinder position={[0, 0, 0.252]} rotation={[Math.PI / 2, 0, 0]} radius={0.013} height={0.036} low material="steel" />
      <Cylinder position={[0, 0, 0.274]} rotation={[Math.PI / 2, 0, 0]} radius={0.022} height={0.014} material="steel" />
      <Cylinder position={[0, 0, 0.2815]} rotation={[Math.PI / 2, 0, 0]} radius={0.009} height={0.002} low material="rubber" />
    </group>
  );
}

/**
 * The tripod block below the mount on the -Z side, standing a little past
 * the board edge like the real one, with its 1/4 inch thread facing out.
 */
function TripodBlock() {
  const y = BOARD_BOTTOM - 0.05;
  return (
    <group position={[0, y, -0.2925]}>
      <Block size={[0.2, 0.1, 0.085]} radius={0.008} material="aluminium" />
      <Ring position={[0, -0.005, -0.043]} rotation={[0, 0, 0]} radius={0.024} material="aluminium" />
      <Cylinder position={[0, -0.005, -0.0425]} rotation={[Math.PI / 2, 0, 0]} radius={0.019} height={0.002} material="rubber" />
    </group>
  );
}

/**
 * The aluminium C/CS mount under the board: the base flange, the knurled
 * back focus ring with its locking screw, and the C-CS adapter ring the
 * lens threads into. A thin dark line marks each thread joint.
 */
export function LensMount() {
  return (
    <group>
      <Cylinder position={[0, mid(BASE), 0]} radius={0.228} height={span(BASE)} material="aluminium" />
      <Cylinder position={[0, mid(FOCUS_RING), 0]} radius={0.236} height={span(FOCUS_RING)} material="aluminium" />
      <Knurl y={mid(FOCUS_RING)} radius={0.244} height={span(FOCUS_RING) * 0.6} teeth={90} depth={0.03} material="aluminium" />
      <Ring position={[0, FOCUS_RING[0] - 0.001, 0]} radius={0.229} thin material="graphite" />
      <LockingScrew />
      <Cylinder position={[0, mid(ADAPTER), 0]} radius={0.212} height={span(ADAPTER)} material="aluminium" />
      <Ring position={[0, ADAPTER[0] - 0.001, 0]} radius={0.213} thin material="graphite" />
      <TripodBlock />
    </group>
  );
}
