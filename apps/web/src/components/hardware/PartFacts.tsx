"use client";
import { useEffect, useState } from "react";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { PartFact } from "./use-part-states";

/** Re-renders every so often so "12s ago" keeps counting while the panel is open. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** The wiring line plus the facts the device reports, as a two column list. */
export function PartFacts({ connection, facts }: { connection: string; facts: PartFact[] }) {
  const now = useNow(10_000);
  if (!connection && facts.length === 0) return null;
  return (
    <dl className="hardware-facts">
      {connection ? (
        <div className="hardware-facts__row">
          <dt>Connection</dt>
          <dd>{connection}</dd>
        </div>
      ) : null}
      {facts.map((fact) => (
        <div key={fact.label} className="hardware-facts__row">
          <dt>{fact.label}</dt>
          {fact.time !== undefined ? (
            <dd className="num" title={fact.time ? formatDateTime(fact.time) : undefined}>
              {relativeTime(fact.time, now)}
            </dd>
          ) : (
            <dd className={fact.mono ? "mono hardware-facts__mono" : undefined}>{fact.value}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}
