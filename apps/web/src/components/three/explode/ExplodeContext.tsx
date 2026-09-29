"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { useShadowRefresh } from "../stage/StageShadows";
import type { Vec3 } from "../types";

/** How far the exploded view has opened: 0 assembled, 1 fully apart. Read it in useFrame. */
interface ExplodeState {
  progress: number;
  target: number;
}

const ExplodeContext = createContext<ExplodeState | null>(null);

/** The same easing the parts use (see PartNode), so the enclosure opens in step with them. */
const EASE_RATE = 7;
const MAX_STEP = 1 / 30;

/**
 * Eases one shared progress value toward the exploded view and back, for
 * the parts of the machine that aren't selectable parts: the enclosure's
 * walls, roof and door move out with it and the wiring hides while it is
 * open. Nothing re-renders; readers pick it up in useFrame.
 */
export function ExplodeProvider({ exploded, children }: { exploded: boolean; children: ReactNode }) {
  const state = useMemo<ExplodeState>(() => ({ progress: exploded ? 1 : 0, target: exploded ? 1 : 0 }), []);
  const invalidate = useThree((three) => three.invalidate);
  const refreshShadows = useShadowRefresh();

  useEffect(() => {
    state.target = exploded ? 1 : 0;
    invalidate();
  }, [exploded, state, invalidate]);

  useFrame((_, delta) => {
    const gap = state.target - state.progress;
    if (gap === 0) return;
    state.progress = Math.abs(gap) < 1e-3 ? state.target : state.progress + gap * (1 - Math.exp(-Math.min(delta, MAX_STEP) * EASE_RATE));
    refreshShadows();
    invalidate();
  }, -1);

  return <ExplodeContext.Provider value={state}>{children}</ExplodeContext.Provider>;
}

/** A group that moves out by `offset` as the view explodes. Outside a provider it stays put. */
export function ExplodeShift({ offset, children }: { offset: Vec3; children: ReactNode }) {
  const state = useContext(ExplodeContext);
  const group = useRef<Group>(null);
  useFrame(() => {
    if (!state || !group.current) return;
    const p = state.progress;
    group.current.position.set(offset[0] * p, offset[1] * p, offset[2] * p);
  });
  return <group ref={group}>{children}</group>;
}

/**
 * A group shown only while the machine is assembled. Wiring and gas lines
 * stay fastened to the frame, so as parts move away they would dangle; they
 * go as the view opens and come back once everything is home again.
 */
export function HideWhenExploded({ children }: { children: ReactNode }) {
  const state = useContext(ExplodeContext);
  const group = useRef<Group>(null);
  useFrame(() => {
    if (state && group.current) group.current.visible = state.progress < 0.02;
  });
  return <group ref={group}>{children}</group>;
}
