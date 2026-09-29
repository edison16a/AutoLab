/**
 * Where everything sits on the Raspberry Pi 4 Model B, taken from the
 * official mechanical drawing and converted to scene units once, here.
 *
 * Drawing coordinates are millimetres from the corner next to the USB-C
 * port: x runs along the long edge toward the network ports, y runs toward
 * the GPIO header. In the scene the ports face +X and the micro-HDMI edge
 * faces +Z (toward the enclosure door), so y = 0 maps to the front edge.
 *
 * The board is drawn at 1.05 x 0.72 units instead of a strict 85 x 56 mm
 * so it lines up with its standoffs on the platform and the registry hit
 * box. That stretches depth by about 4 percent, which nobody can see.
 */
import type { Vec3 } from "../../types";

export const PI_BOARD = { width: 1.05, depth: 0.72, thickness: 0.025 } as const;

const SX = PI_BOARD.width / 85;
const SZ = PI_BOARD.depth / 56;
/** Heights use the scene's nominal scale (1 unit is about 81 mm). */
const SY = 0.0125;

/** The component side of the board. Parts are placed relative to this. */
export const TOP = PI_BOARD.thickness / 2;

/** A drawing point (mm) as scene [x, z]. */
export function at(xmm: number, ymm: number): [number, number] {
  return [-PI_BOARD.width / 2 + xmm * SX, PI_BOARD.depth / 2 - ymm * SZ];
}

/** Millimetre lengths along each scene axis. */
export const mmX = (mm: number) => mm * SX;
export const mmY = (mm: number) => mm * SY;
export const mmZ = (mm: number) => mm * SZ;

/** A drawing point lifted to a height above the board top. */
export function onTop(xmm: number, ymm: number, height = 0): Vec3 {
  const [x, z] = at(xmm, ymm);
  return [x, TOP + height, z];
}

/** Mounting holes: the Pi's 58 x 49 mm pattern, offset toward the left, not the corners. */
export const PI_HOLES: [number, number][] = [
  [3.5, 3.5],
  [61.5, 3.5],
  [3.5, 52.5],
  [61.5, 52.5],
];

/**
 * Centres of the main parts in drawing millimetres. Kept together so the
 * layout can be checked against the drawing in one glance.
 */
export const PI_PARTS = {
  usb2: [85, 9],
  usb3: [85, 27],
  ethernet: [85, 45.75],
  usbC: [11.2, 0],
  hdmi0: [26, 0],
  hdmi1: [39.5, 0],
  audio: [53.5, 0],
  csi: [46, 12.5],
  dsi: [4.5, 28],
  gpio: [32.5, 52.5],
  poe: [60.3, 45.2],
  soc: [29.5, 32.5],
  ram: [45.5, 31],
  wireless: [14.5, 40],
  usbController: [58, 22],
  ethernetPhy: [56, 38],
  pmic: [13, 14],
  microSd: [6.5, 28],
  leds: [2.3, 9.5],
} as const satisfies Record<string, readonly [number, number]>;

/** The ribbon slot on a flex connector sits this far from its centre, beside the latch. */
export const FLEX_SLOT_OFFSET = -0.014;

/**
 * Where the camera ribbon enters the CSI connector, in the Pi's local
 * space: partway down the slot. The ribbon model ends here.
 */
export const PI_CSI_ENTRY: Vec3 = (() => {
  const [x, z] = at(PI_PARTS.csi[0], PI_PARTS.csi[1]);
  return [x + FLEX_SLOT_OFFSET, TOP + 0.03, z];
})();
