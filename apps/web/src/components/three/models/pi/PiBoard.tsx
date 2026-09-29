"use client";
import { getMaterial } from "../../materials";
import { Block, Repeat, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { boardGeometry, type BoardOutline } from "../shared/board-geometry";
import { at, mmX, mmZ, PI_BOARD, PI_HOLES, PI_PARTS, TOP } from "./layout";

/**
 * The board outline: 3 mm corner radii and the four M2.5 holes where the
 * real Pi has them. The off-centre hole pattern is one of the things that
 * makes a Pi look like a Pi.
 */
const OUTLINE: BoardOutline = {
  key: "pi4",
  width: PI_BOARD.width,
  depth: PI_BOARD.depth,
  thickness: PI_BOARD.thickness,
  corner: mmX(3),
  holes: PI_HOLES.map(([x, y]) => at(x, y)),
  holeRadius: mmX(1.375),
};

/** Gold (ENIG) pads on both faces of every hole: flattened tori, one draw. */
const PADS: RepeatItem[] = PI_HOLES.flatMap(([xmm, ymm]) => {
  const [x, z] = at(xmm, ymm);
  return [TOP + 0.001, -TOP - 0.001].map((y) => ({ position: [x, y, z] as Vec3, rotation: [-Math.PI / 2, 0, 0] as Vec3 }));
});
const PAD_SCALE: Vec3 = [0.027, 0.027, 0.008];

/** Round gold fiducials the pick and place machine lines up on, in gaps between parts. */
const FIDUCIALS: RepeatItem[] = ([
  [18.6, 3.4],
  [3.2, 45.5],
  [52.5, 27],
] as const).map(([xmm, ymm]) => {
  const [x, z] = at(xmm, ymm);
  return { position: [x, TOP + 0.0005, z] as Vec3 };
});
const FIDUCIAL_SCALE: Vec3 = [0.011, 0.001, 0.011];

/** The nickel plated microSD socket under the left edge, with a black card standing a little proud. */
function MicroSd() {
  const [x, z] = at(PI_PARTS.microSd[0], PI_PARTS.microSd[1]);
  const [cardX] = at(5.2, 0);
  return (
    <group>
      <Block position={[x, -TOP - 0.011, z]} size={[mmX(12.5), 0.022, mmZ(12)]} radius={0.003} material="tin" />
      <Block position={[cardX, -TOP - 0.012, z]} size={[mmX(15.4), 0.009, mmZ(11)]} radius={0.003} material="plasticBlack" />
    </group>
  );
}

/** Board silkscreen: the model name, the copyright line and a few port labels. */
function Silkscreen() {
  const [nameX, nameZ] = at(25.5, 19.8);
  const [copyX, copyZ] = at(28, 16.4);
  const [poeX, poeZ] = at(PI_PARTS.poe[0], PI_PARTS.poe[1] - 4.4);
  const y = TOP + 0.0006;
  return (
    <group>
      <TextDecal text="Raspberry Pi 4 Model B" position={[nameX, y, nameZ]} width={0.25} height={0.03} weight={600} />
      <TextDecal text="© Raspberry Pi 2018" position={[copyX, y, copyZ]} width={0.16} height={0.022} weight={500} />
      <TextDecal text="POE" position={[poeX, y, poeZ]} width={0.05} height={0.02} weight={600} />
    </group>
  );
}

/** The bare board in its green solder mask, with gold pads, the microSD card underneath and white silkscreen. */
export function PiBoard() {
  return (
    <group>
      <mesh geometry={boardGeometry(OUTLINE)} material={getMaterial("pcbGreen")} castShadow receiveShadow dispose={null} />
      <Repeat items={PADS} shape="torus" material="gold" scale={PAD_SCALE} />
      <Repeat items={FIDUCIALS} shape="cylinderLow" material="gold" scale={FIDUCIAL_SCALE} />
      <MicroSd />
      <Silkscreen />
    </group>
  );
}
