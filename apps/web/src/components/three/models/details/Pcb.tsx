"use client";
import { useMemo } from "react";
import { castsShadow, getMaterial, type MaterialKey } from "../../materials";
import { Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { perforatedPlate, type PlateHole } from "../geometry/shapes";
import { mm } from "./units";

export interface PcbProps {
  /** Width (X), thickness (Y) and depth (Z). The board is centred on its origin, parts go on +Y. */
  size: Vec3;
  /** Mounting holes at their real size and place, which the kit Board can't vary. */
  holes?: PlateHole[];
  corner?: number;
  material?: MaterialKey;
  /** Pad finish: gold (ENIG) on the better boards, bright tin (HASL) on cheap ones. */
  finish?: "gold" | "tin";
  /** Names this outline in the geometry cache, since boards with the same size can differ in holes. */
  name: string;
}

/** Plated rings are this much wider than their hole. */
const PLATING = mm(0.7);

/**
 * A bare board with holes where the datasheet puts them, each ringed with
 * plating on the top face. Small breakouts need small holes, and the kit
 * Board's fixed hole size would swamp them.
 */
export function Pcb({ size: [w, t, d], holes = [], corner = mm(1), material = "pcbGraphite", finish = "gold", name }: PcbProps) {
  const rings = useMemo<RepeatItem[]>(
    () =>
      holes.map((hole) => {
        const r = hole.radius + PLATING / 2;
        return { position: [hole.x, t / 2 + 0.0004, hole.z] as Vec3, rotation: [-Math.PI / 2, 0, 0] as Vec3, scale: [r, r, r * 0.6] as Vec3 };
      }),
    [holes, t],
  );
  return (
    <>
      <mesh
        geometry={perforatedPlate(name, w, d, t, corner, holes)}
        material={getMaterial(material)}
        castShadow={castsShadow(material)}
        receiveShadow
        dispose={null}
      />
      {rings.length ? <Repeat items={rings} shape="torus" material={finish} /> : null}
    </>
  );
}
