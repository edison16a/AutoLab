/**
 * Where a bundle ends in loose jumper wires: each wire leaves the end of
 * the bundle and drops straight into its own pin or hole, the way dupont
 * jumpers splay out onto a header or a breadboard.
 */
import type { MaterialKey } from "../../../materials";
import type { RepeatItem } from "../../../primitives";
import type { Vec3 } from "../../../types";
import type { WireRun } from "./harness-geometry";

/** Height of a jumper's housing, from the pin's base to where its wire leaves. */
export const HOUSING = 0.15;

/**
 * One single wire run per pin, from the bundle's end to the top of the
 * housing standing on that pin, plus the housings themselves. `base` is
 * the height the housings stand on.
 */
export function fanOut(from: Vec3, wires: MaterialKey[], pins: [number, number][], base: number) {
  const top = base + HOUSING;
  const runs: WireRun[] = wires.map((material, i) => {
    const [x, z] = pins[i];
    const spread = (i - (wires.length - 1) / 2) * 0.012;
    return {
      wires: [material],
      twist: 0,
      points: [
        [from[0], from[1], from[2] + spread],
        [(from[0] + x) / 2, Math.max(from[1], top + 0.05), (from[2] + z) / 2],
        [x, top + 0.05, z],
        [x, top - 0.01, z],
      ],
    };
  });
  const housings: RepeatItem[] = pins.map(([x, z]) => ({ position: [x, base + HOUSING / 2, z] }));
  return { runs, housings };
}
