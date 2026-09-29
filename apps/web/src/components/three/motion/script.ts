/**
 * A small language for writing the demo as a robot program: move, lower,
 * press the plunger, wait. Each call appends a step with its duration and
 * where the axes end up, and the builder keeps track of where they are, so
 * the cycle reads like the protocol it acts out.
 */
import type { Spot } from "./deck";

export type Ease = "travel" | "smooth" | "gentle" | "linear";

/** Something that happens to the labware during a step, spread over it or at its end. */
export type Effect =
  | { kind: "pick"; socket: number }
  | { kind: "draw"; from: number | "reservoir"; volume: number; spent: boolean }
  | { kind: "give"; to: number | "chute"; volume: number }
  | { kind: "eject" }
  | { kind: "flash" };

/** One step: how long it takes and the axis values it ends on. */
export interface Step {
  duration: number;
  x: number;
  y: number;
  z: number;
  plunger: number;
  ease: Ease;
  effect?: Effect;
}

/** Carriage and gantry travel speed, in scene units a second (about 130 mm/s). */
const TRAVEL_SPEED = 1.6;
/** Quick Z moves in free air. */
const LIFT_SPEED = 1.1;
/** A tip's full plunger stroke, from the first stop back to released, draws this many millilitres. */
export const TIP_VOLUME = 1;
export const FIRST_STOP = 0.8;
export const BLOWOUT = 1;
export const EJECT = 1.12;

export class Script {
  readonly steps: Step[] = [];
  x = 0;
  y = 0;
  z = 0;
  plunger = 0;

  private push(duration: number, ease: Ease, effect?: Effect) {
    this.steps.push({ duration, x: this.x, y: this.y, z: this.z, plunger: this.plunger, ease, effect });
    return this;
  }

  wait(duration: number, effect?: Effect) {
    return this.push(duration, "linear", effect);
  }

  /** Straight up or down to a beam offset. Leave out the duration for a brisk move in free air. */
  lower(z: number, duration?: number, ease: Ease = "smooth", effect?: Effect) {
    const time = duration ?? 0.22 + Math.abs(z - this.z) / LIFT_SPEED;
    this.z = z;
    return this.push(time, ease, effect);
  }

  lift(z: number, duration?: number, ease: Ease = "smooth") {
    return this.lower(z, duration, ease);
  }

  /**
   * X and Y together to a spot, the way the controller runs a coordinated
   * move, after first lifting to `safe` if the tool is lower than that.
   */
  travel(spot: Spot, safe = 0) {
    if (this.z < safe - 1e-6) this.lift(safe);
    const distance = Math.hypot(spot.x - this.x, spot.y - this.y);
    if (distance < 1e-6) return this;
    this.x = spot.x;
    this.y = spot.y;
    return this.push(0.4 + distance / TRAVEL_SPEED, "travel");
  }

  press(plunger: number, duration: number, effect?: Effect) {
    this.plunger = plunger;
    return this.push(duration, "linear", effect);
  }

  /** Holds the pose until the script is `length` seconds long. */
  padTo(length: number) {
    const used = this.steps.reduce((sum, step) => sum + step.duration, 0);
    return this.wait(Math.max(0.1, length - used));
  }
}

/** Where the plunger sits once `volume` millilitres are in the tip, having started from the first stop. */
export function plungerFor(volume: number) {
  return FIRST_STOP * (1 - volume / TIP_VOLUME);
}
