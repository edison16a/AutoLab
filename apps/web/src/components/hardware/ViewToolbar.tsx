"use client";
import { Cable, Layers, RotateCcw } from "lucide-react";

interface ViewToolbarProps {
  exploded: boolean;
  connections: boolean;
  /** Exploded and Connections only apply to the whole machine, so they hide while inspecting. */
  inspecting: boolean;
  onReset: () => void;
  onToggleExploded: () => void;
  onToggleConnections: () => void;
}

/** The small floating bar over the 3D view. */
export function ViewToolbar({ exploded, connections, inspecting, onReset, onToggleExploded, onToggleConnections }: ViewToolbarProps) {
  return (
    <div className="hardware-toolbar" role="toolbar" aria-label="View">
      <button type="button" className="hardware-toolbar__btn" title="Reset view" onClick={onReset}>
        <RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="hardware-toolbar__text">Reset view</span>
      </button>
      {inspecting ? null : (
        <>
          <span className="hardware-toolbar__divider" aria-hidden="true" />
          <button type="button" className="hardware-toolbar__btn" title="Exploded view" aria-pressed={exploded} onClick={onToggleExploded}>
            <Layers size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="hardware-toolbar__text">Exploded view</span>
          </button>
          <button type="button" className="hardware-toolbar__btn" title="Connections" aria-pressed={connections} onClick={onToggleConnections}>
            <Cable size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="hardware-toolbar__text">Connections</span>
          </button>
        </>
      )}
    </div>
  );
}
