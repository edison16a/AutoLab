"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isPartId } from "@/data/hardware-parts";

/**
 * What the Hardware screen is showing. `flight` counts camera moves: every
 * action that should fly the camera bumps it, so selecting the same part
 * again after orbiting away flies back to it.
 */
interface ViewState {
  selected: string | null;
  inspecting: boolean;
  exploded: boolean;
  connections: boolean;
  flight: number;
}

type ViewAction =
  | { type: "select"; id: string }
  | { type: "clear" }
  | { type: "inspect" }
  | { type: "back" }
  | { type: "reset" }
  | { type: "escape" }
  | { type: "explode" }
  | { type: "connections" };

const INITIAL: ViewState = { selected: null, inspecting: false, exploded: false, connections: false, flight: 0 };

function reduce(state: ViewState, action: ViewAction): ViewState {
  const fly = state.flight + 1;
  switch (action.type) {
    case "select":
      return { ...state, selected: action.id, inspecting: false, flight: fly };
    case "clear":
      return { ...state, selected: null, inspecting: false, flight: fly };
    case "inspect":
      return state.selected ? { ...state, inspecting: true, flight: fly } : state;
    case "back":
      return { ...state, inspecting: false, flight: fly };
    case "reset":
      return { ...state, selected: null, inspecting: false, flight: fly };
    // First Escape leaves the isolated view, the second clears the selection.
    case "escape":
      if (state.inspecting) return { ...state, inspecting: false, flight: fly };
      if (state.selected) return { ...state, selected: null, flight: fly };
      return state;
    case "explode":
      return { ...state, exploded: !state.exploded, flight: fly };
    case "connections":
      return { ...state, connections: !state.connections };
  }
}

/** Keeps ?part=<id> in the address bar in step with the selection, without a navigation. */
function syncPartParam(id: string | null) {
  const url = new URL(window.location.href);
  if ((url.searchParams.get("part") ?? null) === id) return;
  if (id) url.searchParams.set("part", id);
  else url.searchParams.delete("part");
  window.history.replaceState(window.history.state, "", url);
}

/** Selection, inspect mode and the view toggles for the Hardware screen. */
export function useHardwareView() {
  const [state, dispatch] = useReducer(reduce, INITIAL);
  const [hovered, setHovered] = useState<string | null>(null);
  const params = useSearchParams();
  const requested = params.get("part");
  // The latest selection, read by the effect below without re-running it.
  const selectedRef = useRef(state.selected);
  selectedRef.current = state.selected;

  // Home links here with ?part=<id>. Our own address updates come back through here too, so skip those.
  useEffect(() => {
    if (isPartId(requested) && requested !== selectedRef.current) dispatch({ type: "select", id: requested });
  }, [requested]);

  // Leave an incoming ?part= alone on the first pass; the select above hasn't landed yet.
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current && state.selected === null) return;
    synced.current = true;
    syncPartParam(state.selected);
  }, [state.selected]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Menus and dialogs close on Escape themselves; don't also change the view underneath.
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      dispatch({ type: "escape" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const select = useCallback((id: string) => dispatch({ type: "select", id }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const inspect = useCallback(() => dispatch({ type: "inspect" }), []);
  const back = useCallback(() => dispatch({ type: "back" }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const toggleExploded = useCallback(() => dispatch({ type: "explode" }), []);
  const toggleConnections = useCallback(() => dispatch({ type: "connections" }), []);

  return { ...state, hovered, setHovered, select, clear, inspect, back, reset, toggleExploded, toggleConnections };
}

export type HardwareView = ReturnType<typeof useHardwareView>;
