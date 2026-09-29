"use client";
import { Cable, Layers, Pause, Play, RotateCcw } from "lucide-react";

interface ViewToolbarProps {
  exploded: boolean;
  connections: boolean;
  /** The Home demo is running here. */
  live: boolean;
  /** Exploded, Live view and Connections only apply to the whole machine, so they hide while inspecting. */
  inspecting: boolean;
  onReset: () => void;
  onToggleExploded: () => void;
  onToggleLive: () => void;
  onToggleConnections: () => void;
}

/** The small floating bar over the 3D view. */
export function ViewToolbar({ exploded, connections, live, inspecting, onReset, onToggleExploded, onToggleLive, onToggleConnections }: ViewToolbarProps) {
  const LiveIcon = live ? Pause : Play;
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
          {/* Plays the same pipetting run as Home. The icon says what a press will do. */}
          <button type="button" className="hardware-toolbar__btn" title={live ? "Pause" : "Play"} aria-pressed={live} onClick={onToggleLive}>
            <LiveIcon size={16} strokeWidth={1.8} aria-hidden="true" />
            <span className="hardware-toolbar__text">Live view</span>
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
