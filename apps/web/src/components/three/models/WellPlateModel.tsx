"use client";
import { castsShadow, getMaterial } from "../materials";
import { Block, Repeat, TextDecal, type RepeatItem } from "../primitives";
import type { Vec3 } from "../types";
import { mm } from "./details/units";
import { perforatedPlate, type PlateHole } from "./geometry/shapes";

/** ANSI/SLAS footprint: 127.76 x 85.48 mm, 20 mm tall. */
const PLATE = { width: mm(127.76), depth: mm(85.48), height: mm(20) } as const;
/** 24 wells, 4 rows by 6, on a 19.3 mm pitch, 15.6 mm across. */
const PITCH = mm(19.3);
const WELL_RADIUS = mm(7.8);
const SKIRT = mm(4);
const DECK = { inset: mm(1.4), height: PLATE.height - SKIRT } as const;
const COLUMNS = ["1", "2", "3", "4", "5", "6"];
const ROWS = ["A", "B", "C", "D"];
const WELLS: PlateHole[] = ROWS.flatMap((_, row) =>
  COLUMNS.map((__, column) => ({ x: (column - 2.5) * PITCH, z: (row - 1.5) * PITCH, radius: WELL_RADIUS })),
);
/** Outer edges of the well grid, so the labels sit centred in the margins. */
const GRID = { x: 2.5 * PITCH + WELL_RADIUS, z: 1.5 * PITCH + WELL_RADIUS } as const;
const BOTTOM = -PLATE.height / 2;
/** A few millimetres of media in every well, as clear discs. */
const MEDIA_DEPTH = mm(4);
const MEDIA: RepeatItem[] = WELLS.map(({ x, z }) => ({ position: [x, BOTTOM + SKIRT + MEDIA_DEPTH / 2, z] as Vec3 }));
const MEDIA_SCALE: Vec3 = [WELL_RADIUS - mm(0.2), MEDIA_DEPTH, WELL_RADIUS - mm(0.2)];
const LABEL = { size: mm(3.4), weight: 500 } as const;

/**
 * A 24-well culture plate: the skirted base and a deck with 24 real
 * wells cut through it, each holding a little media, with the row letters
 * and column numbers moulded on top. Origin at the middle of the plate.
 */
export function WellPlateModel() {
  const deckWidth = PLATE.width - DECK.inset * 2;
  const deckDepth = PLATE.depth - DECK.inset * 2;
  const top = PLATE.height / 2;
  return (
    <group>
      <Block position={[0, BOTTOM + SKIRT / 2, 0]} size={[PLATE.width, SKIRT, PLATE.depth]} radius={mm(1.5)} material="plasticWhite" />
      <mesh
        geometry={perforatedPlate("wells24", deckWidth, deckDepth, DECK.height, mm(3), WELLS)}
        material={getMaterial("plasticWhite")}
        position={[0, BOTTOM + SKIRT + DECK.height / 2, 0]}
        castShadow={castsShadow("plasticWhite")}
        receiveShadow
        dispose={null}
      />
      <Repeat items={MEDIA} shape="cylinder" material="liquid" scale={MEDIA_SCALE} />
      {COLUMNS.map((label, i) => (
        <TextDecal key={label} text={label} position={[(i - 2.5) * PITCH, top + 0.0006, -(GRID.z + deckDepth / 2) / 2]} width={LABEL.size} height={LABEL.size} ink="dark" weight={LABEL.weight} />
      ))}
      {ROWS.map((label, i) => (
        <TextDecal key={label} text={label} position={[-(GRID.x + deckWidth / 2) / 2, top + 0.0006, (i - 1.5) * PITCH]} width={LABEL.size} height={LABEL.size} ink="dark" weight={LABEL.weight} />
      ))}
    </group>
  );
}
