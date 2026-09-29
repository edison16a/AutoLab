import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";

interface ChartPanelProps {
  title: string;
  /** The one number to take away, and a few words on what it is. */
  headline?: { value: string; text: string };
  /** Set when there's nothing to draw in the current range. */
  empty?: { icon: LucideIcon; title: string } | null;
  /** The chart's numbers as a table, for anyone who can't or won't read the chart. */
  table?: ReactNode;
  children: ReactNode;
  /** Extra classes, such as `stats-panel--compact` for a panel with no fixed chart height. */
  className?: string;
}

/** A titled card holding one chart, its headline and its table. */
export function ChartPanel({ title, headline, empty, table, children, className = "" }: ChartPanelProps) {
  const titleId = useId();
  return (
    <section className={`panel stats-panel ${className}`} aria-labelledby={titleId}>
      <header className="stats-panel__head">
        <h2 id={titleId} className="stats-panel__title">
          {title}
        </h2>
        {headline && !empty ? (
          <p className="stats-panel__headline">
            <span className="stats-panel__value">{headline.value}</span> {headline.text}
          </p>
        ) : null}
      </header>
      <div className="stats-panel__body">
        {empty ? <EmptyState compact icon={empty.icon} title={empty.title} /> : children}
      </div>
      {empty ? null : table}
    </section>
  );
}
