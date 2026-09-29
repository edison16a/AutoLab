"use client";
import type { MaterialKey } from "../../materials";
import { Block, Repeat, type RepeatItem } from "../../primitives";
import type { Vec3 } from "../../types";
import { at, mmX, mmY, mmZ, PI_BOARD, PI_PARTS, TOP } from "./layout";
import { Port } from "./Port";
import type { PortHole } from "./port-geometry";

/** The port faces stand about 2.4 mm proud of the board edge, like the real ones. */
const FACE_X = PI_BOARD.width / 2 + mmX(2.4);

const USB_SIZE: Vec3 = [mmX(17.3), mmY(15.6), mmZ(13.1)];
const USB_RECESS = 0.07;
const USB_HOLES: PortHole[] = [-0.048, 0.048].map((y) => ({ y, height: 0.064, width: 0.146 }));
const TONGUE_LENGTH = USB_RECESS - 0.01;
const TONGUE_X = USB_SIZE[0] / 2 - USB_RECESS / 2 - 0.005;
const TONGUE_Y = 0.009;

/** Contacts on the underside of each tongue: four for USB 2, plus a second row of five for USB 3. */
function usbContacts(superSpeed: boolean): RepeatItem[] {
  const front = USB_SIZE[0] / 2;
  return USB_HOLES.flatMap((hole) => {
    const y = hole.y + TONGUE_Y - 0.0115;
    const legacy = [-0.048, -0.016, 0.016, 0.048].map((z) => ({ position: [front - 0.035, y, z] as Vec3, scale: [0.04, 0.003, 0.012] as Vec3 }));
    if (!superSpeed) return legacy;
    const extra = [-0.05, -0.025, 0, 0.025, 0.05].map((z) => ({ position: [front - 0.062, y, z] as Vec3, scale: [0.016, 0.003, 0.009] as Vec3 }));
    return [...legacy, ...extra];
  });
}

const USB2_CONTACTS = usbContacts(false);
const USB3_CONTACTS = usbContacts(true);
/** Grounding dimples pressed into the top of the shell. */
const DIMPLES: RepeatItem[] = [-0.04, 0.04].map((z) => ({ position: [USB_SIZE[0] / 2 - 0.045, USB_SIZE[1] / 2, z] }));
const DIMPLE_SCALE: Vec3 = [0.014, 0.004, 0.014];

/**
 * A stacked pair of USB-A sockets. USB 3 tongues are the lighter grey
 * (the real ones are blue), so the two stacks still read differently.
 */
function UsbStack({ drawing, superSpeed }: { drawing: readonly [number, number]; superSpeed: boolean }) {
  const [, z] = at(drawing[0], drawing[1]);
  const tongue: MaterialKey = superSpeed ? "plasticGrey" : "plasticBlack";
  return (
    <Port position={[FACE_X - USB_SIZE[0] / 2, TOP + USB_SIZE[1] / 2, z]} size={USB_SIZE} holes={USB_HOLES} recess={USB_RECESS} rim={0.004}>
      {USB_HOLES.map((hole) => (
        <Block key={hole.y} position={[TONGUE_X, hole.y + TONGUE_Y, 0]} size={[TONGUE_LENGTH, 0.02, 0.112]} material={tongue} />
      ))}
      <Repeat items={superSpeed ? USB3_CONTACTS : USB2_CONTACTS} material="steel" />
      <Repeat items={DIMPLES} shape="sphere" material="steel" scale={DIMPLE_SCALE} />
    </Port>
  );
}

const RJ45_SIZE: Vec3 = [mmX(21.3), mmY(13.5), mmZ(16)];
const RJ45_RECESS = 0.12;
/** The plug opening with the latch notch underneath it, toward the board. */
const RJ45_HOLES: PortHole[] = [
  { y: 0.022, height: 0.1, width: 0.15 },
  { y: -0.0455, height: 0.035, width: 0.077 },
];
/** Eight sprung contacts along the roof of the opening, angled back like the real ones. */
const RJ45_CONTACTS: RepeatItem[] = Array.from({ length: 8 }, (_, i) => ({
  position: [RJ45_SIZE[0] / 2 - RJ45_RECESS + 0.05, 0.062, -0.0525 + i * 0.015],
  rotation: [0, 0, -0.35],
  scale: [0.07, 0.004, 0.006],
}));

/** The gigabit Ethernet jack, next to the GPIO header on the Pi 4. */
function EthernetJack() {
  const [, z] = at(PI_PARTS.ethernet[0], PI_PARTS.ethernet[1]);
  const face = RJ45_SIZE[0] / 2 + 0.001;
  return (
    <Port position={[FACE_X - RJ45_SIZE[0] / 2, TOP + RJ45_SIZE[1] / 2, z]} size={RJ45_SIZE} holes={RJ45_HOLES} recess={RJ45_RECESS} rim={0.003}>
      <Repeat items={RJ45_CONTACTS} material="steel" />
      {/* Link and speed light pipes. They stay dark; the Pi's own LEDs carry the state. */}
      {[-0.075, 0.075].map((lz) => (
        <Block key={lz} position={[face, -0.062, lz]} size={[0.004, 0.02, 0.03]} material="ledOff" />
      ))}
    </Port>
  );
}

/** Everything on the Pi's network edge: two USB 2, two USB 3 and Ethernet. */
export function NetworkPorts() {
  return (
    <group>
      <UsbStack drawing={PI_PARTS.usb2} superSpeed={false} />
      <UsbStack drawing={PI_PARTS.usb3} superSpeed />
      <EthernetJack />
    </group>
  );
}
