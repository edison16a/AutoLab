/**
 * Where everything sits on the setup bench, in scene units (about 81 mm
 * each). The Pi stays at the origin through every step, so the camera can
 * fly from one step to the next without losing its place. Numbers that
 * point at a spot on a model (the CSI port, the USB-C port) are read off
 * RaspberryPiModel and CameraModel; move them together if those change.
 */
import type { Vec3 } from "@/components/three";

/** The Pi's lowest part (the steel block under the board) is 0.067 below its origin. */
export const PI_POSITION: Vec3 = [0, 0.068, 0];

/** The CSI connector's box in the Pi model, for the accent outline. */
export const CSI_BOX = { position: [-0.25, 0.056, 0.08] as Vec3, size: [0.06, 0.085, 0.31] as Vec3 };
/**
 * Label anchor just right of the connector. The ribbon arrives from the
 * left and above, so the space on this side stays clear for the pill.
 */
export const CSI_LABEL: Vec3 = [0.14, 0.1, 0.1];

/**
 * The HQ camera hangs lens down, as it does over the well plate, just left
 * of the Pi so its ribbon makes one arc into the CSI port. Both ends of
 * the ribbon share z, because the ribbon only bends in X and Y.
 */
export const CAMERA_POSITION: Vec3 = [-1.0, 0.95, 0.08];
export const RIBBON_Z = 0.08;
/** Out of the camera's connector, up and over, then straight down into the CSI port. */
export const RIBBON_ROUTE: Vec3[] = [
  [-0.77, 1.01, 0],
  [-0.77, 1.17, 0],
  [-0.68, 1.33, 0],
  [-0.5, 1.38, 0],
  [-0.32, 1.25, 0],
  [-0.25, 0.95, 0],
  [-0.25, 0.5, 0],
  [-0.25, 0.14, 0],
];
/** How far above its seat the camera and ribbon start. */
export const RIBBON_LIFT = 0.5;

/** The USB-C port's opening faces -X. The plug's tip ends up just inside it. */
export const PLUG_Y = PI_POSITION[1] + 0.042;
export const PLUG_Z = 0.21;
export const PLUG_SEATED_X = -0.44;
export const PLUG_START_X = -1.15;

/** Set back and to the right, so the Pi, router and cloud climb the frame together. */
export const ROUTER_POSITION: Vec3 = [1.45, 0, -0.6];
export const CLOUD_POSITION: Vec3 = [2.55, 1.05, -1.3];

/** A smooth arc from one point to another, raised in the middle by `lift`. */
function arc(from: Vec3, to: Vec3, lift: number): Vec3[] {
  return [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const raise = Math.sin(Math.PI * t) * lift;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t + raise, from[2] + (to[2] - from[2]) * t];
  });
}

const [rx, , rz] = ROUTER_POSITION;
const [cx, cy, cz] = CLOUD_POSITION;
/** From the Pi's Wi-Fi to the top of the router. */
export const WIFI_LINE = arc([0.3, 0.28, -0.05], [rx - 0.2, 0.3, rz], 0.35);
/** From the router up to the gateway cloud. */
export const GATEWAY_LINE = arc([rx + 0.3, 0.3, rz], [cx - 0.55, cy - 0.05, cz], 0.3);
