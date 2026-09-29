"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { createPose, type MachinePose } from "./pose";
import { poseAt } from "./timeline";

const MotionContext = createContext<MachinePose | null>(null);

/**
 * The live pose while the Home demo runs, or null everywhere else. It is one
 * mutable object the clock rewrites each frame, so moving parts read it in
 * their own useFrame and React never re-renders for motion.
 */
export function useMachinePose() {
  return useContext(MotionContext);
}

/** Key light shadows are redrawn this often while the demo runs, rather than every frame. */
const SHADOW_SECONDS = 0.2;
/** A long gap between frames (the loop sleeps while paused) resumes where it left off. */
const MAX_STEP = 0.1;

/** False while the canvas is scrolled out of view or the tab is in the background. */
function useOnScreen() {
  const canvas = useThree((state) => state.gl.domElement);
  const [inView, setInView] = useState(true);
  const [tabShown, setTabShown] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(canvas);
    const sync = () => setTabShown(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [canvas]);
  return inView && tabShown;
}

/** Advances the demo clock and keeps frames coming only while the machine can be seen. */
function MotionClock({ pose }: { pose: MachinePose }) {
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const running = useOnScreen();
  const time = useRef(0);
  const shadowsAt = useRef(0);
  const frozen = useRef<number | null>(null);

  useEffect(() => {
    if (running) invalidate();
  }, [running, invalidate]);

  // Development only: screenshot scripts can stop the demo at a chosen moment, since software GL runs it far below real time.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const debug = window as { __autolabDemoAt?: (seconds: number) => void };
    debug.__autolabDemoAt = (seconds) => {
      frozen.current = seconds;
      invalidate();
    };
    return () => void delete debug.__autolabDemoAt;
  }, [invalidate]);

  // Runs before the parts read the pose this frame.
  useFrame((_, delta) => {
    if (frozen.current !== null) {
      poseAt(pose, frozen.current);
      gl.shadowMap.needsUpdate = true;
      return;
    }
    if (!running) return;
    time.current += Math.min(delta, MAX_STEP);
    poseAt(pose, time.current);
    if (time.current - shadowsAt.current >= SHADOW_SECONDS) {
      gl.shadowMap.needsUpdate = true;
      shadowsAt.current = time.current;
    }
    invalidate();
  }, -1);
  return null;
}

/**
 * Runs the Home demo for everything inside it while `active`: the gantry,
 * the pipette and the labware follow a looping media change, and the fan
 * spins. It pauses when the canvas leaves the screen or the tab is hidden.
 * Inactive, it hands out no pose and the machine stands at rest; the tree
 * is the same either way, so switching never remounts the machine.
 */
export function MachineMotion({ active, children }: { active: boolean; children: ReactNode }) {
  const pose = useMemo(() => {
    const start = createPose();
    poseAt(start, 0);
    return start;
  }, []);
  return (
    <MotionContext.Provider value={active ? pose : null}>
      {active ? <MotionClock pose={pose} /> : null}
      {children}
    </MotionContext.Provider>
  );
}
