"use client";
import { useNow } from "@/hooks/use-now";
import { formatDateTime, relativeTime } from "@/lib/format";
import { CopyButton } from "../ui/CopyButton";
import type { PartFact } from "./use-part-states";

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
          ) : fact.mono && fact.value ? (
            // IDs stay on one line and copy in full, the same as the Image ID on Data.
            <dd className="hardware-facts__id">
              <span className="mono" title={fact.value}>
                {fact.value}
              </span>
              <CopyButton text={fact.value} label={`Copy ${fact.label.toLowerCase()}`} />
            </dd>
          ) : (
            <dd>{fact.value}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}
