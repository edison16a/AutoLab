"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useAutolab } from "@/providers/autolab-context";
import { homeTiles } from "./home-numbers";
import { useNow } from "@/hooks/use-now";

/**
 * Four headline numbers, each a way into Statistics. While the library is
 * still loading they show placeholders, so a zero is never a guess.
 */
export function NumberTiles() {
  const { photos, photosReady } = useAutolab();
  // A minute is plenty: it only moves "today" and "this week" over at midnight.
  const now = useNow(60_000);
  const tiles = useMemo(() => homeTiles(photos, now), [photos, now]);

  return (
    <ul className="home-tiles" aria-label="Statistics" aria-busy={!photosReady || undefined}>
      {tiles.map((tile) => (
        <li key={tile.label}>
          <Link href="/statistics" className="home-tile">
            <span className="home-tile__label">{tile.label}</span>
            {photosReady ? (
              <span className={`home-tile__value ${tile.value === null ? "home-tile__value--none" : ""}`}>
                {tile.value ?? "None"}
              </span>
            ) : (
              <span className="home-tile__value">
                <span className="skeleton home-tile__skeleton" />
              </span>
            )}
            <span className="home-tile__sub">{photosReady ? tile.sub : null}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
