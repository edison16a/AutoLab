"use client";
import Link from "next/link";
import { Images } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";
import { EmptyState } from "../ui/EmptyState";
import { CaptureSkeleton, CaptureThumb } from "./CaptureThumb";

/** Two rows at four across, one screen's worth without scrolling on a laptop. */
const RECENT_COUNT = 8;

/** The newest captures from every device, with a way into the full library. */
export function RecentCaptures() {
  const { photos, photosReady } = useAutolab();
  const recent = photos.slice(0, RECENT_COUNT);

  let body;
  if (!photosReady) {
    body = (
      <ul className="home-captures__grid" aria-busy="true">
        {Array.from({ length: RECENT_COUNT }, (_, i) => (
          <li key={i}>
            <CaptureSkeleton />
          </li>
        ))}
      </ul>
    );
  } else if (!recent.length) {
    body = (
      <div className="home-captures__empty">
        <EmptyState
          icon={Images}
          title="No photos yet"
          action={
            <Link href="/live" className="btn">
              Open live view
            </Link>
          }
        />
      </div>
    );
  } else {
    body = (
      <ul className="home-captures__grid">
        {recent.map((photo) => (
          <li key={photo.id}>
            <CaptureThumb photo={photo} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="section home-captures" aria-labelledby="home-captures-title">
      <div className="section__head">
        <h2 id="home-captures-title">Recent captures</h2>
        {recent.length ? (
          <Link href="/data" className="section__link">
            View all
          </Link>
        ) : null}
      </div>
      {body}
    </section>
  );
}
