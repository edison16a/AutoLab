"use client";
import Link from "next/link";
import { Images } from "lucide-react";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { Photo } from "@/model/types";
import { EmptyState } from "../ui/EmptyState";
import { useNow } from "@/hooks/use-now";

interface CaptureGridProps {
  title: string;
  photos: Photo[];
  /** Shown instead of the grid until the first photo lands. */
  emptyText: string;
}

/**
 * The last few photos from the camera on screen, so a new capture shows up
 * right away. Each one opens in the library.
 */
export function CaptureGrid({ title, photos, emptyText }: CaptureGridProps) {
  const now = useNow(30_000);

  return (
    <section className="live-side__section" aria-label={title}>
      <div className="live-side__head">
        <h2 className="live-side__title">{title}</h2>
        {photos.length ? (
          <Link href="/data" className="section__link">
            View all
          </Link>
        ) : null}
      </div>
      {photos.length ? (
        <ul className="capture-grid">
          {photos.map((photo) => (
            <li key={photo.id}>
              <Link
                href={`/data/${photo.id}`}
                className="capture-grid__item"
                aria-label={`Open photo from ${formatDateTime(photo.captured_at)}`}
              >
                <span className="capture-grid__thumb">
                  <img src={photo.url} alt="" loading="lazy" draggable={false} />
                </span>
                <span className="capture-grid__time">{relativeTime(photo.captured_at, now)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact icon={Images} title="No photos yet" text={emptyText} />
      )}
    </section>
  );
}
