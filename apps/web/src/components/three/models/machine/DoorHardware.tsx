"use client";
import { Block, Bolt, Cylinder, Repeat, Tube, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { ENCLOSURE, PROFILE } from "./layout";

const { halfX: X } = ENCLOSURE;
/** Outer side faces of the front posts, where the frame leaf and the latch base are screwed on. */
const POST_SIDE = X + PROFILE / 2;
const LEAF = { height: 0.3, thickness: 0.008 } as const;
const KNUCKLE = 0.026;
/** Three knuckles with hairline gaps, alternating between the two leaves like a real butt hinge. */
const KNUCKLES: RepeatItem[] = [-1, 0, 1].map((i) => ({ position: [0, i * (LEAF.height / 3), 0] as Vec3 }));
const KNUCKLE_SCALE: Vec3 = [KNUCKLE, LEAF.height / 3 - 0.008, KNUCKLE];

export interface DoorHardwareProps {
  y: number;
  /** Front face of the closed door. */
  doorFront: number;
}

/**
 * A stainless hinge on the front left corner: the knuckle stands just
 * proud of the post's corner, one leaf screwed to the door's face and the
 * other wrapped round onto the post's side, so the door swings clear.
 */
export function Hinge({ y, doorFront }: DoorHardwareProps) {
  const x = -POST_SIDE + KNUCKLE * 0.4;
  const z = doorFront - KNUCKLE * 0.7;
  const doorLeaf = { from: x, to: -X + 0.12 };
  const frameLeaf = { from: z, to: z - 0.16 };
  const face: Vec3 = [Math.PI / 2, 0, 0];
  const side: Vec3 = [0, 0, Math.PI / 2];
  return (
    <group position={[0, y, 0]}>
      <group position={[x, 0, z]}>
        <Repeat items={KNUCKLES} shape="cylinderLow" material="steel" scale={KNUCKLE_SCALE} />
        {[-1, 1].map((end) => (
          <Cylinder key={end} position={[0, end * (LEAF.height / 2 + 0.004), 0]} radius={KNUCKLE * 0.7} height={0.012} low material="steel" />
        ))}
      </group>
      <Block position={[(doorLeaf.from + doorLeaf.to) / 2, 0, doorFront + LEAF.thickness / 2]} size={[doorLeaf.to - doorLeaf.from, LEAF.height, LEAF.thickness]} radius={0.003} material="steel" />
      <Block position={[-POST_SIDE - LEAF.thickness / 2, 0, (frameLeaf.from + frameLeaf.to) / 2]} size={[LEAF.thickness, LEAF.height, frameLeaf.from - frameLeaf.to]} radius={0.003} material="steel" />
      {[-0.09, 0.09].map((dy) => (
        <group key={dy}>
          <group position={[doorLeaf.to - 0.04, dy, doorFront + LEAF.thickness]} rotation={face}>
            <Bolt radius={0.018} />
          </group>
          <group position={[-POST_SIDE - LEAF.thickness, dy, frameLeaf.to + 0.05]} rotation={side}>
            <Bolt radius={0.018} />
          </group>
        </group>
      ))}
    </group>
  );
}

/**
 * A stainless toggle draw latch on the front right corner: the base and
 * lever on the post's side, and a wire bail reaching round the corner to
 * the keeper on the door's face. Pulled over centre it squeezes the door
 * onto its gasket.
 */
export function DrawLatch({ y, doorFront }: DoorHardwareProps) {
  const keeperX = X - 0.07;
  const leverX = POST_SIDE + 0.022;
  return (
    <group position={[0, y, 0]}>
      <Block position={[POST_SIDE + 0.005, 0, doorFront - 0.12]} size={[0.01, 0.1, 0.15]} radius={0.004} material="steel" />
      <Block position={[leverX, 0, doorFront - 0.085]} size={[0.026, 0.065, 0.2]} radius={0.012} material="steel" />
      {[-0.024, 0.024].map((dy) => (
        <Tube
          key={dy}
          points={[
            [leverX, dy, doorFront - 0.02],
            [leverX, dy, doorFront + 0.012],
            [POST_SIDE - 0.02, dy, doorFront + 0.022],
            [keeperX, dy, doorFront + 0.016],
          ]}
          radius={0.005}
          material="steel"
          segments={16}
        />
      ))}
      <Cylinder position={[keeperX, 0, doorFront + 0.016]} radius={0.005} height={0.058} low material="steel" />
      {/* The keeper: a plate on the door with a hooked lip the bail pulls against. */}
      <Block position={[keeperX + 0.01, 0, doorFront + 0.004]} size={[0.07, 0.09, 0.008]} radius={0.003} material="steel" />
      <Block position={[keeperX - 0.014, 0, doorFront + 0.016]} size={[0.012, 0.075, 0.024]} radius={0.004} material="steel" />
    </group>
  );
}
