"use client";
import { Base } from "./Base";
import { Door } from "./Door";
import { EnclosureFrame } from "./EnclosureFrame";
import { FoamWalls } from "./FoamWalls";
import { Panels } from "./Panels";

export { ENCLOSURE } from "./layout";

/**
 * The insulated enclosure around the printer: the base with its
 * nameplate, the black V-slot frame, pink foam board on the back, left
 * and roof, the clear acrylic side panel, and the gasketed front door.
 */
export function Enclosure() {
  return (
    <group>
      <Base />
      <EnclosureFrame />
      <FoamWalls />
      <Panels />
      <Door />
    </group>
  );
}
