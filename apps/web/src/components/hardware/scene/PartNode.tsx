"use client";
import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { HitBox } from "@/components/three/interaction/HitBox";
import { Highlight } from "@/components/three/interaction/Highlight";
import { SceneLabel } from "@/components/three/interaction/SceneLabel";
import { PART_MODELS } from "@/components/three/models";
import { useEaseClock } from "@/components/three/explode/ease-clock";
import { Rig } from "@/components/three/motion/Rig";
import { useShadowRefresh } from "@/components/three/stage/StageShadows";
import type { Vec3 } from "@/components/three/types";
import { partHitBoxes, partPosition, type PartDefinition } from "@/data/hardware-parts";

export interface PartNodeProps {
  part: PartDefinition;
  live: boolean;
  exploded: boolean;
  selected: boolean;
  hovered: boolean;
  /** Called with `over` true on enter and false on leave, so the parent can ignore a stale leave. */
  onHover?: (id: string, over: boolean) => void;
  onSelect?: (id: string) => void;
}

const EASE_RATE = 7;

/**
 * One selectable part on the machine: its model, steady hit boxes, the
 * accent outline when hovered or selected, and a name label. It eases to
 * its exploded position and back, keeping the shadows in step while it moves.
 */
export const PartNode = memo(function PartNode({ part, live, exploded, selected, hovered, onHover, onSelect }: PartNodeProps) {
  const group = useRef<Group>(null);
  const model = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const refreshShadows = useShadowRefresh();
  const target = useMemo(() => new Vector3(...partPosition(part, exploded)), [part, exploded]);
  const step = useEaseClock();

  useEffect(() => invalidate(), [target, invalidate]);

  useFrame(() => {
    const node = group.current;
    const moving = !!node && node.position.distanceToSquared(target) >= 1e-7;
    const dt = step(moving);
    if (!node || !moving) return;
    node.position.lerp(target, 1 - Math.exp(-dt * EASE_RATE));
    if (node.position.distanceToSquared(target) < 1e-6) node.position.copy(target);
    refreshShadows();
    invalidate();
  });

  const Model = PART_MODELS[part.model];
  const [cx, cy, cz] = part.center ?? [0, 0, 0];
  const labelAnchor: Vec3 = [cx, cy + part.size[1] / 2, cz];

  const node = (
    <group ref={group} position={part.position} name={part.id}>
      <group ref={model} rotation={part.rotation}>
        <Model live={live} />
      </group>
      {partHitBoxes(part).map((hit, index) => {
        const box = (
          <HitBox
            key={index}
            center={hit.center}
            size={hit.size}
            onOver={() => onHover?.(part.id, true)}
            onOut={() => onHover?.(part.id, false)}
            onPick={() => onSelect?.(part.id)}
          />
        );
        return hit.rig ? (
          <Rig key={index} rig={hit.rig}>
            {box}
          </Rig>
        ) : (
          box
        );
      })}
      <Highlight target={model} variant={selected ? "selected" : hovered ? "hover" : null} />
      {selected || hovered ? <SceneLabel text={part.shortName} position={labelAnchor} tone={selected ? "accent" : "plain"} /> : null}
    </group>
  );
  // Parts on the moving machine ride their rig in the Home demo; everywhere else it holds still.
  return part.rig ? <Rig rig={part.rig}>{node}</Rig> : node;
});
