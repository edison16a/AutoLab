"use client";
import type { MaterialKey } from "../../materials";
import { Block, Cylinder, TextDecal } from "../../primitives";
import type { Vec3 } from "../../types";
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

const SOC_SUBSTRATE: Vec3 = [mmX(16), 0.012, mmZ(16)];
const SOC_LID: Vec3 = [mmX(13.2), 0.012, mmZ(13.2)];

/** The BCM2711: a dark substrate under a brushed metal lid with the part number etched in. */
function SoC() {
  const [x, z] = at(PI_PARTS.soc[0], PI_PARTS.soc[1]);
  const lidTop = TOP + SOC_SUBSTRATE[1] + SOC_LID[1];
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, TOP + SOC_SUBSTRATE[1] / 2, 0]} size={SOC_SUBSTRATE} radius={0.003} material="plasticBlack" />
      <Block position={[0, lidTop - SOC_LID[1] / 2, 0]} size={SOC_LID} radius={0.006} material="aluminium" />
      <TextDecal text="BROADCOM" position={[0, lidTop + 0.0005, -0.028]} width={0.12} height={0.024} ink="dark" weight={700} />
      <TextDecal text="BCM2711ZPKFSB06B0T" position={[0, lidTop + 0.0005, 0.012]} width={0.13} height={0.017} ink="dark" weight={500} />
      <TextDecal text="2045" position={[0, lidTop + 0.0005, 0.042]} width={0.05} height={0.017} ink="dark" weight={500} />
    </group>
  );
}

const SHIELD: Vec3 = [mmX(12), 0.022, mmZ(11.5)];

/** The Wi-Fi and Bluetooth module under its tin can, with the raspberry etched on top. */
function WirelessShield() {
  const [x, z] = at(PI_PARTS.wireless[0], PI_PARTS.wireless[1]);
  return (
    <group position={[x, 0, z]}>
      <Block position={[0, TOP + SHIELD[1] / 2, 0]} size={SHIELD} radius={0.004} material="steel" />
      <RaspberryLogo position={[0, TOP + SHIELD[1] + 0.0005, 0]} size={0.1} />
    </group>
  );
}

/**
 * Every chip on the component side. Only the parts people recognise get
 * detail; the rest are plain packages so the board reads busy but calm.
 */
export function Silicon() {
  const [ramX, ramZ] = at(PI_PARTS.ram[0], PI_PARTS.ram[1]);
  const ramTop = TOP + 0.016;
  return (
    <group>
      <SoC />
      <WirelessShield />
      <Package drawing={PI_PARTS.ram} size={[mmX(11), 0.016, mmZ(14)]} />
      {/* Pin 1 dimple on the memory package. */}
      <Cylinder position={[ramX - 0.05, ramTop + 0.0003, ramZ - 0.07]} radius={0.007} height={0.001} low material="graphite" />
      <Package drawing={PI_PARTS.usbController} size={[mmX(7), 0.011, mmZ(7)]} />
      <Package drawing={PI_PARTS.ethernetPhy} size={[mmX(6), 0.011, mmZ(6)]} />
      <Package drawing={PI_PARTS.pmic} size={[mmX(5), 0.01, mmZ(5)]} />
      {/* Crystal oscillator beside the SoC. */}
      <Package drawing={[19.4, 26]} size={[mmX(3.2), 0.012, mmZ(2.5)]} material="steel" radius={0.004} />
    </group>
  );
}
