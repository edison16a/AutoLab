"use client";
import { ExtrudeGeometry, Path, Shape } from "three";
import { cachedGeometry } from "../../geometries";
import { getMaterial } from "../../materials";
import { Block, Repeat, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { welded } from "../shared/welded";
import { at, mmX, mmZ, PI_BOARD, PI_HOLES, PI_PARTS, TOP } from "./layout";

const CORNER = mmX(3);
const HOLE_RADIUS = mmX(1.375);

/**
 * The board outline: 3 mm corner radii and the four M2.5 holes where the
 * real Pi has them. The kit's Board centres its holes in each corner, and
 * the off-centre pattern is one of the things that makes a Pi look like a Pi.
 */
function outlineGeometry() {
  return cachedGeometry("pi4:board", () => {
    const { width: w, depth: d, thickness: h } = PI_BOARD;
    const [x0, x1, z0, z1] = [-w / 2, w / 2, -d / 2, d / 2];
    const shape = new Shape();
    shape.moveTo(x0 + CORNER, z0);
    shape.lineTo(x1 - CORNER, z0);
    shape.quadraticCurveTo(x1, z0, x1, z0 + CORNER);
    shape.lineTo(x1, z1 - CORNER);
    shape.quadraticCurveTo(x1, z1, x1 - CORNER, z1);
    shape.lineTo(x0 + CORNER, z1);
    shape.quadraticCurveTo(x0, z1, x0, z1 - CORNER);
    shape.lineTo(x0, z0 + CORNER);
    shape.quadraticCurveTo(x0, z0, x0 + CORNER, z0);
    for (const [xmm, ymm] of PI_HOLES) {
      const [x, z] = at(xmm, ymm);
      // The shape is drawn in X/Y and turned flat below, which flips Y into -Z.
      shape.holes.push(new Path().absarc(x, -z, HOLE_RADIUS, 0, Math.PI * 2, true));
    }
    const geometry = new ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 10 });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -h / 2, 0);
    return welded(geometry);
  });
}

/** Plated pads on both faces of every hole: flattened tori, one draw. */
const PADS: RepeatItem[] = PI_HOLES.flatMap(([xmm, ymm]) => {
  const [x, z] = at(xmm, ymm);
  return [TOP + 0.001, -TOP - 0.001].map((y) => ({ position: [x, y, z] as Vec3, rotation: [-Math.PI / 2, 0, 0] as Vec3 }));
});
const PAD_SCALE: Vec3 = [0.026, 0.026, 0.008];

/** The microSD socket under the left edge, with a card in it standing a little proud. */
function MicroSd() {
  const [x, z] = at(PI_PARTS.microSd[0], PI_PARTS.microSd[1]);
  const [cardX] = at(5.2, 0);
  return (
    <group>
      <Block position={[x, -TOP - 0.011, z]} size={[mmX(12.5), 0.022, mmZ(12)]} radius={0.003} material="steel" />
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

/** The bare board with its pads, the microSD card underneath and the silkscreen. */
export function PiBoard() {
  return (
    <group>
      <mesh geometry={outlineGeometry()} material={getMaterial("pcbGraphite")} castShadow receiveShadow dispose={null} />
      <Repeat items={PADS} shape="torus" material="steel" scale={PAD_SCALE} />
      <MicroSd />
      <Silkscreen />
    </group>
  );
}
