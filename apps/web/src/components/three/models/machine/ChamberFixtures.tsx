"use client";
import { Block, Ring } from "../../primitives";

/**
 * Small brackets inside the chamber that hold parts in place: the sensor
 * rail on the back wall, the pH probe clip on the left wall and the camera
 * dock on the right upright.
 */
export function ChamberFixtures() {
  return (
    <group>
      <Block position={[0.2, 3.45, -1.74]} size={[3.3, 0.1, 0.04]} radius={0.015} material="aluminium" />
      <group position={[-2.06, 1.95, -1.55]}>
        <Block size={[0.08, 0.12, 0.2]} radius={0.02} material="plasticGrey" />
        <Ring position={[0.1, 0.02, 0]} radius={0.075} material="plasticGrey" />
      </group>
      {/* Camera dock: an arm off the right upright and two rails under the board edges. */}
      <group position={[1.35, 2.26, -0.05]}>
        <Block position={[0.1, 0, -0.34]} size={[0.9, 0.05, 0.1]} radius={0.015} material="aluminium" />
        {[-0.27, 0.27].map((x) => (
          <Block key={x} position={[x, 0, 0]} size={[0.06, 0.05, 0.66]} radius={0.015} material="aluminium" />
        ))}
      </group>
    </group>
  );
}
