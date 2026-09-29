import type { ReactNode } from "react";

/**
 * Small labels pinned to the top corners of the stage: what you're looking
 * at on the left, numbers on the right.
 */
export function StageChips({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  return (
    <>
      {start ? <div className="live-stage__chips live-stage__chips--start">{start}</div> : null}
      {end ? <div className="live-stage__chips live-stage__chips--end">{end}</div> : null}
    </>
  );
}

/** One chip. `live` adds the accent dot that marks a moving picture. */
export function Chip({ children, live }: { children: ReactNode; live?: boolean }) {
  return (
    <span className="live-chip">
      {live ? <span className="dot dot--online" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
