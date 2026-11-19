"use client";
import { Spin } from "../../motion/Spin";
import { fanAngle } from "../../motion/turns";
import { Block, Cylinder, Repeat, Ring, TextDecal, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";

/** The housing, flange and the perforated diffuser under it, sized to sit inside the roof's top rails. */
const BOX = { width: 1.9, depth: 1.4, height: 0.34 } as const;
const FLANGE = 0.03;
const DIFFUSER = { width: 1.72, depth: 1.22, y: -0.025 } as const;
const COWL = { radius: 0.42, height: 0.1 } as const;

/** The diffuser's holes on a regular grid, so the filtered air leaves it as an even sheet. */
const HOLES: RepeatItem[] = Array.from({ length: 22 * 15 }, (_, i) => {
  const col = i % 22;
  const row = Math.floor(i / 22);
  return { position: [(col - 10.5) * 0.075, DIFFUSER.y - 0.0055, (row - 7) * 0.075] as Vec3 };
});
const HOLE_SCALE: Vec3 = [0.018, 0.002, 0.018];
/** Seven curved impeller blades, seen through the intake guard. */
const BLADES: RepeatItem[] = Array.from({ length: 7 }, (_, i) => {
  const a = (i * Math.PI * 2) / 7;
  return { position: [Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22] as Vec3, rotation: [0.5, -a, 0] as Vec3 };
});
const BLADE_SCALE: Vec3 = [0.03, 0.06, 0.3];
const GUARD_RINGS = [0.12, 0.24, 0.35];

/**
 * The HEPA fan filter unit on the roof, the heart of the enclosure upgrade:
 * a fan draws room air in through the guard on top, pushes it through a
 * pleated H14 HEPA filter and out of the perforated diffuser underneath as
 * a gentle, even downflow across the whole chamber, so any particles are
 * swept down and away from the open plate. A white powder coated steel
 * housing on an aluminium flange, with the speed controller on its right
 * side. The impeller turns with the circulation fan in the Home demo.
 * Origin at the middle of the flange's underside, on the roof panel.
 */
export function HepaFilterModel() {
  const { width, depth, height } = BOX;
  const top = FLANGE + height;
  return (
    <group>
      <Block position={[0, FLANGE / 2, 0]} size={[width + 0.06, FLANGE, depth + 0.06]} radius={0.008} material="aluminium" />
      <Block position={[0, FLANGE + height / 2, 0]} size={[width, height, depth]} radius={0.04} material="powderWhite" />
      {/* The pleated filter's edge shows in a band round the housing's foot. */}
      <Block position={[0, FLANGE + 0.05, 0]} size={[width + 0.004, 0.06, depth + 0.004]} material="filterMedia" />
      {/* Diffuser under the roof, with its grid of holes. */}
      <Block position={[0, DIFFUSER.y, 0]} size={[DIFFUSER.width, 0.01, DIFFUSER.depth]} material="plasticWhite" />
      <Repeat items={HOLES} shape="cylinderLow" material="plasticGrey" scale={HOLE_SCALE} />
      {/* Fan cowl and intake on top: the impeller behind a wire guard. */}
      <Cylinder position={[0, top + COWL.height / 2, 0]} radius={COWL.radius} height={COWL.height} material="powderWhite" />
      <Cylinder position={[0, top + COWL.height + 0.002, 0]} radius={COWL.radius - 0.03} height={0.004} material="plasticBlack" />
      <group position={[0, top + COWL.height - 0.03, 0]}>
        <Spin axis="y" angle={fanAngle}>
          <Repeat items={BLADES} material="plasticGrey" scale={BLADE_SCALE} />
          <Cylinder radius={0.08} height={0.05} material="plasticGrey" />
        </Spin>
      </group>
      {GUARD_RINGS.map((r) => (
        <Ring key={r} position={[0, top + COWL.height + 0.012, 0]} radius={r} thin material="steel" />
      ))}
      {[0, 1].map((i) => (
        <Block key={i} position={[0, top + COWL.height + 0.012, 0]} rotation={[0, (i * Math.PI) / 2, 0]} size={[COWL.radius * 2 - 0.06, 0.008, 0.008]} material="steel" />
      ))}
      {/* Rating label on the front face. */}
      <group position={[-0.45, FLANGE + height / 2 + 0.02, depth / 2 + 0.002]}>
        <Block size={[0.62, 0.16, 0.002]} material="labelWhite" />
        <TextDecal text="HEPA H14 · laminar flow" position={[0, 0, 0.002]} rotation={[0, 0, 0]} width={0.56} height={0.07} ink="dark" weight={600} />
      </group>
      {/* Speed controller on the right side: a black box with its knob. */}
      <Block position={[width / 2 + 0.06, FLANGE + height / 2, 0.3]} size={[0.12, 0.2, 0.26]} radius={0.02} material="plasticBlack" />
      <Cylinder position={[width / 2 + 0.135, FLANGE + height / 2, 0.3]} rotation={[0, 0, Math.PI / 2]} radius={0.045} height={0.04} material="plasticGrey" />
    </group>
  );
}
