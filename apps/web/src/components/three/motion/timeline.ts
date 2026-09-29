/**
 * The demo as a function of time: poseAt(pose, seconds) writes where every
 * axis is and what the labware holds at that moment. Loops are all the same
 * length, so a time maps straight to a loop and a step within it; the one
 * loop in use is built once and kept, so evaluating a frame allocates
 * nothing. No React here: the scene reads the pose it fills.
 */
import { TIP_RACK, USED_TIPS, PIPETTE_TIP } from "../models/deck/labware-layout";
import { LOOP_SECONDS, LOOPS_PER_RACK, RESERVOIR_PER_LOOP, buildCycle } from "./cycle";
import { PIPETTE_AXIS, RESERVOIR, TIP_ORDER } from "./deck";
import type { MachinePose } from "./pose";
import type { Ease, Step } from "./script";

/** A full rack with the used first column taken out. */
const FULL_RACK = Array.from({ length: TIP_RACK.cols * TIP_RACK.rows }, (_, i) => i)
  .filter((i) => !USED_TIPS.includes(i))
  .reduce((mask, i) => mask | (1 << i), 0);

/** Fan speed once spun up, and how quickly it gets there. */
const FAN_RATE = Math.PI * 2 * 1.3;
const FAN_SPIN_UP = 1.2;
/** Seven blades, so turning by a seventh looks the same; keeps the angle small forever. */
const BLADE_TURN = (Math.PI * 2) / 7;

/**
 * Travel moves follow a trapezoid, like a motion controller: accelerate for
 * the first stretch, cruise, then brake over the last. The rest ease in and
 * out, "gentle" more softly, for moves into liquid or onto a tip.
 */
function ease(kind: Ease, u: number) {
  if (kind === "linear") return u;
  if (kind === "gentle") return 0.5 - 0.5 * Math.cos(Math.PI * u);
  if (kind === "smooth") return u * u * (3 - 2 * u);
  const a = 0.3;
  const top = 1 / (1 - a);
  if (u < a) return (0.5 * top * u * u) / a;
  if (u > 1 - a) return 1 - (0.5 * top * (1 - u) * (1 - u)) / a;
  return 0.5 * top * a + top * (u - a);
}

let cached = { index: -1, steps: [] as Step[] };

function loopSteps(index: number) {
  if (cached.index !== index) cached = { index, steps: buildCycle(index) };
  return cached.steps;
}

/** The labware as it stands when loop `index` begins. */
function startOfLoop(pose: MachinePose, index: number) {
  const round = index % LOOPS_PER_RACK;
  const used = round * 2;
  let rack = FULL_RACK;
  for (let i = 0; i < used; i++) rack &= ~(1 << TIP_ORDER[i]);
  pose.rack = rack;
  pose.chuteTips = used;
  pose.reservoir = 1 - round * RESERVOIR_PER_LOOP;
  pose.wells.fill(1);
  pose.tip = false;
  pose.fill = 0;
  pose.spent = false;
  pose.drop = -1;
  pose.flash = 0;
}

/** Applies a step's effect, `u` of the way through it. */
function apply(pose: MachinePose, step: Step, u: number) {
  const effect = step.effect;
  if (!effect || u <= 0) return;
  switch (effect.kind) {
    case "pick":
      if (u < 1) return;
      pose.rack &= ~(1 << effect.socket);
      pose.tip = true;
      return;
    case "draw":
      pose.fill += effect.volume * u;
      pose.spent = effect.spent;
      if (effect.from === "reservoir") pose.reservoir -= (effect.volume * u) / RESERVOIR.capacity;
      else pose.wells[effect.from] -= effect.volume * u;
      return;
    case "give":
      pose.fill = Math.max(0, pose.fill - effect.volume * u);
      if (effect.to !== "chute") pose.wells[effect.to] += effect.volume * u;
      return;
    case "eject":
      pose.tip = false;
      pose.fill = 0;
      if (u >= 1) {
        pose.chuteTips += 1;
        pose.drop = -1;
        return;
      }
      pose.drop = u;
      pose.dropAt[0] = PIPETTE_AXIS.x + step.x;
      pose.dropAt[1] = PIPETTE_AXIS.y + step.z + PIPETTE_TIP.top;
      pose.dropAt[2] = PIPETTE_AXIS.z + step.y;
      return;
    case "flash":
      pose.flash = u < 1 ? Math.sin(Math.PI * u) : 0;
  }
}

/** Fills `pose` with the machine at `time` seconds into the demo. */
export function poseAt(pose: MachinePose, time: number) {
  const index = Math.floor(time / LOOP_SECONDS);
  const local = time - index * LOOP_SECONDS;
  const steps = loopSteps(index);
  startOfLoop(pose, index);

  // Every loop starts and ends parked, so the first step eases out of the rest pose.
  let start = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  let plunger = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const end = start + step.duration;
    if (local < end || i === steps.length - 1) {
      const u = Math.min(1, Math.max(0, (local - start) / step.duration));
      const e = ease(step.ease, u);
      pose.x = x + (step.x - x) * e;
      pose.y = y + (step.y - y) * e;
      pose.z = z + (step.z - z) * e;
      pose.plunger = plunger + (step.plunger - plunger) * e;
      apply(pose, step, u);
      break;
    }
    apply(pose, step, 1);
    ({ x, y, z, plunger } = step);
    start = end;
  }

  const spun = time - FAN_SPIN_UP * (1 - Math.exp(-time / FAN_SPIN_UP));
  pose.fan = (FAN_RATE * spun) % BLADE_TURN;
}
