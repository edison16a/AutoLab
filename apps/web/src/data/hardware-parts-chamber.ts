/**
 * Everything inside (or on) the incubation chamber that keeps cultures at
 * 37 °C, 5% CO₂ and 85 to 95% RH, plus the labware in it. Placement
 * follows the system design sketch: CO₂ valve on the top left corner with
 * its tubing down the left side, Temp/RH sensor high on the back right,
 * fan on the right wall, heated platform with the 24-well plate in the
 * middle, and the media bottle and tip rack at the front left.
 */
import type { PartDefinition } from "./hardware-parts-types";

export const CHAMBER_PARTS: PartDefinition[] = [
  {
    id: "sht85",
    name: "Sensirion SHT85",
    shortName: "SHT85",
    category: "Environment",
    purpose: "Measures chamber temperature and relative humidity.",
    connection: "I²C",
    model: "sht85",
    liveNow: false,
    position: [1.45, 3.5, -1.64],
    size: [0.28, 0.44, 0.18],
    center: [0, 0.075, 0],
    // Pulled forward off the back wall rail.
    exploded: [0, 0, 0.55],
    // From the front left: straight from the front the right Z lead screw stands in the way.
    view: [-0.45, 0.15, 1],
  },
  {
    id: "co2_sensor",
    name: "Senseair K33 ICB-F 10%",
    shortName: "CO₂ sensor",
    category: "Environment",
    purpose: "Measures chamber carbon dioxide concentration.",
    connection: "Interface to be configured",
    model: "co2_sensor",
    liveNow: false,
    position: [-1.0, 3.4, -1.62],
    rotation: [Math.PI / 2, 0, 0],
    size: [0.74, 0.66, 0.3],
    center: [0, 0, 0.055],
    // Pulled forward off its plate on the back wall rail.
    exploded: [0, 0, 0.5],
    // From high on the front left, over the X motor and the fluid lines, and clear of the HEPA unit.
    view: [-0.6, 1.0, 1],
    inspectRotation: [Math.PI / 2, 0, 0],
  },
  {
    id: "ph_probe",
    name: "pH probe",
    shortName: "pH probe",
    category: "Environment",
    purpose: "Liquid-contact probe for future pH measurements.",
    connection: "EZO-pH module",
    model: "ph_probe",
    liveNow: false,
    position: [-1.96, 1.95, -1.55],
    size: [0.34, 1.2, 0.18],
    center: [-0.09, 0.12, 0],
    // Pulled out of its clip, into the chamber.
    exploded: [0.45, 0, 0],
    // From the front right and level, under the X beam and clear of the Z lead screw.
    view: [0.8, -0.05, 1],
  },
  {
    id: "heated_platform",
    name: "Heated platform",
    shortName: "Heated platform",
    category: "Environment",
    purpose: "Holds the plate nest, the wash station and the tip disposal bin, and keeps the plate at 37 °C.",
    connection: "Heater output from the Pi",
    model: "heated_platform",
    liveNow: false,
    position: [0, 0.61, 0.3],
    size: [2.3, 0.37, 1.7],
    center: [0, 0.035, 0],
    // Stays on the floor; the plate lifts off it.
    exploded: [0, 0, 0],
    view: [0.35, 0.75, 1],
  },
  {
    id: "well_plate",
    name: "24-well plate",
    shortName: "24-well plate",
    category: "Labware",
    purpose: "Neuronal cultures, held in the fixed plate nest.",
    connection: "",
    model: "well_plate",
    liveNow: false,
    position: [0, 0.9, 0.3],
    size: [1.58, 0.25, 1.06],
    // Up out of the nest and toward the door, clear of the head above it.
    exploded: [0, 0.25, 0.95],
    view: [0.3, 0.95, 1],
  },
  {
    id: "circulation_fan",
    name: "Circulation fan",
    shortName: "Circulation fan",
    category: "Environment",
    purpose: "Mixes the chamber air so heat, humidity and CO₂ stay even.",
    connection: "Fan output from the Pi",
    model: "fan",
    liveNow: false,
    // On the back half of the right wall, behind the gantry upright.
    position: [2.01, 3.45, -1.15],
    rotation: [0, -Math.PI / 2, 0],
    size: [0.24, 0.82, 0.82],
    // Out along its axis, between the frame and the right panel.
    exploded: [0.8, 0, 0],
    // From inside the chamber toward the wall: from the front the gantry stands in the way.
    view: [-1, 0.2, -0.15],
    inspectRotation: [0, -Math.PI / 5, 0],
  },
  {
    id: "co2_valve",
    name: "CO₂ solenoid valve",
    shortName: "CO₂ valve",
    category: "Environment",
    purpose: "Doses CO₂ into the chamber through the gas line on the left side.",
    connection: "Valve output from the Pi",
    model: "co2_valve",
    liveNow: false,
    position: [-1.95, 4.41, 1.45],
    size: [0.56, 0.46, 0.34],
    center: [0, 0.22, 0.05],
    // Its plate lifts with the roof; the valve lifts a little further, off the plate.
    exploded: [0, 1.35, 0],
    view: [0.5, 0.7, 1],
  },
  {
    id: "media_bottle",
    name: "Fresh media supply",
    shortName: "Media bottle",
    category: "Labware",
    purpose: "Fresh culture media, kept at 37 °C in the chamber. Its dip tube feeds the addition valve.",
    connection: "Media line to the 3-way valve",
    model: "media_bottle",
    liveNow: false,
    // In the front left corner, ahead of the tip rack.
    position: [-1.55, 0.46, 1.45],
    size: [0.64, 1.06, 0.62],
    center: [0.01, 0.53, 0],
    // Toward the door, which moves further.
    exploded: [0, 0, 0.8],
    view: [0.35, 0.35, 1],
  },
  {
    id: "tip_rack",
    name: "Tip rack",
    shortName: "Tip rack",
    category: "Labware",
    purpose: "Sterile 1000 µL tips. The head takes a fresh one for each well it empties.",
    connection: "",
    model: "tip_rack",
    liveNow: false,
    // Front left, just ahead of where the gantry's left foot plate can reach, so the head can pick from its back rows.
    position: [-1.4, 0.46, 0.78],
    size: [0.6, 0.7, 0.82],
    center: [0, 0.35, 0],
    exploded: [0, 0, 0.6],
    view: [0.4, 0.85, 1],
  },
];
