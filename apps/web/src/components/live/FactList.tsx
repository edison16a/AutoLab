import type { ReactNode } from "react";
import { StatusDot, type DotState } from "../ui/StatusDot";

export interface Fact {
  label: string;
  value: ReactNode;
  /** A status dot before the value, for on/off facts. The words still carry the meaning. */
  dot?: DotState;
}

/** A titled list of label and value pairs for the side panel. */
export function FactList({ title, facts }: { title: string; facts: Fact[] }) {
  return (
    <section className="live-side__section" aria-label={title}>
      <div className="live-side__head">
        <h2 className="live-side__title">{title}</h2>
      </div>
      <dl className="live-facts">
        {facts.map((fact) => (
          <div key={fact.label} className="live-facts__row">
            <dt>{fact.label}</dt>
            <dd>
              {fact.dot ? <StatusDot state={fact.dot} /> : null}
              <span className="live-facts__value">{fact.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
