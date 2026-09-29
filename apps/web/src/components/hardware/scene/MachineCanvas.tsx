"use client";
import { useCallback, useEffect, useState } from "react";
import { FocusControls } from "@/components/three/camera/FocusControls";
import { MachineMotion } from "@/components/three/motion/MachineMotion";
import { useReducedMotion } from "@/components/three/motion/use-reduced-motion";
import { Stage } from "@/components/three/Stage";
import { useShadowRefresh } from "@/components/three/stage/StageShadows";
import { partById } from "@/data/hardware-parts";
import { usePartStates } from "../use-part-states";
import { inspectFocus, MACHINE_BOUNDS, overviewFocus, partFocus } from "./camera-focus";
import { InspectScene, type InspectMeasure } from "./InspectScene";
import { MachineScene } from "./MachineScene";
import type { MachineViewProps } from "./machine-view-props";

/** Redraws the frozen shadows whenever what's on stage changes shape. */
function ShadowSync({ signature }: { signature: string }) {
  const refresh = useShadowRefresh();
  useEffect(() => refresh(), [signature, refresh]);
  return null;
}

/**
 * The machine on the 3D stage, with camera flights between the whole
 * machine, a focused part in context and the isolated inspect view.
 * Loaded on demand by MachineView so three.js stays out of the first bundle.
 */
export default function MachineCanvas({
  selected = null,
  hovered,
  onHover,
  onSelect,
  inspecting = false,
  exploded = false,
  connections = false,
  flight = 0,
  insetRight = 0,
  overviewFill,
  demo = false,
  className,
}: MachineViewProps) {
  const states = usePartStates();
  const [ownHover, setOwnHover] = useState<string | null>(null);
  const [measure, setMeasure] = useState<InspectMeasure | null>(null);
  const hoverId = hovered === undefined ? ownHover : hovered;
  const setHover = onHover ?? setOwnHover;
  const onMeasured = useCallback((next: InspectMeasure) => setMeasure(next), []);
  const reducedMotion = useReducedMotion();

  const part = selected ? partById[selected] ?? null : null;
  const inspectPart = inspecting ? part : null;
  const measured = inspectPart && measure?.id === inspectPart.id ? measure : null;

  // The key decides when to fly; the focus says where. Until the inspected
  // part is measured, keep the in-context key so the camera waits for it.
  const overview = overviewFocus(exploded);
  let focus = overviewFill ? { ...overview, fill: overviewFill } : overview;
  let focusKey = `machine:${exploded}:${flight}`;
  if (part && measured) {
    focus = inspectFocus(measured.center, measured.radius);
    focusKey = `inspect:${part.id}:${flight}`;
  } else if (part) {
    focus = partFocus(part, exploded);
    focusKey = `part:${part.id}:${exploded}:${inspecting ? "waiting" : flight}`;
  }

  const scene = (
    <MachineScene
      states={states}
      selected={selected}
      hovered={hoverId}
      exploded={exploded}
      connections={connections}
      onHover={setHover}
      onSelect={onSelect}
    />
  );

  return (
    <Stage label="3D model of the Autolab" className={className} shadowRadius={inspectPart ? 2.2 : 5.5}>
      <FocusControls
        focus={focus}
        focusKey={focusKey}
        // Close enough to read a chip marking, in context or on its own.
        minDistance={measured ? measured.radius * 1.05 : 0.3}
        maxDistance={measured ? measured.radius * 12 : 24}
        bounds={measured ? undefined : MACHINE_BOUNDS}
        insetRight={insetRight}
      />
      <MachineMotion active={demo && !reducedMotion && !inspectPart}>
        {inspectPart ? <InspectScene part={inspectPart} live={states[inspectPart.id]?.live ?? false} onMeasured={onMeasured} /> : scene}
      </MachineMotion>
      <ShadowSync signature={`${inspectPart?.id ?? ""}:${exploded}`} />
    </Stage>
  );
}
