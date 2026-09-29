/**
 * One loop of the Home demo: a small media change on three wells, written
 * the way a lab would program it. A first tip takes spent media off each
 * well and empties it into the chute; a fresh tip draws warm media from
 * the reservoir and gives each well its share back; then the machine
 * parks and the camera takes a picture. Each loop picks other wells.
 */
import { CHUTE, HOME, REACHABLE_WELLS, RESERVOIR, TIP_ORDER, TIP_SEAT, WELL, socketSpot, tipAt, wellSpot } from "./deck";
import { BLOWOUT, EJECT, FIRST_STOP, Script, plungerFor, type Step } from "./script";

/** Each well gives up and gets back this many millilitres, a third of its usual 1 mL. */
export const DOSE = 0.3;
const WELLS_PER_LOOP = 3;
/** Every loop runs this long, so any moment maps straight to a loop and a time within it. */
export const LOOP_SECONDS = 48;
/** A loop uses two tips; once the reachable ones are gone the rack and chute are swapped for fresh ones. */
export const LOOPS_PER_RACK = TIP_ORDER.length / 2;
/** What a loop takes from the reservoir, as a share of a full one. */
export const RESERVOIR_PER_LOOP = (DOSE * WELLS_PER_LOOP) / RESERVOIR.capacity;

/** A few millimetres over the plate's top: the safe height for short hops between wells. */
const HOP = tipAt(WELL.top + 0.05);
/** Just over a trough's rim. */
const OVER_TROUGH = tipAt(RESERVOIR.rim + 0.03);

/** A small seeded generator, so loop n always picks the same wells. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Three wells for a loop, visited column by column in a snake, as a planner would to keep hops short. */
export function wellsFor(loop: number): number[] {
  const next = random(loop * 7919 + 17);
  const pool = [...REACHABLE_WELLS];
  const picked = Array.from({ length: WELLS_PER_LOOP }, () => pool.splice(Math.floor(next() * pool.length), 1)[0]);
  const column = (well: number) => well % 6;
  const row = (well: number) => Math.floor(well / 6);
  return picked.sort((a, b) => column(a) - column(b) || (column(a) % 2 ? row(b) - row(a) : row(a) - row(b)));
}

/** Down onto a waiting tip: quick to just above it, slow into its collar, a firm press to seal, then out slowly. */
function pickUp(s: Script, socket: number) {
  s.travel(socketSpot(socket));
  s.wait(0.15);
  s.lower(TIP_SEAT + 0.05, 0.45);
  s.lower(TIP_SEAT, 0.5, "gentle");
  s.lower(TIP_SEAT - 0.015, 0.3, "gentle", { kind: "pick", socket });
  s.wait(0.3);
  s.lift(TIP_SEAT + 0.06, 0.55, "gentle");
  s.lift(0);
}

/** Plunger to the first stop above the liquid, then a third of the stroke back in each well. */
function takeSpent(s: Script, wells: number[]) {
  wells.forEach((well, i) => {
    s.travel(wellSpot(well), i === 0 ? 0 : HOP);
    if (i === 0) {
      s.lower(HOP);
      s.press(FIRST_STOP, 0.4);
    }
    s.lower(tipAt(WELL.floor + 0.012), 0.7, "gentle");
    s.press(plungerFor(DOSE * (i + 1)), 1, { kind: "draw", from: well, volume: DOSE, spent: true });
    s.wait(0.3);
    s.lift(HOP, 0.5);
  });
}

/** Over the chute: empty the tip if it holds anything, blow out, then push on past blowout to eject it. */
function toChute(s: Script, volume: number) {
  s.travel(CHUTE.spot);
  s.lower(OVER_TROUGH);
  if (volume > 0) {
    s.press(FIRST_STOP, 0.7, { kind: "give", to: "chute", volume });
    s.press(BLOWOUT, 0.25);
    s.wait(0.2);
  }
  s.press(EJECT, volume > 0 ? 0.15 : 0.5);
  s.wait(0.45, { kind: "eject" });
  s.press(0, 0.35);
  s.lift(0);
}

/** Into the reservoir just under the surface, and a slow draw so no air comes in with it. */
function drawFresh(s: Script, volume: number, level: number) {
  s.travel(RESERVOIR.spot);
  s.lower(OVER_TROUGH);
  s.press(FIRST_STOP, 0.4);
  const surface = RESERVOIR.floor + RESERVOIR.depth * level;
  s.lower(tipAt(Math.max(RESERVOIR.floor + 0.012, surface - 0.03)), 0.6, "gentle");
  s.press(plungerFor(volume), 1.5, { kind: "draw", from: "reservoir", volume, spent: false });
  s.wait(0.5);
  s.lift(OVER_TROUGH, 0.6, "gentle");
  s.lift(0);
}

/** Each well gets its share just above its lowered surface; the last dispense ends with a blowout. */
function feed(s: Script, wells: number[]) {
  wells.forEach((well, i) => {
    s.travel(wellSpot(well), i === 0 ? 0 : HOP);
    s.lower(tipAt(WELL.floor + WELL.depth * (1 - DOSE) + 0.025), i === 0 ? undefined : 0.45);
    s.press(s.plunger + FIRST_STOP * DOSE, 0.8, { kind: "give", to: well, volume: DOSE });
    if (i === wells.length - 1) s.press(BLOWOUT, 0.25);
    s.wait(0.25);
    s.lift(HOP, 0.45);
  });
  s.press(0, 0.35);
}

/** The steps of loop `loop`, from parked to parked, exactly LOOP_SECONDS long. */
export function buildCycle(loop: number): Step[] {
  const s = new Script();
  const wells = wellsFor(loop);
  const round = loop % LOOPS_PER_RACK;
  s.wait(1.2);
  pickUp(s, TIP_ORDER[round * 2]);
  takeSpent(s, wells);
  toChute(s, DOSE * wells.length);
  pickUp(s, TIP_ORDER[round * 2 + 1]);
  drawFresh(s, DOSE * wells.length, 1 - round * RESERVOIR_PER_LOOP);
  feed(s, wells);
  toChute(s, 0);
  s.travel(HOME);
  s.wait(0.6);
  s.wait(0.5, { kind: "flash" });
  return s.padTo(LOOP_SECONDS).steps;
}
