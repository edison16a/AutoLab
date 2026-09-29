"use client";
import { Block, Cylinder, Ring } from "../primitives";

/** 1 kg bar load cell: an aluminium beam with two mounting holes and the gauge under white potting. */
export function LoadCellModel() {
  return (
    <group>
      <Block size={[0.18, 0.56, 0.18]} radius={0.01} material="aluminium" />
      {[-0.21, 0.21].map((y) => (
        <group key={y} position={[0, y, 0.093]} rotation={[Math.PI / 2, 0, 0]}>
          <Ring radius={0.031} material="plasticBlack" />
        </group>
      ))}
      <Block position={[-0.092, 0, 0]} size={[0.004, 0.17, 0.115]} material="plasticWhite" />
      <Cylinder position={[0, 0.05, 0.095]} radius={0.055} height={0.01} rotation={[Math.PI / 2, 0, 0]} material="plasticBlack" />
      <Block position={[0, -0.06, 0.1]} size={[0.09, 0.16, 0.01]} material="plasticWhite" />
    </group>
  );
}
