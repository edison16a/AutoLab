"use client";
import { Cylinder } from "../../primitives";
import { TIP_SHAPE } from "./labware-layout";

const { length, point, taper } = TIP_SHAPE;

/** One unfiltered 1000 µL tip standing on its point, which is the origin. */
export function TipBody() {
  return (
    <Cylinder position={[0, length / 2, 0]} radius={point} height={length} taper={taper} material="tipBlue" />
  );
}
