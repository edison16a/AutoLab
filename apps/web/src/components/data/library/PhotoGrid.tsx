"use client";
import type { DayGroup } from "./filters";
import { PhotoCard } from "./PhotoCard";

interface PhotoGridProps {
  groups: DayGroup[];
  selecting: boolean;
  selected: string[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

/** The library as one grid per day, each under a small heading with its count. */
export function PhotoGrid({ groups, selecting, selected, onToggle, onDelete }: PhotoGridProps) {
  const picked = new Set(selected);
  return (
    <div className="data-days">
      {groups.map((group) => (
        <section key={group.key} className="data-day" aria-label={group.label}>
          <h2 className="data-day__title">
            {group.label}
            <span className="data-day__count num">{group.photos.length}</span>
          </h2>
          <div className="data-grid">
            {group.photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                selecting={selecting}
                selected={picked.has(photo.id)}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
