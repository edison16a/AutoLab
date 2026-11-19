/**
 * One loop of the Home demo: a small media change on three wells, written
 * the way the fluidics team wrote the protocol.
 *
 * Aspiration, for each well: put on a fresh tip, lower it into the well and
 * run the aspiration pump so the spent media goes up the line to waste,
 * move the head away from the plate and strip the tip into the disposal
 * bin. Then the aspiration line runs its suction over the wash station so
 * nothing is left in it.
 *
 * Addition: the addition pump pushes fresh media out of the needle into
 * each well in turn, then runs back over the wash station so the line
 * doesn't drip. Then the machine parks and the camera takes a picture.
 * Each loop picks other wells.
 */
import { BIN, HEAD_AXIS, HOME, REACHABLE_WELLS, TIP_ORDER, TIP_SEAT, WASH, WELL, needleAt, needleSpot, socketSpot, tipAt, wellSpot } from "./deck";
import { NEEDLE, NOSE_TIP } from "../models/deck/labware-layout";
import { PMST100_MAX_FLOW } from "../models/fluidics/pump-spec";
import { Script, type Step } from "./script";

/** Each well gives up and gets back this many millilitres, a third of its usual 1 mL. */
export const DOSE = 0.3;
export const WELLS_PER_LOOP = 3;
/** Every loop runs this long, so any moment maps straight to a loop and a time within it. */
export const LOOP_SECONDS = 80;
/** A loop uses a tip per well; once the reachable ones are gone the rack and bin are swapped for fresh ones. */
export const LOOPS_PER_RACK = TIP_ORDER.length / WELLS_PER_LOOP;
/**
 * How far the bottles' levels move in a loop. A real bottle holds far more
 * than three doses, so the demo exaggerates it to make the flow visible;
 * both bottles are swapped with the rack.
 */
export const MEDIA_PER_LOOP = 0.06;
export const WASTE_PER_LOOP = 0.06;

/**
 * How long each pump runs per well: as long as a dose really takes the
 * PMST100 at its top speed (75 RPM on 1/16" tubing, about 81 µL a second),
 * so the rotors, the liquid in the lines and the wells all agree.
 */
export const ASPIRATE_SECONDS = (DOSE * 1000) / PMST100_MAX_FLOW;
export const DISPENSE_SECONDS = (DOSE * 1000) / PMST100_MAX_FLOW;
/** The suction that clears a line, ten seconds on the machine, shortened for the demo. */
export const SUCTION_SECONDS = 3;

/** A few millimetres over the plate's top: the safe height for short hops between wells. */
const HOP = tipAt(WELL.top + 0.05);
/** The needle's height over a well while it dispenses: clear of the plate, the stream falls into the media. */
const DISPENSE_HEIGHT = needleAt(WELL.top + 0.08);
/** The bare nose a little over the wash trough's rim. */
const OVER_WASH = WASH.rim + 0.05 - (HEAD_AXIS.y + NOSE_TIP.top);

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

/** Into the well to just off its floor, the aspiration pump draws its share to waste, then straight back up and away from the plate. */
function aspirate(s: Script, well: number) {
  s.travel(wellSpot(well));
  s.lower(HOP);
  s.lower(tipAt(WELL.floor + 0.012), 0.7, "gentle");
  s.wait(ASPIRATE_SECONDS, { kind: "aspirate", well, volume: DOSE });
  s.wait(0.2);
  s.lift(HOP, 0.5);
  s.lift(0);
}

/** Under the stripper plate, the nose slides into its slot and lifts out of the tip, which drops into the bin. */
function stripTip(s: Script) {
  s.travel(BIN.approach);
  s.lower(BIN.under);
  s.slide(BIN.slot, 0.5);
  s.lift(BIN.under + 0.12, 0.45, "gentle", { kind: "strip" });
  s.wait(0.45, { kind: "drop" });
  s.slide(BIN.approach, 0.35);
  s.lift(0);
}

/** Over the wash station, a pump runs back toward waste for a while so its line holds nothing. */
function suction(s: Script, pump: "addition" | "aspiration") {
  s.travel(pump === "addition" ? { x: WASH.spot.x - NEEDLE.dx, y: WASH.spot.y } : WASH.spot);
  s.lower(OVER_WASH);
  s.wait(SUCTION_SECONDS, { kind: "suction", pump });
  s.lift(0);
}

/** The needle over each well in turn, just above the plate, while the addition pump gives it its share. */
function add(s: Script, wells: number[]) {
  wells.forEach((well, i) => {
    s.travel(needleSpot(well), i === 0 ? 0 : DISPENSE_HEIGHT);
    if (i === 0) s.lower(DISPENSE_HEIGHT);
    s.wait(DISPENSE_SECONDS, { kind: "dispense", well, volume: DOSE });
    s.wait(0.25);
  });
  s.lift(0);
}

/** The steps of loop `loop`, from parked to parked, exactly LOOP_SECONDS long. */
export function buildCycle(loop: number): Step[] {
  const s = new Script();
  const wells = wellsFor(loop);
  const round = loop % LOOPS_PER_RACK;
  s.wait(1);
  wells.forEach((well, i) => {
    pickUp(s, TIP_ORDER[round * WELLS_PER_LOOP + i]);
    aspirate(s, well);
    stripTip(s);
  });
  suction(s, "aspiration");
  add(s, wells);
  suction(s, "addition");
  s.travel(HOME);
  s.wait(0.6);
  s.wait(0.5, { kind: "flash" });
  return s.padTo(LOOP_SECONDS).steps;
}
