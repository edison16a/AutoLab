"use client";
import { useMemo, type ReactNode } from "react";
import { castsShadow, getMaterial, type MaterialKey } from "../../materials";
import { Block, Repeat } from "../../primitives";
import type { Placement, Vec3 } from "../../types";
import { portShellGeometry, type PortHole } from "./port-geometry";

export interface PortProps extends Placement {
  /** Depth along X (the way a plug goes in), height, width. Pass a stable array. */
  size: Vec3;
  /** Openings on the +X face. Pass a stable array. */
  holes: PortHole[];
  /** How far the dark back of each opening sits behind the face. */
  recess: number;
  shell?: MaterialKey;
  /** Width of the flared lip around the front edge. Zero leaves the face plain. */
  rim?: number;
  /** Tongues, contacts and LEDs, in the same space as the housing. */
  children?: ReactNode;
}

const CAP = 0.002;
const RIM_DEPTH = 0.008;

/**
 * A metal connector housing whose +X face has real openings. Rotate the
 * whole port to point it elsewhere. The shell is one seamless mesh; dark
 * plugs fill each opening from `recess` back, and a thin plate closes the
 * back so the openings don't show through from behind.
 */
export function Port({ size, holes, recess, shell = "steel", rim = 0, position, rotation, children }: PortProps) {
  const [depth, height, width] = size;
  // The lip is a thin frame whose inner edge hides inside the shell wall.
  const lip = useMemo(
    () => ({
      size: [RIM_DEPTH, height + rim * 2, width + rim * 2] as Vec3,
      holes: [{ y: 0, height: height - 0.004, width: width - 0.004 }],
    }),
    [height, width, rim],
  );
  const plugs = useMemo(
    () =>
      holes.map((hole) => ({
        position: [-recess / 2, hole.y, hole.z ?? 0] as Vec3,
        scale: [depth - recess, hole.height - 0.001, hole.width - 0.001] as Vec3,
      })),
    [holes, depth, recess],
  );
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={portShellGeometry(size, holes)} material={getMaterial(shell)} castShadow={castsShadow(shell)} receiveShadow dispose={null} />
      <Repeat items={plugs} material="plasticBlack" />
      <Block position={[-depth / 2 - CAP / 2, 0, 0]} size={[CAP, height, width]} material={shell} />
      {rim > 0 ? (
        <mesh
          geometry={portShellGeometry(lip.size, lip.holes)}
          material={getMaterial(shell)}
          position={[depth / 2 - RIM_DEPTH / 2, 0, 0]}
          castShadow={castsShadow(shell)}
          receiveShadow
          dispose={null}
        />
      ) : null}
      {children}
    </group>
  );
}
