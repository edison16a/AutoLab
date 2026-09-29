"use client";
import { useRef, useState } from "react";
import type { Group } from "three";
import { Block, Highlight, SceneLabel } from "@/components/three";
import { CameraModel } from "@/components/three/models/CameraModel";
import { FPCModel } from "@/components/three/models/FPCModel";
import { CAMERA_POSITION, CSI_BOX, CSI_LABEL, PI_POSITION, RIBBON_LIFT, RIBBON_ROUTE, RIBBON_Z } from "./bench-layout";
import { useOnePass } from "./use-one-pass";

interface CameraAssemblyProps {
  /** Animate the ribbon in. False shows it already seated. */
  play: boolean;
  /** Outline and name the CSI port. Only the camera step does. */
  emphasize?: boolean;
  /** Light the camera's LED. */
  live?: boolean;
}

/**
 * The HQ camera and its ribbon. On the camera step they lower together
 * until the ribbon's end slides into the Pi's CSI port, which is outlined
 * the whole time so the eye knows where to look.
 */
export function CameraAssembly({ play, emphasize = false, live = false }: CameraAssemblyProps) {
  const lift = useRef<Group>(null);
  const port = useRef<Group>(null);
  const [seated, setSeated] = useState(!play);

  useOnePass({
    duration: 1.6,
    delay: 0.5,
    play,
    apply: (progress) => {
      if (lift.current) lift.current.position.y = RIBBON_LIFT * (1 - progress);
    },
    onDone: () => setSeated(true),
  });

  return (
    <group>
      <group ref={lift}>
        <group position={CAMERA_POSITION}>
          <CameraModel live={live} />
        </group>
        <group position={[0, 0, RIBBON_Z]}>
          <FPCModel points={RIBBON_ROUTE} />
        </group>
      </group>
      {emphasize ? (
        <group position={PI_POSITION}>
          {/* A copy of the connector in its own material, only so the outline has a mesh to trace. */}
          <group ref={port}>
            <Block position={CSI_BOX.position} size={CSI_BOX.size} material="plasticWhite" />
          </group>
          <Highlight target={port} variant={seated ? "selected" : "hover"} />
          <SceneLabel text="CSI camera port" position={CSI_LABEL} tone={seated ? "accent" : "plain"} />
        </group>
      ) : null}
    </group>
  );
}
