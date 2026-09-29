"use client";
import { Component, type ReactNode } from "react";
import { Box } from "lucide-react";

/** Exact copy the e2e tests look for. */
export const STAGE_UNAVAILABLE = "3D view is unavailable in this browser.";

/** Shown instead of the canvas when WebGL is missing, fails, or loses its context. */
export function StageFallback() {
  return (
    <div className="stage3d__fallback" role="status">
      <Box size={20} strokeWidth={1.8} aria-hidden="true" />
      <p>{STAGE_UNAVAILABLE}</p>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
}

/**
 * Catches errors thrown while building the scene (a driver that rejects a
 * shader, for example) so a broken 3D view never takes the page with it.
 */
export class StageBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <StageFallback /> : this.props.children;
  }
}
