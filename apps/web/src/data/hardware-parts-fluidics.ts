/**
 * The fluidics that replace the pipette, from the fluidics team's sketch,
 * and the enclosure upgrade around them. Two Simply Pumps PMST100 stepper
 * peristaltic pumps, each run by its own SMC10 controller, do the liquid
 * handling: pump 1 (addition) pushes fresh media out of a
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
import { BOTTLE_Z, CONTROLLER_Z, PUMP_PANEL, PUMP_X, VALVE_Z } from "@/components/three/models/machine/fluidics-layout";
import { FLUIDICS, TOOL } from "@/components/three/models/machine/layout";
import type { PartDefinition } from "./hardware-parts-types";

/** The nose's axis on the X carriage, where a tip goes on. */
const HEAD_X = TOOL.x;
const HEAD_Z = TOOL.z;
const DECK = FLUIDICS.top;
/** A PMST100 from its flange to its fitting tips and from its motor's back to its head's front, around its shaft axis. */
const PUMP_SIZE = { size: [0.86, 1.06, 1.11] as [number, number, number], center: [0, -0.1, -0.2] as [number, number, number] };
/** From the front left: from the front right the enclosure's corner post stands in the way. */
const PUMP_VIEW: [number, number, number] = [-0.45, 0.35, 1];
/** Low from the front, under the pump panel: the valves sit under the motors. */
const VALVE_VIEW: [number, number, number] = [-0.25, 0.2, 1];
/** From above on the left and behind, clear of the motors in front of them. */
const CONTROLLER_VIEW: [number, number, number] = [-0.8, 1.3, -0.45];
/** From the left, clear of the pumps and the enclosure. */
const BOTTLE_VIEW: [number, number, number] = [-0.9, 0.5, 0.4];
/** The SMC10's board, terminals toward the motor. */
const CONTROLLER_SIZE = { size: [0.72, 0.33, 0.82] as [number, number, number], center: [0, 0.16, 0] as [number, number, number] };

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
    name: "Simply Pumps PMST100 (addition)",
    shortName: "Addition pump",
    category: "Fluidics",
    purpose: "Stepper peristaltic pump, 4 rollers, panel mount. Pushes fresh media out of the needle into each well, then runs back so the line doesn't drip.",
    connection: "SMC10 controller",
    model: "addition_pump",
    liveNow: false,
    // Through the pump panel at the front of the fluidics platform; the origin is the shaft's axis on the panel's face.
    position: [PUMP_X.addition, PUMP_PANEL.axisY, PUMP_PANEL.z],
    ...PUMP_SIZE,
    // Straight out of the panel, the way it comes off.
    exploded: [0, 0, 0.85],
    view: PUMP_VIEW,
  },
  {
    id: "aspiration_pump",
    name: "Simply Pumps PMST100 (aspiration)",
    shortName: "Aspiration pump",
    category: "Fluidics",
    purpose: "Stepper peristaltic pump, 4 rollers, panel mount. Draws spent media up through the tip to waste, and runs the other way to flush the line with cleaner.",
    connection: "SMC10 controller",
    model: "aspiration_pump",
    liveNow: false,
    position: [PUMP_X.aspiration, PUMP_PANEL.axisY, PUMP_PANEL.z],
    ...PUMP_SIZE,
    exploded: [0, 0, 0.85],
    view: PUMP_VIEW,
  },
  {
    id: "addition_controller",
    name: "Simply Pumps SMC10 (addition)",
    shortName: "Addition controller",
    category: "Fluidics",
    purpose: "Stepper motor controller for the addition pump. The Pico sets its enable, direction and 0 to 5 V speed inputs.",
    connection: "Enable, direction and speed from the Pico",
    model: "addition_controller",
    liveNow: false,
    position: [PUMP_X.addition, DECK, CONTROLLER_Z],
    ...CONTROLLER_SIZE,
    exploded: [0, 0.5, 0],
    view: CONTROLLER_VIEW,
  },
  {
    id: "aspiration_controller",
    name: "Simply Pumps SMC10 (aspiration)",
    shortName: "Aspiration controller",
    category: "Fluidics",
    purpose: "Stepper motor controller for the aspiration pump. The Pico sets its enable, direction and 0 to 5 V speed inputs.",
    connection: "Enable, direction and speed from the Pico",
    model: "aspiration_controller",
    liveNow: false,
    position: [PUMP_X.aspiration, DECK, CONTROLLER_Z],
    ...CONTROLLER_SIZE,
    exploded: [0, 0.5, 0],
    view: CONTROLLER_VIEW,
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
    // Under the addition pump's motor.
    position: [PUMP_X.addition, DECK, VALVE_Z],
    size: [0.62, 0.42, 0.44],
    center: [0, 0.2, 0.06],
    // Up, once the pump above it has come out of the panel.
    exploded: [0, 0.6, 0],
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
    position: [PUMP_X.aspiration, DECK, VALVE_Z],
    size: [0.42, 0.42, 0.44],
    center: [0, 0.2, 0.06],
    exploded: [0, 0.6, 0],
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
    position: [PUMP_X.addition - 0.05, DECK, BOTTLE_Z],
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
    position: [PUMP_X.aspiration + 0.05, DECK, BOTTLE_Z],
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
