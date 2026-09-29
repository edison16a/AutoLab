"use client";
import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { HitBox } from "@/components/three/interaction/HitBox";
import { Highlight } from "@/components/three/interaction/Highlight";
import { SceneLabel } from "@/components/three/interaction/SceneLabel";
import { PART_MODELS } from "@/components/three/models";
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

/** A long pause between frames (the loop sleeps when idle) must not turn into a jump. */
const MAX_STEP = 1 / 30;
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

  useEffect(() => invalidate(), [target, invalidate]);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node || node.position.distanceToSquared(target) < 1e-7) return;
    node.position.lerp(target, 1 - Math.exp(-Math.min(delta, MAX_STEP) * EASE_RATE));
    if (node.position.distanceToSquared(target) < 1e-6) node.position.copy(target);
    refreshShadows();
    invalidate();
  });

  const Model = PART_MODELS[part.model];
  const [cx, cy, cz] = part.center ?? [0, 0, 0];
  const labelAnchor: Vec3 = [cx, cy + part.size[1] / 2, cz];

  return (
    <group ref={group} position={part.position} name={part.id}>
      <group ref={model} rotation={part.rotation}>
        <Model live={live} />
      </group>
      {partHitBoxes(part).map((hit, index) => (
        <HitBox
          key={index}
          center={hit.center}
          size={hit.size}
          onOver={() => onHover?.(part.id, true)}
          onOut={() => onHover?.(part.id, false)}
          onPick={() => onSelect?.(part.id)}
        />
      ))}
      <Highlight target={model} variant={selected ? "selected" : hovered ? "hover" : null} />
      {selected || hovered ? <SceneLabel text={part.shortName} position={labelAnchor} tone={selected ? "accent" : "plain"} /> : null}
    </group>
  );
});
