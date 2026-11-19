/**
 * The fluidics that replace the pipette, from the fluidics team's sketch,
 * and the enclosure upgrade around them. Two reversible peristaltic pumps
 * do the liquid handling: pump 1 (addition) pushes fresh media out of a
 * needle on the dispense head, and pump 2 (aspiration) draws spent media up
 * through a disposable tip on the same head. Behind each pump a selector
 * valve picks which bottle it's connected to: a 3-way valve for addition
 * (media, cleaner, waste) and a 2-way valve for aspiration (waste,
 * cleaner). The waste and cleaner bottles are shared.
 *
 * The pumps, valves, cleaner and waste stand on a platform outside the
 * enclosure on the left, so bleach fumes and motor heat stay out of the
 * chamber; the media bottle stays inside at 37 °C. A HEPA fan filter unit
 * on the roof keeps a laminar downflow over the plate, and used tips go
 * into a disposal bin beside it.
 */
import { STRIPPER, TROUGHS } from "@/components/three/models/deck/labware-layout";
import { FLUIDICS, TOOL } from "@/components/three/models/machine/layout";
import type { PartDefinition } from "./hardware-parts-types";

/** The nose's axis on the X carriage, where a tip goes on. */
const HEAD_X = TOOL.x;
const HEAD_Z = TOOL.z;
const DECK = FLUIDICS.top;
/** Where the rows of pumps, valves and bottles stand on the fluidics platform, front to back, and its right and left columns. */
const PUMP_Z = FLUIDICS.z + 1.0;
const VALVE_Z = FLUIDICS.z + 0.1;
const BOTTLE_Z = FLUIDICS.z - 0.9;
const RIGHT = FLUIDICS.x + 0.4;
const LEFT = FLUIDICS.x - 0.4;
const PUMP_SIZE = { size: [0.8, 0.66, 0.92] as [number, number, number], center: [0.06, 0.33, -0.12] as [number, number, number] };
/** From the front left: from the front right the enclosure's corner post stands in the way. */
const PUMP_VIEW: [number, number, number] = [-0.55, 0.5, 1];
/** From above on the left, over the pumps in front of them. */
const VALVE_VIEW: [number, number, number] = [-0.9, 1.2, 0.35];
/** From the left, clear of the pumps and the enclosure. */
const BOTTLE_VIEW: [number, number, number] = [-0.9, 0.5, 0.4];

