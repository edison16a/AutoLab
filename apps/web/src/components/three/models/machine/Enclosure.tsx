"use client";
import { Base } from "./Base";
import { Door } from "./Door";
import { EnclosureFrame } from "./EnclosureFrame";
import { Panels } from "./Panels";

export { ENCLOSURE } from "./layout";

/**
 * The insulated enclosure around the printer: the white base with its
 * nameplate, the black V-slot frame, clear acrylic walls and roof, and
 * the gasketed front door.
 */
export function Enclosure() {
  return (
    <group>
      <Base />
      <EnclosureFrame />
      <Panels />
      <Door />
    </group>
  );
}
