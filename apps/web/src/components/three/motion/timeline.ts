/**
 * The demo as a function of time: poseAt(pose, seconds) writes where every
 * axis is, how far each pump has turned, which valve ports are open and
 * what the labware holds at that moment. Loops are all the same length, so
 * a time maps straight to a loop and a step within it; the one loop in use
 * is built once and kept, so evaluating a frame allocates nothing. No React
 * here: the scene reads the pose it fills.
 */
import { BOTTLE_REST, FULL_RACK, NOSE_TIP } from "../models/deck/labware-layout";
import { LOOP_SECONDS, LOOPS_PER_RACK, MEDIA_PER_LOOP, WASTE_PER_LOOP, WELLS_PER_LOOP, buildCycle } from "./cycle";
import { BIN, HEAD_AXIS, TIP_ORDER } from "./deck";
import type { MachinePose } from "./pose";
import type { Ease, Step } from "./script";

/** Fan speed once spun up, and how quickly it gets there. */
const FAN_RATE = Math.PI * 2 * 1.3;
const FAN_SPIN_UP = 1.2;
/** Seven blades, so turning by a seventh looks the same; keeps the angle small forever. */
const BLADE_TURN = (Math.PI * 2) / 7;
/** Pump rotor speed while it runs, about 70 rpm, and its three rollers' symmetry. */
const PUMP_RATE = Math.PI * 2 * 1.2;
const ROLLER_TURN = (Math.PI * 2) / 3;
/** How much of the tip shows spent media while the line draws through it. */
const TIP_FLOW = 0.4;

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

/**
 * Signed rotor travel, in radians, a step gives each pump `u` of the way
 * through it: positive pushes toward the head, negative draws back toward
 * the valve and waste.
 */
function pumpTurn(step: Step, u: number): [number, number] {
  const effect = step.effect;
  if (!effect) return [0, 0];
  const turn = PUMP_RATE * step.duration * u;
  switch (effect.kind) {
    case "dispense":
      return [turn, 0];
    case "aspirate":
      return [0, -turn];
    case "suction":
      return effect.pump === "addition" ? [-turn, 0] : [0, -turn];
    default:
      return [0, 0];
  }
}

/** How far each rotor turns over a whole loop; the same every loop, since only the wells change. */
let loopTurn: [number, number] | null = null;

function perLoopTurn(): [number, number] {
  if (!loopTurn) {
    loopTurn = [0, 0];
    for (const step of buildCycle(0)) {
      const [a, b] = pumpTurn(step, 1);
      loopTurn[0] += a;
      loopTurn[1] += b;
    }
  }
  return loopTurn;
}

/** Keeps a rotor angle small and positive; three rollers look the same every third of a turn. */
const wrap = (angle: number) => ((angle % ROLLER_TURN) + ROLLER_TURN) % ROLLER_TURN;

/** The labware as it stands when loop `index` begins. */
function startOfLoop(pose: MachinePose, index: number) {
  const round = index % LOOPS_PER_RACK;
  const used = round * WELLS_PER_LOOP;
  let rack = FULL_RACK;
  for (let i = 0; i < used; i++) rack &= ~(1 << TIP_ORDER[i]);
  pose.rack = rack;
  pose.chuteTips = used;
  pose.media = BOTTLE_REST.media - round * MEDIA_PER_LOOP;
  pose.waste = BOTTLE_REST.waste + round * WASTE_PER_LOOP;
  pose.wells.fill(1);
  pose.tip = false;
  pose.fill = 0;
  pose.drop = -1;
  pose.flash = 0;
  const [a, b] = perLoopTurn();
  pose.additionPump = wrap(a * index);
  pose.aspirationPump = wrap(b * index);
}

/** What only lasts while a step runs: open valves, liquid in the tip, the needle's stream. */
function clearTransients(pose: MachinePose) {
  pose.additionValve = -1;
  pose.aspirationValve = -1;
  pose.stream = 0;
  pose.fill = 0;
}

/** A soft rise at the start of a pump run and a fall at its end, for things that flow while it runs. */
function flowWindow(u: number) {
  return Math.min(1, u / 0.12, (1 - u) / 0.12);
}

/** Applies a step's effect, `u` of the way through it. */
function apply(pose: MachinePose, step: Step, u: number) {
  const effect = step.effect;
  if (!effect || u <= 0) return;
  const [a, b] = pumpTurn(step, u);
  pose.additionPump += a;
  pose.aspirationPump += b;
  const running = u < 1;
  switch (effect.kind) {
    case "pick":
      if (running) return;
      pose.rack &= ~(1 << effect.socket);
      pose.tip = true;
      return;
    case "aspirate":
      pose.wells[effect.well] -= effect.volume * u;
      pose.waste += (WASTE_PER_LOOP / WELLS_PER_LOOP) * u;
      if (!running) return;
      pose.aspirationValve = 0;
      pose.fill = TIP_FLOW * flowWindow(u);
      return;
    case "dispense":
      pose.wells[effect.well] += effect.volume * u;
      pose.media -= (MEDIA_PER_LOOP / WELLS_PER_LOOP) * u;
      if (!running) return;
      pose.additionValve = 0;
      pose.stream = flowWindow(u);
      return;
    case "suction":
      if (!running) return;
      if (effect.pump === "addition") pose.additionValve = 2;
      else pose.aspirationValve = 0;
      return;
    case "strip":
      // The plate holds the tip where it was as the nose lifts out of it.
      pose.tip = false;
      pose.drop = 0;
      pose.dropAt[0] = HEAD_AXIS.x + step.x;
      pose.dropAt[1] = HEAD_AXIS.y + BIN.under + NOSE_TIP.top;
      pose.dropAt[2] = HEAD_AXIS.z + step.y;
      return;
    case "drop":
      if (running) {
        pose.drop = u;
        return;
      }
      pose.chuteTips += 1;
      pose.drop = -1;
      return;
    case "flash":
      pose.flash = running ? Math.sin(Math.PI * u) : 0;
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
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const end = start + step.duration;
    if (local < end || i === steps.length - 1) {
      const u = Math.min(1, Math.max(0, (local - start) / step.duration));
      const e = ease(step.ease, u);
      pose.x = x + (step.x - x) * e;
      pose.y = y + (step.y - y) * e;
      pose.z = z + (step.z - z) * e;
      clearTransients(pose);
      apply(pose, step, u);
      break;
    }
    apply(pose, step, 1);
    ({ x, y, z } = step);
    start = end;
  }

  const spun = time - FAN_SPIN_UP * (1 - Math.exp(-time / FAN_SPIN_UP));
  pose.fan = (FAN_RATE * spun) % BLADE_TURN;
}
