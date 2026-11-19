"use client";
import { useRef } from "react";
import type { Group } from "three";
import { castsShadow, getMaterial, receivesShadow } from "../materials";
import { usePoseFrame } from "../motion/use-pose-frame";
import { Block, Repeat, TextDecal, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { WELL_PLATE, wellCentre } from "./deck/labware-layout";
import { WellMedia } from "./deck/WellMedia";
import { mm } from "./details/units";
import { perforatedPlate, type PlateHole } from "./geometry/shapes";

const PLATE = WELL_PLATE;
const PITCH = WELL_PLATE.pitch;
const WELL_RADIUS = WELL_PLATE.wellRadius;
const SKIRT = WELL_PLATE.skirt;
const DECK = { inset: mm(1.4), height: PLATE.height - SKIRT } as const;
const COLUMNS = ["1", "2", "3", "4", "5", "6"];
const ROWS = ["A", "B", "C", "D"];
const WELLS: PlateHole[] = Array.from({ length: ROWS.length * COLUMNS.length }, (_, index) => {
  const [x, z] = wellCentre(index);
  return { x, z, radius: WELL_RADIUS };
});
/** Outer edges of the well grid, so the labels sit centred in the margins. */
const GRID = { x: 2.5 * PITCH + WELL_RADIUS, z: 1.5 * PITCH + WELL_RADIUS } as const;
const BOTTOM = -PLATE.height / 2;
const LABEL = { size: mm(3.4), weight: 500 } as const;
/**
 * The lid sits on the well rims and hangs its skirt round the plate's
 * sides, with a raised condensation ring over every well.
 */
const LID = { gap: mm(1.2), top: mm(1.2), skirt: mm(8), wall: mm(1) } as const;
const RINGS: RepeatItem[] = WELLS.map(({ x, z }) => ({ position: [x, PLATE.height / 2 + LID.top + mm(0.2), z] as Vec3, rotation: [-Math.PI / 2, 0, 0] as Vec3 }));
const RING_SCALE: Vec3 = [WELL_RADIUS + mm(0.6), WELL_RADIUS + mm(0.6), mm(4)];

/**
 * The clear lid, drawn as its top sheet and four skirt walls. The head
 * can't reach the wells through it, so it is off for the whole Home demo,
 * as if taken off before the run; the still machine shows it on.
 */
function Lid() {
  const width = PLATE.width + LID.gap * 2;
  const depth = PLATE.depth + LID.gap * 2;
  const top = PLATE.height / 2 + LID.top;
  const wallY = top - LID.skirt / 2;
  const lid = useRef<Group>(null);
  usePoseFrame(
    () => {
      if (lid.current) lid.current.visible = false;
    },
    () => {
      if (lid.current) lid.current.visible = true;
    },
  );
  return (
    <group ref={lid}>
      <Block position={[0, top - LID.top / 2, 0]} size={[width, LID.top, depth]} radius={mm(0.5)} material="polystyrene" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block position={[side * (width / 2 - LID.wall / 2), wallY, 0]} size={[LID.wall, LID.skirt, depth]} material="polystyrene" />
          <Block position={[0, wallY, side * (depth / 2 - LID.wall / 2)]} size={[width - LID.wall * 2, LID.skirt, LID.wall]} material="polystyrene" />
        </group>
      ))}
      <Repeat items={RINGS} shape="torusThin" material="polystyrene" scale={RING_SCALE} />
    </group>
  );
}

/**
 * A 24-well culture plate in clear polystyrene: the skirted base and a
 * deck with 24 real wells cut through it, each holding pink culture media,
 * the row letters and column numbers moulded on top, and the clear lid
 * over it all. Origin at the middle of the plate.
 */
export function WellPlateModel() {
  const deckWidth = PLATE.width - DECK.inset * 2;
  const deckDepth = PLATE.depth - DECK.inset * 2;
  const top = PLATE.height / 2;
  return (
    <group>
      {/* A hair shorter than the skirt, so the clear base doesn't flicker against the bed it rests on. */}
      <Block position={[0, BOTTOM + SKIRT / 2 + mm(0.05), 0]} size={[PLATE.width, SKIRT - mm(0.1), PLATE.depth]} radius={mm(1.5)} material="polystyrene" />
      <mesh
        geometry={perforatedPlate("wells24", deckWidth, deckDepth, DECK.height, mm(3), WELLS)}
        material={getMaterial("polystyrene")}
        position={[0, BOTTOM + SKIRT + DECK.height / 2, 0]}
        castShadow={castsShadow("polystyrene")}
        receiveShadow={receivesShadow("polystyrene")}
        dispose={null}
      />
      <WellMedia />
      {COLUMNS.map((label, i) => (
        <TextDecal key={label} text={label} position={[(i - 2.5) * PITCH, top + 0.0006, -(GRID.z + deckDepth / 2) / 2]} width={LABEL.size} height={LABEL.size} ink="dark" weight={LABEL.weight} />
      ))}
      {ROWS.map((label, i) => (
        <TextDecal key={label} text={label} position={[-(GRID.x + deckWidth / 2) / 2, top + 0.0006, (i - 1.5) * PITCH]} width={LABEL.size} height={LABEL.size} ink="dark" weight={LABEL.weight} />
      ))}
      <Lid />
    </group>
  );
}