export const FLUIDICS_PARTS: PartDefinition[] = [
  {
    id: "dispense_head",
    name: "Dispense head",
    shortName: "Dispense head",
    category: "Fluidics",
    purpose: "Carries a disposable tip for aspiration and a fixed needle for adding media. No electronics: the pumps do the work.",
    connection: "Addition and aspiration lines",
    model: "dispense_head",
    liveNow: false,
    position: [HEAD_X, 1.62, HEAD_Z],
    size: [0.42, 1.06, 0.3],
    center: [0.07, 0.1, -0.06],
    rig: "carriage",
    // Forward off the carriage plate.
    exploded: [0, 0, 0.55],
    view: [0.6, 0.2, 1],
  },
  {
    id: "addition_pump",
    name: "Peristaltic pump 1 (addition)",
    shortName: "Addition pump",
    category: "Fluidics",
    purpose: "Reversible pump. Pushes fresh media out of the needle into each well, then runs back so the line doesn't drip.",
    connection: "Stepper driver on the Pico",
    model: "addition_pump",
    liveNow: false,
    position: [RIGHT, DECK, PUMP_Z],
    ...PUMP_SIZE,
    exploded: [0, 0.6, 0],
    view: PUMP_VIEW,
  },
  {
    id: "aspiration_pump",
    name: "Peristaltic pump 2 (aspiration)",
    shortName: "Aspiration pump",
    category: "Fluidics",
    purpose: "Reversible pump. Draws spent media up through the tip to waste, and runs the other way to flush the line with cleaner.",
    connection: "Stepper driver on the Pico",
    model: "aspiration_pump",
    liveNow: false,
    position: [LEFT, DECK, PUMP_Z],
    ...PUMP_SIZE,
    exploded: [0, 0.6, 0],
    view: PUMP_VIEW,
  },
  {
    id: "addition_valve",
    name: "Addition selector valve",
    shortName: "3-way valve",
    category: "Fluidics",
    purpose: "Three normally closed pinch valves. Connects the addition pump to fresh media, cleaner or waste, one at a time.",
    connection: "Valve outputs on the Pico",
    model: "addition_valve",
    liveNow: false,
    position: [RIGHT, DECK, VALVE_Z],
    size: [0.62, 0.42, 0.44],
    center: [0, 0.2, 0.06],
    exploded: [0, 0.75, 0],
    view: VALVE_VIEW,
  },
  {
    id: "aspiration_valve",
    name: "Aspiration selector valve",
    shortName: "2-way valve",
    category: "Fluidics",
    purpose: "Two normally closed pinch valves. Connects the aspiration pump to waste or cleaner.",
    connection: "Valve outputs on the Pico",
    model: "aspiration_valve",
    liveNow: false,
    position: [LEFT, DECK, VALVE_Z],
    size: [0.42, 0.42, 0.44],
    center: [0, 0.2, 0.06],
    exploded: [0, 0.75, 0],
    view: VALVE_VIEW,
  },
  {
    id: "hepa_filter",
    name: "HEPA fan filter unit",
    shortName: "HEPA filter",
    category: "Environment",
    purpose: "Pushes HEPA filtered air down through the chamber in an even, laminar flow, so particles are swept away from the open plate.",
    connection: "Fan output on the Pico",
    model: "hepa_filter",
    liveNow: false,
    // On the roof panel, between the top rails, clear of the CO₂ valve plate at the front left.
    position: [0, 4.335, -0.2],
    size: [2.12, 0.56, 1.5],
    center: [0.05, 0.2, 0],
    // Lifts off the roof, which lifts too.
    exploded: [0, 1.6, 0],
    view: [0.35, 0.9, 1],
  },
  {
    id: "cleaner_bottle",
    name: "Cleaner bottle",
    shortName: "Cleaner",
    category: "Labware",
    purpose: "70% ethanol disinfectant. Both valves draw from it to flush the lines.",
    connection: "",
    model: "cleaner_bottle",
    liveNow: false,
    position: [RIGHT - 0.05, DECK, BOTTLE_Z],
    size: [0.62, 1.12, 0.66],
    center: [0, 0.56, -0.02],
    exploded: [0, 0.55, 0],
    view: BOTTLE_VIEW,
  },
  {
    id: "waste_container",
    name: "Waste bottle and bleach trap",
    shortName: "Waste",
    category: "Labware",
    purpose: "Collects spent media and used cleaner over bleach. A float switch stops the pumps before it's full.",
    connection: "Float switch to the Pico",
    model: "waste_container",
    liveNow: false,
    position: [LEFT + 0.05, DECK, BOTTLE_Z],
    size: [0.62, 1.12, 0.66],
    center: [0, 0.56, -0.02],
    exploded: [0, 0.55, 0],
    view: BOTTLE_VIEW,
  },
  {
    id: "disposal_bin",
    name: "Tip disposal bin",
    shortName: "Disposal bin",
    category: "Labware",
    purpose: "Takes used tips. The stripper over it pulls each tip off the nose.",
    connection: "",
    model: "disposal_bin",
    liveNow: false,
    // Drawn in the heated platform's space, on its left margin in front of the wash station.
    position: [0, 0.61, 0.3],
    size: [0.26, STRIPPER.under - TROUGHS.top + 0.02, 0.4],
    center: [TROUGHS.x, (TROUGHS.top + STRIPPER.under) / 2 + 0.01, TROUGHS.chute.z - 0.01],
    exploded: [0, 0.5, 0],
    view: [0.5, 0.8, 1],
  },
];
