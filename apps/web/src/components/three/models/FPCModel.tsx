"use client";
import { useEffect, useMemo } from "react";
import { getMaterial } from "../materials";
import type { Vec3 } from "../types";
import { CAMERA_FPC_ENTRY } from "./camera/layout";
import { RibbonEndTab } from "./fpc/RibbonEndTab";
import { ribbonGeometry } from "./fpc/ribbon-geometry";
import type { PartModelProps } from "./model-props";
import { PI_CSI_ENTRY } from "./pi/layout";

/**
 * Where the camera and the Pi sit relative to the ribbon's own origin in
 * the machine (their registry positions minus the ribbon's). Only the
 * default route uses these; pass `points` to lay the ribbon anywhere else.
 */
const CAMERA_OFFSET: Vec3 = [-0.75, 1, 0];
const PI_OFFSET: Vec3 = [1, -1.06, -0.03];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const START = add(CAMERA_FPC_ENTRY, CAMERA_OFFSET);
const END = add(PI_CSI_ENTRY, PI_OFFSET);

/**
 * The default run: straight out of the camera's edge socket, over and
 * down the right wall inside the chamber, out through the wall above the
 * floor, in a loose arc over the Pi platform and straight down into the
 * Pi's CSI slot. Both ends run straight for a while, as they do in a real
 * socket.
 */
const ROUTE: Vec3[] = [
  START,
  [START[0] + 0.1, START[1], 0],
  [-0.2, 1.02, 0],
  [-0.1, 0.92, 0],
  [-0.085, 0.7, 0],
  [-0.08, 0, 0],
  [0, -0.45, 0],
  [0.15, -0.6, 0.03],
  [0.45, -0.68, 0.09],
  [0.8, -0.74, 0.15],
  [END[0] - 0.07, END[1] + 0.22, END[2]],
  [END[0], END[1] + 0.12, END[2]],
  END,
];

/** 16 mm wide in reality; drawn a touch narrower so it doesn't dominate the chamber. */
const WIDTH = 0.17;
const THICKNESS = 0.004;
const TAB = 0.09;

export interface FPCModelProps extends PartModelProps {
  /** Control points in the part's space. Both ends should run straight into their sockets. */
  points?: Vec3[];
}

/**
 * The HBv RPi 160 FPC camera ribbon: a flat 15 way cable with stiffened,
 * bare contact ends. The strip is unique to its route, so this component
 * owns and disposes it.
 */
export function FPCModel({ points = ROUTE }: FPCModelProps) {
  // Callers may pass a fresh array each render, so key on the values.
  const key = points.map((p) => p.join(",")).join(";");
  const ribbon = useMemo(() => ribbonGeometry(points, WIDTH, THICKNESS), [key]);
  useEffect(() => () => ribbon.geometry.dispose(), [ribbon]);
  return (
    <group>
      <mesh geometry={ribbon.geometry} material={getMaterial("ribbon")} castShadow receiveShadow dispose={null} />
      {ribbon.ends.map((end, i) => (
        <RibbonEndTab key={i} end={end} width={WIDTH} thickness={THICKNESS} length={TAB} />
      ))}
    </group>
  );
}
