/**
 * A small language for writing the demo as a robot program: move, lower,
 * run a pump, wait. Each call appends a step with its duration and where
 * the axes end up, and the builder keeps track of where they are, so the
 * cycle reads like the protocol it acts out.
 */
import type { Spot } from "./deck";

export type Ease = "travel" | "smooth" | "gentle" | "linear";

/** Which pump runs during a step. */
export type PumpName = "addition" | "aspiration";

/**
 * Something that happens during a step, spread over it or at its end. The
 * pump effects say which pump turns and which port its valve opens; the
 * timeline turns them into rotor angles, valve lights and liquid moving.
 */
export type Effect =
  | { kind: "pick"; socket: number }
  /** Aspiration pump draws spent media from a well up through the tip to waste. */
  | { kind: "aspirate"; well: number; volume: number }
  /** Addition pump pushes fresh media out of the needle into a well. */
  | { kind: "dispense"; well: number; volume: number }
  /** A pump runs back toward waste with nothing at the head, clearing its line. */
  | { kind: "suction"; pump: PumpName }
  /** The stripper holds the tip back as the nose lifts out of it... */
  | { kind: "strip" }
  /** ...and then lets it fall into the bin. */
  | { kind: "drop" }
  | { kind: "flash" };

/** One step: how long it takes and the axis values it ends on. */
export interface Step {
  duration: number;
  x: number;
  y: number;
  z: number;
  ease: Ease;
  effect?: Effect;
}

/** Carriage and gantry travel speed, in scene units a second (about 130 mm/s). */
const TRAVEL_SPEED = 1.6;
/** Quick Z moves in free air. */
const LIFT_SPEED = 1.1;

export class Script {
  readonly steps: Step[] = [];
  x = 0;
  y = 0;
  z = 0;

  private push(duration: number, ease: Ease, effect?: Effect) {
    this.steps.push({ duration, x: this.x, y: this.y, z: this.z, ease, effect });
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

  lift(z: number, duration?: number, ease: Ease = "smooth", effect?: Effect) {
    return this.lower(z, duration, ease, effect);
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

  /** A short, slow sideways move at the current height, like sliding the nose into the stripper's slot. */
  slide(spot: Spot, duration: number) {
    this.x = spot.x;
    this.y = spot.y;
    return this.push(duration, "gentle");
  }

  /** How long the script runs so far. */
  get length() {
    return this.steps.reduce((sum, step) => sum + step.duration, 0);
  }

  /** Holds the pose until the script is `length` seconds long. */
  padTo(length: number) {
    return this.wait(Math.max(0.1, length - this.length));
  }
}
