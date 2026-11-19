"use client";
import { useMemo, useState, type KeyboardEvent } from "react";
import { Search, SearchX } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { StatusDot } from "../ui/StatusDot";
import { HARDWARE_PARTS, PART_CATEGORIES, type PartDefinition } from "@/data/hardware-parts";
import type { PartState } from "./use-part-states";

interface PartsListProps {
  states: Record<string, PartState>;
  selected: string | null;
  hovered: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

/** Matches names, short names and categories, so "fluidics" finds the whole liquid handling system. */
function matches(part: PartDefinition, query: string) {
  return `${part.name} ${part.shortName} ${part.category}`.toLowerCase().includes(query);
}

/**
 * Every part, grouped by area, with a search box. Rows and the 3D view share
 * hover and selection, so pointing at either lights up the other.
 */
export function PartsList({ states, selected, hovered, onSelect, onHover }: PartsListProps) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      PART_CATEGORIES.map((category) => ({
        category,
        parts: HARDWARE_PARTS.filter((part) => part.category === category && (!needle || matches(part, needle))),
      })).filter((group) => group.parts.length > 0),
    [needle],
  );
  const live = HARDWARE_PARTS.filter((part) => states[part.id]?.live).length;

  // Escape in the box clears it first; the view only hears Escape once the box is empty.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && query) {
      event.preventDefault();
      setQuery("");
    }
  };

  return (
    <aside className="hardware-list" aria-label="Components">
      <div className="hardware-list__head">
        <div className="hardware-list__title">
          <h2>Components</h2>
          <span className="small muted num">{live} live</span>
        </div>
        <label className="hardware-search">
          <Search size={16} strokeWidth={1.8} aria-hidden="true" />
          <input
            className="input hardware-search__input"
            type="search"
            placeholder="Search"
            aria-label="Search components"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </label>
      </div>
      <div className="hardware-list__scroll">
        {groups.length === 0 ? (
          <EmptyState icon={SearchX} title="No matches" compact />
        ) : (
          groups.map((group) => (
            <section key={group.category} className="hardware-list__group" aria-label={group.category}>
              <h3 className="hardware-list__category">{group.category}</h3>
              <ul className="hardware-list__rows">
                {group.parts.map((part) => (
                  <li key={part.id}>
                    <button
                      type="button"
                      className={`hardware-row${selected === part.id ? " hardware-row--selected" : ""}${hovered === part.id ? " hardware-row--hovered" : ""}`}
                      data-component-id={part.id}
                      aria-current={selected === part.id ? "true" : undefined}
                      onClick={() => onSelect(part.id)}
                      onMouseEnter={() => onHover(part.id)}
                      onMouseLeave={() => onHover(null)}
                    >
                      <StatusDot state={states[part.id]?.dot ?? "offline"} />
                      <span className="hardware-row__name">{part.shortName}</span>
                      <span className="visually-hidden">, {states[part.id]?.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
