"use client";
import { Block, Cylinder, TextDecal } from "../../primitives";
import { ChuteTips } from "../deck/ChuteTips";
import { STRIPPER, TROUGHS } from "../deck/labware-layout";
import { Tray } from "../deck/Troughs";

const { x: X, width: WIDTH, top: TOP, height: HEIGHT, chute: BIN } = TROUGHS;
/** Just behind the tray's back wall, where the stripper's posts stand on the plate. */
const BACK = BIN.z - BIN.length / 2 - 0.014;
/** The slot's end, where the nose's axis sits while it strips a tip. */
const SLOT_END = BIN.z - STRIPPER.back;
const PLATE_Y = STRIPPER.under + STRIPPER.thickness / 2;
const PLATE_FRONT = SLOT_END + 0.12;

/**
 * The stripper: a stainless plate on two posts at the bin's back, with a
 * slot open toward the door. Drawn as the two tines either side of the slot
 * and the bridge behind it.
 */
function Stripper() {
  const { slot, thickness } = STRIPPER;
  const tine = WIDTH / 2 - slot;
  const tineStart = SLOT_END - slot;
  const tineLength = PLATE_FRONT - tineStart;
  const bridgeLength = tineStart - (BACK - 0.012);
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[X + side * (slot + tine / 2), PLATE_Y, tineStart + tineLength / 2]} size={[tine, thickness, tineLength]} radius={0.003} material="stainless" />
          <Cylinder position={[X + side * (WIDTH / 2 - 0.02), (TOP + STRIPPER.under) / 2, BACK]} radius={0.012} height={STRIPPER.under - TOP} low material="stainless" />
        </group>
      ))}
      <Block position={[X, PLATE_Y, BACK - 0.012 + bridgeLength / 2]} size={[WIDTH, thickness, bridgeLength]} radius={0.003} material="stainless" />
    </group>
  );
}

/**
 * The tip disposal bin: a stainless tray on the heated plate's left margin
 * with the tip stripper standing over its back. The head brings a used tip
 * in under the stripper plate, slides the nose into the slot and lifts, and
 * the tip drops into the tray; the Home demo shows each one land. A yellow
 * biohazard band marks it. Drawn in the heated platform's space, so its
 * origin is the platform's.
 */
export function DisposalBinModel() {
  return (
    <group>
      <Tray z={BIN.z} length={BIN.length} material="stainless" />
      <Block position={[X, TOP + HEIGHT - 0.03, BIN.z + BIN.length / 2 + 0.002]} size={[WIDTH - 0.02, 0.04, 0.004]} material="wireYellow" />
      <TextDecal text="Tips" position={[X, TOP + HEIGHT - 0.03, BIN.z + BIN.length / 2 + 0.005]} rotation={[0, 0, 0]} width={0.1} height={0.03} ink="dark" weight={700} />
      <Stripper />
      <ChuteTips />
    </group>
  );
}
