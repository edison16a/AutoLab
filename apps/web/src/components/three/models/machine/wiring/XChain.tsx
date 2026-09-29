"use client";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Object3D, type InstancedMesh } from "three";
import { castsShadow, getMaterial } from "../../../materials";
import { Rig } from "../../../motion/Rig";
import { usePoseFrame } from "../../../motion/use-pose-frame";
import { Block } from "../../../primitives";
import { GANTRY, PROFILE } from "../layout";
import { LINK, linkCount, linkGeometry, placeLink, rolled, type ChainPath, type LinkPlace } from "./chain-geometry";

const BEAM_BACK = GANTRY.beamZ - PROFILE / 2;
/**
 * The tray rides on the beam, just above the belt and behind it, from short
 * of the X motor plate on the left to well past where the bend rolls to
 * when the carriage is at the right end of its travel.
 */
const TRAY = { from: -0.62, to: 0.8, top: 3.49, thickness: 0.012, lip: 0.03 } as const;
/**
 * The chain at rest: fixed on the tray at the left, running right to its
 * bend and back over itself to the moving end, on a printed arm off the
 * back of the pipette drive. The cables leave the fixed end toward the
 * left upright, well clear of the fan on the right wall. Exported so the
 * wiring can start and end in it.
 */
export const X_CHAIN: ChainPath = { fixed: -0.5, moving: -0.15, loop: 0.3, y: TRAY.top + LINK.height / 2, radius: 0.1, z: -0.52 };
const BRACKETS = [-0.45, 0.65];
/** Back edge and underside of the pipette motor's printed shelf, which the moving end's arm is fixed to. */
const DRIVE_BACK = -0.38;
const SHELF_Y = 3.485;
const PLA = "plaGrey";
const COUNT = linkCount(X_CHAIN);

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

const scratch = new Object3D();
const place: LinkPlace = { x: 0, y: 0, angle: 0 };
const path: ChainPath = { ...X_CHAIN };

/**
 * The chain's links, one instanced draw, in the beam's space. As the
 * carriage runs along the beam in the Home demo the moving end goes with
 * it and the bend rolls half as far, like a real chain; links are only
 * re-laid when the carriage has moved.
 */
function Links() {
  const mesh = useRef<InstancedMesh>(null);
  const laid = useRef(Number.NaN);

  const lay = useCallback((dx: number) => {
    const target = mesh.current;
    if (!target || Math.abs(dx - laid.current) < 1e-5) return;
    laid.current = dx;
    rolled(X_CHAIN, dx, path);
    for (let i = 0; i < COUNT; i++) {
      placeLink(path, i, place);
      scratch.position.set(place.x, place.y, X_CHAIN.z);
      scratch.rotation.set(0, 0, place.angle);
      scratch.updateMatrix();
      target.setMatrixAt(i, scratch.matrix);
    }
    target.instanceMatrix.needsUpdate = true;
    target.computeBoundingSphere();
  }, []);

  useLayoutEffect(() => lay(0), [lay]);
  usePoseFrame(
    (pose) => lay(pose.x),
    () => lay(0),
  );
  useEffect(() => {
    const target = mesh.current;
    return () => target?.dispose();
  }, []);

  return <instancedMesh ref={mesh} args={[linkGeometry(), getMaterial("chainOrange"), COUNT]} castShadow={castsShadow("chainOrange")} receiveShadow dispose={null} />;
}

/**
 * The X axis cable chain: an orange nylon chain lying on a slim aluminium
 * tray behind the beam, carrying the pipette tool's cables as it travels.
 * The tray hangs off the beam on printed brackets, so it rides up and
 * down with it on Z; the moving end rides the carriage.
 */
export function XChain() {
  const { z, fixed, moving, y, radius } = X_CHAIN;
  const trayLength = TRAY.to - TRAY.from;
  const trayX = (TRAY.from + TRAY.to) / 2;
  const upper = y + radius * 2;
  return (
    <group>
      <Rig rig="beam">
        <Block position={[trayX, TRAY.top - TRAY.thickness / 2, z]} size={[trayLength, TRAY.thickness, LINK.width + 0.03]} material="aluminiumBlasted" />
        {[-1, 1].map((side) => (
          <Block key={side} position={[trayX, TRAY.top + TRAY.lip / 2 - TRAY.thickness, z + side * (LINK.width / 2 + 0.018)]} size={[trayLength, TRAY.lip, 0.006]} material="aluminiumBlasted" />
        ))}
        {BRACKETS.map((x) => (
          <Bracket key={x} x={x} />
        ))}
        <Links />
        {/* The fixed end, screwed to the tray. */}
        <Block position={[fixed - 0.05, y, z]} size={[0.1, LINK.height + 0.01, LINK.width + 0.012]} radius={0.01} material="chainOrange" />
      </Rig>
      {/* The moving end, on a printed arm off the back of the pipette drive. */}
      <Rig rig="carriage">
        <Block position={[moving - 0.05, upper, z]} size={[0.1, LINK.height + 0.01, LINK.width + 0.012]} radius={0.01} material="chainOrange" />
        <Block position={[moving - 0.05, upper, (z + LINK.width / 2 + DRIVE_BACK) / 2]} size={[0.09, 0.05, DRIVE_BACK - z - LINK.width / 2]} radius={0.01} material={PLA} />
        <Block position={[moving - 0.05, (upper + SHELF_Y) / 2, DRIVE_BACK - 0.015]} size={[0.09, upper - SHELF_Y + 0.025, 0.03]} radius={0.01} material={PLA} />
      </Rig>
    </group>
  );
}
