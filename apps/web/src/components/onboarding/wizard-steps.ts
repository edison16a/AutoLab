/**
 * The five setup steps, in order. The index doubles as the step number the
 * wizard, the indicator and the 3D stage all agree on.
 */
export const WIZARD_STEPS = [
  { id: "camera", label: "Camera" },
  { id: "power", label: "Power" },
  { id: "discover", label: "Discover" },
  { id: "device", label: "Device" },
  { id: "ready", label: "Ready" },
] as const;

export type StepId = (typeof WIZARD_STEPS)[number]["id"];

/** Named indexes, so code reads `STEP.power` instead of a bare 1. */
export const STEP = {
  camera: 0,
  power: 1,
  discover: 2,
  device: 3,
  ready: 4,
} as const satisfies Record<StepId, number>;

export type StepIndex = (typeof STEP)[StepId];

/**
 * How the Device step reaches the Pi. Bluetooth sends Wi-Fi details to a
 * nearby Pi; manual means the person set up Wi-Fi themselves and pastes
 * what the Pi agent printed.
 */
export type SetupPath = "bluetooth" | "manual";
