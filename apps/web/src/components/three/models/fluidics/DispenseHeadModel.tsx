"use client";
import { useRef } from "react";
import type { Mesh } from "three";
import { unitGeometry } from "../../geometries";
import { getMaterial } from "../../materials";
import { HEAD_AXIS, WELL } from "../../motion/deck";
import { usePoseFrame } from "../../motion/use-pose-frame";
import { Block, Cylinder, Ring } from "../../primitives";
import type { Vec3 } from "../../types";
import { CarriedTip } from "../deck/CarriedTip";
import { NEEDLE, NOSE_TIP, TIP_SHAPE } from "../deck/labware-layout";

/** Heights on the nose's axis, relative to the head's origin. The nose reaches a little way into a carried tip. */
const NOSE = { bottom: NOSE_TIP.top - 0.04, collar: -0.03, radius: 0.026 } as const;
/** The printed block that holds the nose, and the spine behind it that bolts to the carriage plate. */
const BLOCK = { y: 0.1, height: 0.14, back: -0.135, front: 0.07 } as const;
const SPINE = { back: -0.185, thickness: 0.05, bottom: 0.03, top: 0.62, left: -0.12, right: 0.26 } as const;
const HUB_TOP = 0.27;
const BARB_TOP = 0.25;
const STREAM_RADIUS = 0.006;

/** Where each line joins the head, in the head's space: the aspiration barb on top of the nose and the needle's Luer hub. */
export const HEAD_PORTS = { aspiration: [0, BARB_TOP, 0] as Vec3, addition: [NEEDLE.dx, HUB_TOP, 0] as Vec3 };

/**
 * Fresh media falling from the needle into the well below while the
 * addition pump runs in the Home demo: a thin pink stream from the needle's
 * end down to the media's surface, which narrows as the pump starts and stops.
 */
function NeedleStream() {
  const stream = useRef<Mesh>(null);
  usePoseFrame(
    (pose) => {
      const mesh = stream.current;
      if (!mesh) return;
      mesh.visible = pose.stream > 0.02;
      if (!mesh.visible) return;
      const end = HEAD_AXIS.y + pose.z + NEEDLE.end;
      const length = Math.max(0.01, end - (WELL.floor + WELL.depth));
      const radius = STREAM_RADIUS * (0.4 + 0.6 * pose.stream);
      mesh.scale.set(radius, length, radius);
      mesh.position.y = NEEDLE.end - length / 2;
    },
    () => {
      if (stream.current) stream.current.visible = false;
    },
  );
  return (
    <mesh ref={stream} visible={false} geometry={unitGeometry("cylinderLow")} material={getMaterial("mediaPink")} position={[NEEDLE.dx, NEEDLE.end, 0]} renderOrder={2} dispose={null} />
  );
}

/**
 * The dispense head that replaces the pipette, carried on the X carriage.
 * It has no moving parts or electronics of its own: the pumps do the work.
 *
 * - The nose, a stainless cone with an O-ring, takes a disposable tip. The
 *   aspiration line joins the barb on top of it, so the aspiration pump
 *   draws spent media up through the tip. Each well gets a fresh tip, and
 *   the stripper over the disposal bin takes the used one off.
 * - Beside it, a blunt stainless needle on a Luer hub is the end of the
 *   addition line. It never touches the media: it dispenses from just
 *   above the plate, so it needs no tip.
 *
 * Printed in light grey PLA, with a clip that holds both lines to its
 * spine, which bolts to the bottom of the carriage's backplate. Origin on
 * the nose's axis, at the registry position.
 */
export function DispenseHeadModel() {
  const spineHeight = SPINE.top - SPINE.bottom;
  const blockDepth = BLOCK.front - BLOCK.back;
  const needleTop = 0.17;
  return (
    <group>
      <Block
        position={[(SPINE.left + SPINE.right) / 2, SPINE.bottom + spineHeight / 2, SPINE.back + SPINE.thickness / 2]}
        size={[SPINE.right - SPINE.left, spineHeight, SPINE.thickness]}
        radius={0.015}
        material="plaGrey"
      />
      {/* Line clip on the front of the spine. */}
      <Block position={[0.09, 0.42, SPINE.back + SPINE.thickness + 0.025]} size={[0.26, 0.03, 0.05]} radius={0.01} material="plasticBlack" />
      <Block position={[0, BLOCK.y, (BLOCK.front + BLOCK.back) / 2]} size={[0.16, BLOCK.height, blockDepth]} radius={0.02} material="plaGrey" />
      {/* The nose: a straight stainless stem that seals inside the tip, with its O-ring, under a tapered collar. */}
      <Cylinder position={[0, (NOSE.bottom + NOSE.collar) / 2, 0]} radius={NOSE.radius} height={NOSE.collar - NOSE.bottom} material="steel" />
      <Cylinder position={[0, NOSE.collar + 0.03, 0]} radius={0.032} height={0.06} taper={1.4} material="steel" />
      <Ring position={[0, NOSE.bottom + 0.03, 0]} radius={NOSE.radius + 0.002} thin material="rubber" />
      {/* Aspiration barb on top of the block, where the amber line pushes on. */}
      <Cylinder position={[0, BLOCK.y + BLOCK.height / 2 + 0.04, 0]} radius={0.014} height={0.08} low material="steel" />
      <Cylinder position={[0, BARB_TOP - 0.015, 0]} radius={0.02} height={0.03} taper={0.6} low material="steel" />
      {/* Needle arm, clamp, needle and its Luer hub, where the pink addition line pushes on. */}
      <Block position={[NEEDLE.dx / 2 + 0.02, 0.12, (BLOCK.back + 0.03) / 2]} size={[NEEDLE.dx + 0.04, 0.06, 0.03 - BLOCK.back]} radius={0.012} material="plaGrey" />
      <Block position={[NEEDLE.dx, 0.12, 0]} size={[0.07, 0.1, 0.07]} radius={0.012} material="plaGrey" />
      <Cylinder position={[NEEDLE.dx, (NEEDLE.end + needleTop) / 2, 0]} radius={NEEDLE.radius} height={needleTop - NEEDLE.end} low material="steel" />
      <Cylinder position={[NEEDLE.dx, 0.205, 0]} radius={0.024} height={0.07} taper={1.25} material="plasticWhite" />
      <Cylinder position={[NEEDLE.dx, HUB_TOP - 0.015, 0]} radius={0.016} height={0.03} low material="plasticWhite" />
      <NeedleStream />
      {/* A disposable tip on the nose, which comes and goes in the Home demo. */}
      <group position={[0, NOSE_TIP.top - TIP_SHAPE.length, 0]}>
        <CarriedTip />
      </group>
    </group>
  );
}
