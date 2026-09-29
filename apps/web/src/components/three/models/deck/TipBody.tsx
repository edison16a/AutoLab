"use client";
import { Cylinder } from "../../primitives";
import { TIP_SHAPE } from "./labware-layout";

const { length, point, taper, filter } = TIP_SHAPE;

/** One filtered P1000 tip standing on its point, which is the origin. */
export function TipBody() {
  return (
    <group>
      <Cylinder position={[0, length / 2, 0]} radius={point} height={length} taper={taper} material="tipBlue" />
      <Cylinder position={[0, filter.at, 0]} radius={filter.radius} height={filter.height} material="plasticWhite" />
    </group>
  );
}
