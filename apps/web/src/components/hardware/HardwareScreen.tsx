"use client";
import "@/styles/hardware.css";
import "@/styles/hardware-list.css";
import "@/styles/hardware-details.css";
import { Suspense, useCallback, useRef } from "react";
import { partById } from "@/data/hardware-parts";
import { MachineView } from "./MachineView";
import { PartDetails } from "./PartDetails";
import { PartsList } from "./PartsList";
import { useHardwareView } from "./use-hardware-view";
import { usePartStates } from "./use-part-states";
import { useWideLayout } from "./use-wide-layout";
import { ViewToolbar } from "./ViewToolbar";

/** Width of the floating details panel plus its margins (see hardware-details.css). */
const DETAILS_INSET = 344;

/**
 * The Hardware screen: parts list on the left, the machine filling the rest,
 * a floating view toolbar, and the selected part's details over the right
 * edge of the canvas. On phones everything stacks: model, details, list.
 */
function HardwareWorkspace() {
  const view = useHardwareView();
  const states = usePartStates();
  const part = view.selected ? partById[view.selected] ?? null : null;
  const wide = useWideLayout();
  const stageRef = useRef<HTMLElement>(null);
  const { select } = view;

  // On phones the list sits below the model, so bring the model back into view to show the pick.
  const selectFromList = useCallback(
    (id: string) => {
      select(id);
      if (wide) return;
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stageRef.current?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    },
    [select, wide],
  );

  return (
    <div className="workspace">
      <div className="hardware">
        <PartsList states={states} selected={view.selected} hovered={view.hovered} onSelect={selectFromList} onHover={view.setHovered} />
        <section ref={stageRef} className="hardware__stage" aria-label="3D view">
          <MachineView
            className="hardware__canvas"
            selected={view.selected}
            hovered={view.hovered}
            onHover={view.setHovered}
            onSelect={view.select}
            inspecting={view.inspecting}
            exploded={view.exploded}
            connections={view.connections}
            flight={view.flight}
            insetRight={part && wide ? DETAILS_INSET : 0}
          />
          <ViewToolbar
            exploded={view.exploded}
            connections={view.connections}
            inspecting={view.inspecting}
            onReset={view.reset}
            onToggleExploded={view.toggleExploded}
            onToggleConnections={view.toggleConnections}
          />
        </section>
        {part ? (
          <PartDetails
            part={part}
            state={states[part.id]}
            inspecting={view.inspecting}
            onInspect={view.inspect}
            onBack={view.back}
            onClose={view.clear}
          />
        ) : null}
      </div>
    </div>
  );
}

/** useSearchParams needs a Suspense boundary so the route can still prerender. */
export function HardwareScreen() {
  return (
    <Suspense fallback={<div className="workspace" />}>
      <HardwareWorkspace />
    </Suspense>
  );
}
