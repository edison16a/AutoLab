import Link from "next/link";
import { dayLabel, formatDateTime, formatTime } from "@/lib/format";
import type { Photo } from "@/model/types";
import { ImageView } from "../ui/ImageView";

function objectsLabel(count: number) {
  return count === 1 ? "1 object" : `${count} objects`;
}

/**
 * One recent capture: the thumbnail, when it was taken, and what was found
 * if it was analyzed. The aria-label replaces the visible text for screen
 * readers, so it repeats the object count.
 */
export function CaptureThumb({ photo }: { photo: Photo }) {
  const found = photo.analysis ? objectsLabel(photo.analysis.detections.length) : null;
  const name = `Open image from ${formatDateTime(photo.captured_at)}${found ? `, ${found}` : ""}`;

  return (
    <Link href={`/data/${photo.id}`} className="home-capture" aria-label={name}>
      <span className="home-capture__thumb">
        <ImageView url={photo.url} width={photo.width} height={photo.height} fit="cover" alt="" />
      </span>
      <span className="home-capture__meta">
        <span className="home-capture__time num">
          {dayLabel(photo.captured_at)}, {formatTime(photo.captured_at)}
        </span>
        {found ? <span className="badge badge--accent">{found}</span> : null}
      </span>
    </Link>
  );
}

/** Same footprint as a capture, shown while the library loads. */
export function CaptureSkeleton() {
  return (
    <div className="home-capture home-capture--skeleton" aria-hidden="true">
      <span className="home-capture__thumb skeleton" />
      <span className="home-capture__meta" />
    </div>
  );
}
