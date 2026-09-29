"use client";
import { Block, Repeat, TextDecal, type RepeatItem } from "../primitives";

/** 24 wells: 4 rows of 6 on a 19.3 mm pitch, about 0.24 units. */
const PITCH = 0.24;
const WELLS: RepeatItem[] = Array.from({ length: 24 }, (_, i) => ({
  position: [((i % 6) - 2.5) * PITCH, 0.09, (Math.floor(i / 6) - 1.5) * PITCH],
}));
const COLUMNS = ["1", "2", "3", "4", "5", "6"];
const ROWS = ["A", "B", "C", "D"];
const RIMS: RepeatItem[] = WELLS.map((well) => ({ position: [well.position[0], 0.1, well.position[2]], rotation: [-Math.PI / 2, 0, 0] }));

/**
 * A standard 24-well culture plate (127.8 x 85.5 mm) in the nest. Each well
 * is a raised rim around a disc of media, drawn as two instanced batches.
 */
export function WellPlateModel() {
  return (
    <group>
      <Block size={[1.58, 0.18, 1.06]} radius={0.03} material="plasticWhite" />
      <Repeat items={WELLS} shape="cylinder" material="liquid" scale={[0.095, 0.012, 0.095]} />
      <Repeat items={RIMS} shape="torus" material="plasticWhite" scale={[0.1, 0.1, 0.1]} />
      {COLUMNS.map((label, i) => (
        <TextDecal key={label} text={label} position={[(i - 2.5) * PITCH, 0.092, -0.5]} width={0.06} height={0.05} ink="dark" weight={500} />
      ))}
      {ROWS.map((label, i) => (
        <TextDecal key={label} text={label} position={[-0.755, 0.092, (i - 1.5) * PITCH]} width={0.06} height={0.05} ink="dark" weight={500} />
      ))}
    </group>
  );
}
