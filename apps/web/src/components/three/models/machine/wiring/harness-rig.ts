/**
 * What carries each stretch of a wire run, for the Home demo. A cable from
 * a moving part to the frame is fixed at both ends, so it can't simply ride
 * one of them: its ends follow their own rigs and the stretch between
 * blends from one to the other, the way a slack lead flexes. Each harness
 * vertex gets two bones and a weight from this.
 */
import type { RigName } from "../../../motion/Rig";

/** Everything a wire can be fastened to. The frame never moves. */
export type Carrier = "fixed" | RigName;

/** Bone order in the harness skeleton. */
export const CARRIERS: Carrier[] = ["fixed", "gantry", "beam", "carriage"];

/**
 * From point `from` on, the run is fastened to `carrier`. The change from
 * the carrier before it is spread over the `span` segments leading up to
 * that point, so a long span makes a long, gentle bend.
 */
export interface Ride {
  from: number;
  carrier: Carrier;
  span?: number;
}

/** A run that rides one carrier from end to end. */
export function ridesOn(carrier: Carrier): Ride[] {
  return [{ from: 0, carrier }];
}

export interface Blend {
  a: number;
  b: number;
  /** Weight of bone `b`; bone `a` takes the rest. */
  weight: number;
}

/**
 * The two bones and weight at a fractional point index along a run (point
 * `i` of a Catmull-Rom curve sits at index i). Writes into `out`.
 */
export function blendAt(rides: Ride[] | undefined, index: number, out: Blend): Blend {
  out.a = 0;
  out.b = 0;
  out.weight = 0;
  if (!rides?.length) return out;
  let current = CARRIERS.indexOf(rides[0].carrier);
  out.a = current;
  out.b = current;
  for (let i = 1; i < rides.length; i++) {
    const { from, carrier, span = 1 } = rides[i];
    const next = CARRIERS.indexOf(carrier);
    const start = from - span;
    if (index <= start) break;
    if (index >= from) {
      current = next;
      out.a = next;
      out.b = next;
      continue;
    }
    const u = (index - start) / span;
    out.a = current;
    out.b = next;
    out.weight = u * u * (3 - 2 * u);
    break;
  }
  return out;
}
