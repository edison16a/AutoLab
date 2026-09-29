"use client";
import { useMemo } from "react";
import { Block, Repeat } from "../../../primitives";
import { GANTRY, PROFILE } from "../layout";
import { linkGeometry, linkPlacements, LINK, type ChainPath } from "./chain-geometry";

const BEAM_BACK = GANTRY.beamZ - PROFILE / 2;
/** The tray rides on the beam, just above the belt and behind it, stopping short of the X motor plate on the left. */
const TRAY = { from: -0.62, to: 0.52, top: 3.49, thickness: 0.012, lip: 0.03 } as const;
/**
 * The chain at rest: fixed on the tray at the left, running right to its
 * bend and back over itself to the moving end, on a printed arm off the
 * back of the pipette drive. The cables leave the fixed end toward the
 * left upright, well clear of the fan on the right wall. Exported so the
 * wiring can start and end in it.
 */
export const X_CHAIN: ChainPath = { fixed: -0.5, moving: -0.15, loop: 0.3, y: TRAY.top + LINK.height / 2, radius: 0.1, z: -0.52 };
const BRACKETS = [-0.45, 0.4];
/** Back edge and underside of the pipette motor's printed shelf, which the moving end's arm is fixed to. */
const DRIVE_BACK = -0.38;
const SHELF_Y = 3.485;
const PLA = "plaGrey";

/** A printed L bracket: a tab bolted to the back of the beam and an arm under the tray. */
function Bracket({ x }: { x: number }) {
  const armDepth = BEAM_BACK - (X_CHAIN.z - LINK.width / 2);
  const tabBottom = GANTRY.beamY - 0.05;
  return (
    <group position={[x, 0, 0]}>
      <Block position={[0, (tabBottom + TRAY.top) / 2, BEAM_BACK - 0.007]} size={[0.08, TRAY.top - tabBottom, 0.014]} radius={0.004} material={PLA} />
      <Block position={[0, TRAY.top - TRAY.thickness - 0.008, BEAM_BACK - armDepth / 2]} size={[0.08, 0.016, armDepth]} radius={0.004} material={PLA} />
    </group>
  );
}

/**
 * The X axis cable chain: an orange nylon chain lying on a slim aluminium
 * tray behind the beam, carrying the pipette tool's cables as it travels.
 * The tray hangs off the beam on printed brackets, so it rides up and
 * down with it on Z.
 */
export function XChain() {
  const links = useMemo(() => linkPlacements(X_CHAIN), []);
  const { z, fixed, moving, y, radius } = X_CHAIN;
  const trayLength = TRAY.to - TRAY.from;
  const trayX = (TRAY.from + TRAY.to) / 2;
  const upper = y + radius * 2;
  return (
    <group>
      <Block position={[trayX, TRAY.top - TRAY.thickness / 2, z]} size={[trayLength, TRAY.thickness, LINK.width + 0.03]} material="aluminiumBlasted" />
      {[-1, 1].map((side) => (
        <Block key={side} position={[trayX, TRAY.top + TRAY.lip / 2 - TRAY.thickness, z + side * (LINK.width / 2 + 0.018)]} size={[trayLength, TRAY.lip, 0.006]} material="aluminiumBlasted" />
      ))}
      {BRACKETS.map((x) => (
        <Bracket key={x} x={x} />
      ))}
      <Repeat items={links} geometry={linkGeometry()} material="chainOrange" />
      {/* End mounts: one screwed to the tray, one on a printed arm off the back of the pipette drive. */}
      <Block position={[fixed - 0.05, y, z]} size={[0.1, LINK.height + 0.01, LINK.width + 0.012]} radius={0.01} material="chainOrange" />
      <Block position={[moving - 0.05, upper, z]} size={[0.1, LINK.height + 0.01, LINK.width + 0.012]} radius={0.01} material="chainOrange" />
      <Block position={[moving - 0.05, upper, (z + LINK.width / 2 + DRIVE_BACK) / 2]} size={[0.09, 0.05, DRIVE_BACK - z - LINK.width / 2]} radius={0.01} material={PLA} />
      <Block position={[moving - 0.05, (upper + SHELF_Y) / 2, DRIVE_BACK - 0.015]} size={[0.09, upper - SHELF_Y + 0.025, 0.03]} radius={0.01} material={PLA} />
    </group>
  );
}
