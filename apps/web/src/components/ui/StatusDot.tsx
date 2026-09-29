/** Online uses the accent, idle is a filled grey, offline is a hollow ring. */
export type DotState = "online" | "idle" | "offline";

export function StatusDot({ state }: { state: DotState }) {
  return <span className={`dot dot--${state}`} aria-hidden="true" />;
}
