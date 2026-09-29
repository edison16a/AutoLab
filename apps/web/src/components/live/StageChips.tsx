import type { ReactNode } from "react";

/**
 * A thin row across the top of the stage: what you're looking at on the
 * left, numbers on the right. It sits above the picture, not on it, so it
 * never hides part of the image.
 */
export function StageChips({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  return (
    <div className="live-stage__bar">
      <div className="live-stage__chips">{start}</div>
      <div className="live-stage__chips">{end}</div>
    </div>
  );
}

/** One small pill. `live` adds the accent dot that marks a moving picture. */
export function Chip({ children, live }: { children: ReactNode; live?: boolean }) {
  return (
    <span className={`live-chip ${live ? "live-chip--live" : ""}`}>
      {live ? <span className="dot dot--online" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
