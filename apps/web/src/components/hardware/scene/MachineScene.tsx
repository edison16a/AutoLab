"use client";
import { useCallback, useRef } from "react";
import { PrinterFrameModel } from "@/components/three/models";
import { HARDWARE_PARTS } from "@/data/hardware-parts";
import type { PartState } from "../use-part-states";
import { Connections } from "./Connections";
import { PartNode } from "./PartNode";

export interface MachineSceneProps {
  states: Record<string, PartState>;
  selected: string | null;
  hovered: string | null;
  exploded: boolean;
  connections: boolean;
  onHover: (id: string | null) => void;
  onSelect?: (id: string) => void;
}

/** The whole machine in context: the frame, every part in place, and the wiring when asked for. */
export function MachineScene({ states, selected, hovered, exploded, connections, onHover, onSelect }: MachineSceneProps) {
  // A leave that arrives after the next part's enter must not clear the new hover. Reading the
  // latest hover through a ref keeps this callback stable, so hovering doesn't re-render every part.
  const hoveredRef = useRef(hovered);
  hoveredRef.current = hovered;
  const hover = useCallback(
    (id: string, over: boolean) => {
      if (over) onHover(id);
      else if (hoveredRef.current === id) onHover(null);
    },
    [onHover],
  );

  return (
    <group>
      <PrinterFrameModel />
      {HARDWARE_PARTS.map((part) => (
        <PartNode
          key={part.id}
          part={part}
          live={states[part.id]?.live ?? false}
          exploded={exploded}
          selected={selected === part.id}
          hovered={hovered === part.id && selected !== part.id}
          onHover={hover}
          onSelect={onSelect}
        />
      ))}
      {connections ? (
        <Connections selected={selected} exploded={exploded} cameraLive={!!states.camera?.live} piLive={!!states.raspberry_pi?.live} />
      ) : null}
    </group>
  );
}
