"use client";
import { ArrowLeft, Box, X } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { StatusDot } from "../ui/StatusDot";
import type { PartDefinition } from "@/data/hardware-parts";
import { CameraActions } from "./CameraActions";
import { PartFacts } from "./PartFacts";
import type { PartState } from "./use-part-states";

interface PartDetailsProps {
  part: PartDefinition;
  state: PartState;
  inspecting: boolean;
  onInspect: () => void;
  onBack: () => void;
  onClose: () => void;
}

/**
 * The selected part: name, category, status, wiring and whatever the device
 * really reports. Parts that aren't installed show just that, never a
 * placeholder reading. The primary button swaps between the isolated view
 * and the machine in the same spot.
 */
export function PartDetails({ part, state, inspecting, onInspect, onBack, onClose }: PartDetailsProps) {
  return (
    <aside className="hardware-details" aria-label={`${part.shortName} details`}>
      <header className="hardware-details__head">
        <div className="hardware-details__title">
          <span className="label">{part.category}</span>
          <h2>{part.name}</h2>
        </div>
        <IconButton icon={X} label="Close details" small onClick={onClose} />
      </header>
      <p className="hardware-details__status">
        <StatusDot state={state.dot} />
        <span>{state.status}</span>
      </p>
      <PartFacts connection={part.connection} facts={state.facts} />
      <div className="hardware-details__actions">
        {/* One button that changes its job, so keyboard focus stays put when the view switches. */}
        <button type="button" className="btn btn--primary btn--block" onClick={inspecting ? onBack : onInspect}>
          {inspecting ? <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" /> : <Box size={16} strokeWidth={1.8} aria-hidden="true" />}
          {inspecting ? "Back to machine" : "Inspect item"}
        </button>
        {part.id === "camera" ? <CameraActions /> : null}
      </div>
    </aside>
  );
}
