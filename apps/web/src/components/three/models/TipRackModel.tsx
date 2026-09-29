"use client";
import { Block, Repeat, type RepeatItem } from "../primitives";

/** 4 x 6 tips on a 9 mm pitch scaled to fit, about 0.12 units apart. */
const PITCH = 0.12;
const COLLARS: RepeatItem[] = Array.from({ length: 24 }, (_, i) => ({
  position: [((i % 4) - 1.5) * PITCH, 0.37, (Math.floor(i / 4) - 2.5) * PITCH],
}));
const BORES: RepeatItem[] = COLLARS.map((tip) => ({ position: [tip.position[0], 0.406, tip.position[2]] }));

/** A rack of filtered P1000 tips. Only the tip collars stand above the deck. Origin at the base. */
export function TipRackModel() {
  return (
    <group>
      <Block position={[0, 0.15, 0]} size={[0.56, 0.3, 0.78]} radius={0.03} material="plasticGrey" />
      <Block position={[0, 0.315, 0]} size={[0.6, 0.03, 0.82]} radius={0.012} material="graphite" />
      <Repeat items={COLLARS} shape="cylinder" material="plasticWhite" scale={[0.045, 0.08, 0.045]} />
      <Repeat items={BORES} shape="cylinderLow" material="plasticBlack" scale={[0.03, 0.004, 0.03]} />
    </group>
  );
}
