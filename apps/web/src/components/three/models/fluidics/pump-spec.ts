/**
 * The team's actual fluidics hardware, from Simply Pumps' product pages and
 * drawings, as plain numbers so the models, the demo's timing and the
 * tubing all agree. Scene units: 1 unit is about 81 mm.
 */

/** Inches to scene units. */
export const inch = (value: number) => (value * 25.4) / 81;

/**
 * PMST100 stepper peristaltic pump, from drawing DD 23.40: a round panel
 * mount flange with four holes on a 1.575" square, the NEMA 17 behind it
 * and the four roller pump head in front, with both tube fittings pointing
 * down. Heights are from the shaft's axis; depths from the flange's back
 * face, which sits on the front of the panel.
 */
export const PMST100 = {
  flange: { radius: inch(2.727 / 2), thickness: inch(0.2), holes: inch(1.575 / 2), hole: inch(0.13 / 2) },
  /** The motor behind the panel: end bells as tall as the drawing's 2.115", the NEMA 17 stator between them. */
  motor: { length: inch(2.365), bell: inch(2.115), bellDepth: inch(0.22), stator: inch(1.67) },
  /** The spacer boss on the flange and the head in front of it, 3.490" overall from the motor's back. */
  head: { boss: inch(0.2), depth: inch(0.725), top: inch(0.45), bottom: inch(1.12), width: inch(1.2) },
  /** The two barbed fittings under the head, and how far below the axis their barbs end. */
  fittings: { spacing: inch(0.25), tip: inch(2.02) },
  rollers: 4,
  /** Simply Pumps' figures: 1/16" ID tubing moves 0.065 mL a revolution, and the pump's top recommended speed is 75 RPM (about 4.9 mL/min). */
  ulPerRev: 65,
  maxRpm: 75,
  /** 1/16" ID Tygon has a 1/8" OD. */
  tubeRadius: inch(1 / 16),
} as const;

/** Flow at the pump's top speed, in µL a second. */
export const PMST100_MAX_FLOW = (PMST100.ulPerRev * PMST100.maxRpm) / 60;

/**
 * SMC10 stepper motor controller: a 2.565" x 2.250" board, 1.000" tall
 * with its parts. Three two way screw terminals down one edge (supply,
 * coil A, coil B), the 2 x 6 I/O header along another with the three pin
 * speed input beside it, and the bulk capacitor on top. Positions in the
 * board's own space: origin at the middle of its underside, the
 * terminals' edge toward +Z and the header's toward -X.
 */
export const SMC10 = {
  length: inch(2.565),
  width: inch(2.25),
  height: inch(1.0),
  pcb: inch(0.062),
  standoff: inch(0.25),
} as const;
