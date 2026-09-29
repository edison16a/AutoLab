"use client";
import type { MaterialKey } from "../../materials";
import { Block, Cylinder } from "../../primitives";
import type { Vec3 } from "../../types";
import { ChipMarking, type MarkingLine } from "./ChipMarking";
import { at, mmX, mmZ, onTop, PI_PARTS, TOP } from "./layout";
import { RaspberryLogo } from "./RaspberryLogo";

/**
 * A plain package sitting on the board at a drawing position. Sharp edged
 * by default: rounded boxes this small shade their flat glossy tops with a
 * star shaped highlight.
 */
function Package({ drawing, size, material = "plasticBlack", radius = 0 }: { drawing: readonly [number, number]; size: Vec3; material?: MaterialKey; radius?: number }) {
  return <Block position={onTop(drawing[0], drawing[1], size[1] / 2)} size={size} radius={radius} material={material} />;
}

/** A black package with its laser marking on top. */
function MarkedPackage({ drawing, size, lines }: { drawing: readonly [number, number]; size: Vec3; lines: MarkingLine[] }) {
  const [x, y, z] = onTop(drawing[0], drawing[1], size[1]);
  return (
    <group>
      <Package drawing={drawing} size={size} />
      <ChipMarking lines={lines} position={[x, y + 0.0004, z]} width={size[0] * 0.8} height={size[2] * 0.5} />
    </group>
  );
}

const SOC_SUBSTRATE: Vec3 = [mmX(16), 0.012, mmZ(16)];
const SOC_LID: Vec3 = [mmX(13.2), 0.012, mmZ(13.2)];
const SOC_LINES: MarkingLine[] = [
  { text: "BROADCOM", size: 1.3, weight: 700 },
  { text: "BCM2711ZPKFSB06B0T" },
  { text: "TA2045 P11" },
];

/**
 * The BCM2711: the dark green substrate around a nickel plated heat
 * spreader with the part number etched in.
 */
function SoC() {
  const [x, z] = at(PI_PARTS.soc[0], PI_PARTS.soc[1]);
  const lidTop = TOP + SOC_SUBSTRATE[1] + SOC_LID[1];
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, TOP + SOC_SUBSTRATE[1] / 2, 0]} size={SOC_SUBSTRATE} radius={0.003} material="pcbDarkGreen" />
      <Block position={[0, lidTop - SOC_LID[1] / 2, 0]} size={SOC_LID} radius={0.006} material="aluminium" />
      <ChipMarking lines={SOC_LINES} ink="etch" position={[0, lidTop + 0.0005, 0]} width={0.14} height={0.085} />
    </group>
  );
}

const SHIELD: Vec3 = [mmX(12), 0.022, mmZ(11.5)];

/** The Wi-Fi and Bluetooth module under its tin can, with the raspberry etched on top. */
function WirelessShield() {
  const [x, z] = at(PI_PARTS.wireless[0], PI_PARTS.wireless[1]);
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, TOP + SHIELD[1] / 2, 0]} size={SHIELD} radius={0.004} material="tin" />
      <RaspberryLogo position={[0, TOP + SHIELD[1] + 0.0005, 0]} size={0.1} />
    </group>
  );
}

const RAM: Vec3 = [mmX(11), 0.016, mmZ(14)];
const RAM_LINES: MarkingLine[] = [{ text: "SAMSUNG", size: 1.2, weight: 600 }, { text: "K4F8E304HB" }, { text: "MGCJ 931" }];

/**
 * Every chip on the component side, in black epoxy with its markings: the
 * SoC, the LPDDR4 memory, the VL805 USB 3 controller, the gigabit PHY and
 * the power chip. The crystal beside the SoC is a small metal can.
 */
export function Silicon() {
  const [ramX, ramZ] = at(PI_PARTS.ram[0], PI_PARTS.ram[1]);
  const ramTop = TOP + RAM[1];
  return (
    <group>
      <SoC />
      <WirelessShield />
      <Package drawing={PI_PARTS.ram} size={RAM} />
      <ChipMarking lines={RAM_LINES} position={[ramX, ramTop + 0.0004, ramZ + 0.01]} width={0.12} height={0.07} />
      {/* Pin 1 dimple on the memory package. */}
      <Cylinder position={[ramX - 0.05, ramTop + 0.0003, ramZ - 0.07]} radius={0.007} height={0.001} low material="graphite" />
      <MarkedPackage drawing={PI_PARTS.usbController} size={[mmX(7), 0.011, mmZ(7)]} lines={[{ text: "VIA", weight: 700 }, { text: "VL805" }]} />
      <MarkedPackage drawing={PI_PARTS.ethernetPhy} size={[mmX(6), 0.011, mmZ(6)]} lines={[{ text: "BCM54213" }, { text: "PEB1KMLG" }]} />
      <Package drawing={PI_PARTS.pmic} size={[mmX(5), 0.01, mmZ(5)]} />
      {/* Crystal oscillator beside the SoC. */}
      <Package drawing={[19.4, 26]} size={[mmX(3.2), 0.012, mmZ(2.5)]} material="tin" radius={0.004} />
    </group>
  );
}
