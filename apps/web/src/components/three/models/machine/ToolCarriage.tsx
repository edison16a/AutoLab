"use client";
import { Block } from "../../primitives";
import { Rig } from "../../motion/Rig";
import { GANTRY, PROFILE, TOOL } from "./layout";
import { X_CHAIN } from "./wiring/XChain";

const { x: X } = TOOL;
/** Front face of the X carriage plate, which the tool's backplate is bolted to. */
const MOUNT_Z = GANTRY.beamZ + PROFILE / 2 + 0.045;
const PLATE = { thickness: 0.03, bottom: 1.86, top: 3.485, half: 0.26 } as const;
const PLATE_Z = MOUNT_Z + PLATE.thickness / 2;
/**
 * The bracket the cable chain's moving end hangs from: a printed shelf on
 * top of the backplate, reaching back over the belt to the chain. Its back
 * edge and top match the chain's arm in XChain.
 */
const SHELF = { back: -0.38, top: 3.52, thickness: 0.035, width: 0.16 } as const;

/**
 * The fixed part of the tool on the X carriage: a printed backplate the
 * dispense head bolts to, a clip for its fluid lines, and the shelf on top
 * of it that carries the cable chain's moving end, so the fluid lines ride
 * the chain with the carriage. Light grey PLA like the rest of the printed
 * parts. The head itself is a selectable part, placed on this by the
 * registry.
 */
export function ToolCarriage() {
  const { bottom, top, half, thickness } = PLATE;
  const shelfFront = MOUNT_Z + thickness;
  const shelfX = X_CHAIN.moving - 0.05;
  return (
    <Rig rig="carriage">
      <Block position={[X, (bottom + top) / 2, PLATE_Z]} size={[half * 2, top - bottom, thickness]} material="plaGrey" />
      {/* Clip that holds the head's two lines to the plate on their way up. */}
      <Block position={[X + 0.08, 2.9, MOUNT_Z + thickness + 0.025]} size={[0.24, 0.03, 0.05]} radius={0.01} material="plasticBlack" />
      <Block
        position={[(X + shelfX) / 2, SHELF.top - SHELF.thickness / 2, (shelfFront + SHELF.back) / 2]}
        size={[Math.abs(shelfX - X) + SHELF.width, SHELF.thickness, shelfFront - SHELF.back]}
        radius={0.01}
        material="plaGrey"
      />
    </Rig>
  );
}
