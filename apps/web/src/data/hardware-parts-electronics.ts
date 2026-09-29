/**
 * The computer, camera and controller boards. The Pi, Pico and pH module
 * sit bare on a white platform outside the enclosure at the bottom right,
 * as in the system design sketch. The camera sits in its dock on
 * the right of the gantry and its ribbon runs down the right wall and out
 * to the Pi.
 */
import type { PartDefinition } from "./hardware-parts-types";

export const ELECTRONICS_PARTS: PartDefinition[] = [
  {
    id: "raspberry_pi",
    name: "Raspberry Pi 4 Model B",
    shortName: "Raspberry Pi 4",
    category: "Computer",
    purpose: "Central imaging computer. 1 GB RAM. Maintains the outbound connection to your gateway.",
    connection: "Internet / WSS",
    model: "raspberry_pi",
    liveNow: true,
    position: [3.1, 0.24, -0.08],
    size: [1.12, 0.4, 0.8],
    center: [0, 0.11, 0],
    // Each board lifts straight up off its standoffs or breadboard.
    exploded: [0, 0.7, 0],
    view: [0.5, 1.1, 0.8],
  },
  {
    id: "camera",
    name: "RP 2018 HQ Camera V1",
    shortName: "HQ Camera",
    category: "Imaging",
    purpose: "Camera mounted over the culture area. The installed sensor is discovered by Picamera2.",
    connection: "CSI / FPC",
    model: "camera",
    liveNow: true,
    position: [1.35, 2.3, -0.05],
    size: [0.66, 0.5, 0.66],
    center: [0, -0.17, 0],
    rig: "gantry",
    // Slid forward out of its dock rails.
    exploded: [0, -0.15, 0.5],
    // From the front left, so the front right post doesn't stand in the way.
    view: [-0.35, 0.35, 1],
    // Lens toward the viewer, so the isolated view shows the optics rather than the back of the board.
    inspectRotation: [-Math.PI / 2, 0, 0],
  },
  {
    id: "fpc",
    name: "HBv RPi 160 FPC ribbon",
    shortName: "FPC ribbon",
    category: "Imaging",
    purpose: "Flexible camera ribbon between the Pi CSI connector and the camera.",
    connection: "CSI",
    model: "fpc",
    liveNow: false,
    position: [2.1, 1.3, -0.05],
    size: [1.25, 2.05, 0.3],
    center: [0.13, 0.08, 0.02],
    hits: [
      // The run off the camera rolls with the gantry; the rest lies along the wall.
      { center: [-0.3, 1.05, 0], size: [0.55, 0.2, 0.3], rig: "gantry" },
      { center: [-0.08, 0.35, 0], size: [0.2, 1.3, 0.3] },
      { center: [0.4, -0.65, 0.04], size: [0.95, 0.45, 0.3] },
    ],
    exploded: [0.45, 0.25, 0.3],
    view: [0.8, 0.25, 1],
  },
  {
    id: "pico",
    name: "Raspberry Pi Pico",
    shortName: "Pico",
    category: "Control",
    purpose: "Future local controller for time-sensitive pipette I/O.",
    connection: "USB serial",
    model: "pico",
    liveNow: false,
    position: [2.82, 0.2, 0.86],
    size: [0.3, 0.18, 0.66],
    center: [0, -0.05, 0],
    exploded: [0, 0.45, 0],
    view: [0.45, 1.1, 0.8],
  },
  {
    id: "ph_sensor",
    name: "Atlas Scientific EZO-pH",
    shortName: "EZO-pH module",
    category: "Environment",
    purpose: "pH signal processing module. Requires a probe and calibration.",
    connection: "I²C / UART",
    model: "ph_sensor",
    liveNow: false,
    position: [3.4, 0.2, 0.86],
    size: [0.68, 0.3, 0.42],
    center: [-0.06, 0, 0],
    exploded: [0, 0.45, 0],
    view: [0.5, 1.1, 0.8],
  },
  {
    id: "printer_controller",
    name: "3D-printer motion controller",
    shortName: "Motion controller",
    category: "Motion",
    purpose: "Existing printer controller for planned XYZ motion integration.",
    connection: "USB serial",
    model: "printer_controller",
    liveNow: false,
    position: [0.45, 0.505, -1.28],
    size: [1.2, 0.28, 0.84],
    center: [0, 0.09, 0],
    // Up off the chamber floor.
    exploded: [0, 0.6, 0],
    // From above: from the front the camera dock hangs in the way.
    view: [0.1, 1, 0.5],
  },
];
