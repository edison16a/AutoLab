"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { Box3, Vector3, type Group } from "three";
import { PART_MODELS } from "@/components/three/models";
import { useShadowRefresh } from "@/components/three/stage/StageShadows";
import type { Vec3 } from "@/components/three/types";
import type { PartDefinition } from "@/data/hardware-parts";

export interface InspectMeasure {
  id: string;
  center: Vec3;
  radius: number;
}

interface InspectSceneProps {
  part: PartDefinition;
  live: boolean;
  /** Reports the part's real bounds once placed, so the camera can frame it. */
  onMeasured: (measure: InspectMeasure) => void;
}

/**
 * One part alone on the plain stage. It's measured after its first render,
 * then centred and set down on the floor, so every model sits the same way
 * whatever its own origin is.
 */
export function InspectScene({ part, live, onMeasured }: InspectSceneProps) {
  const inner = useRef<Group>(null);
  const [offset, setOffset] = useState<Vec3 | null>(null);
  const refreshShadows = useShadowRefresh();
  const Model = PART_MODELS[part.model];

  useLayoutEffect(() => {
    const node = inner.current;
    if (!node) return;
    node.updateWorldMatrix(true, true);
    const bounds = new Box3().setFromObject(node);
    const size = bounds.getSize(new Vector3());
    const middle = bounds.getCenter(new Vector3());
    setOffset([-middle.x, -bounds.min.y, -middle.z]);
    onMeasured({ id: part.id, center: [0, size.y / 2, 0], radius: size.length() / 2 });
    refreshShadows();
  }, [part.id, onMeasured, refreshShadows]);

  return (
    <group position={offset ?? undefined} visible={offset !== null}>
      <group ref={inner} rotation={part.inspectRotation ?? part.rotation}>
        <Model live={live} />
      </group>
    </group>
  );
}
