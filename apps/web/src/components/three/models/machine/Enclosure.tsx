"use client";
import { Base } from "./Base";
import { Door } from "./Door";
import { EnclosureFrame } from "./EnclosureFrame";
import { Panels } from "./Panels";

export { ENCLOSURE } from "./layout";

/**
 * The enclosure around the printer: the base with its nameplate, the
 * black V-slot frame, the clear acrylic side panel and the gasketed front
 * door. The back, left and top stay open, so every part is in plain view.
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
