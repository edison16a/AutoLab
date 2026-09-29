"use client";
import { Block, Cylinder, Repeat, TextDecal, type RepeatItem } from "../primitives";

// Grip ribs round the cap, one instanced batch.
const RIBS: RepeatItem[] = Array.from({ length: 24 }, (_, i) => {
  const a = (i * Math.PI) / 12;
  return { position: [Math.sin(a) * 0.141, 0.92, Math.cos(a) * 0.141], rotation: [0, a, 0] };
});

/** Label facing the front of the machine. */
function Label({ text, y }: { text: string; y: number }) {
  return <TextDecal text={text} position={[0, y, 0.281]} rotation={[0, 0, 0]} width={0.3} height={0.08} ink="dark" />;
}

/** A clear glass media bottle, two thirds full, with a ribbed screw cap. Origin at the base. */
export function MediaBottleModel() {
  return (
    <group>
      <Cylinder position={[0, 0.33, 0]} radius={0.27} height={0.66} material="glass" />
      <Cylinder position={[0, 0.24, 0]} radius={0.255} height={0.46} material="liquid" />
      <Cylinder position={[0, 0.72, 0]} radius={0.27} taper={0.48} height={0.12} material="glass" />
      <Cylinder position={[0, 0.82, 0]} radius={0.12} height={0.08} material="glass" />
      <Cylinder position={[0, 0.92, 0]} radius={0.14} height={0.12} material="plasticGrey" />
      <Repeat items={RIBS} material="plasticGrey" scale={[0.012, 0.1, 0.008]} />
      <Block position={[0, 0.42, 0.268]} size={[0.34, 0.14, 0.004]} material="plasticWhite" />
      <Label text="Media" y={0.42} />
    </group>
  );
}

/** An opaque white waste container with a black cap. Origin at the base. */
export function WasteContainerModel() {
  return (
    <group>
      <Cylinder position={[0, 0.34, 0]} radius={0.27} height={0.68} material="plasticWhite" />
      <Cylinder position={[0, 0.73, 0]} radius={0.27} taper={0.5} height={0.1} material="plasticWhite" />
      <Cylinder position={[0, 0.82, 0]} radius={0.13} height={0.08} material="plasticWhite" />
      <Cylinder position={[0, 0.92, 0]} radius={0.14} height={0.12} material="plasticBlack" />
      <Repeat items={RIBS} material="plasticBlack" scale={[0.012, 0.1, 0.008]} />
      <Label text="Waste" y={0.42} />
    </group>
  );
}
