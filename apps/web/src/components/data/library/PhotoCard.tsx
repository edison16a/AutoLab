"use client";
import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
import { formatDateTime, formatTime } from "@/lib/format";
import type { Photo } from "@/model/types";
import { ImageView } from "../../ui/ImageView";
import { rememberScroll } from "./use-scroll-return";

interface PhotoCardProps {
  photo: Photo;
  /** In select mode the whole card toggles the checkbox instead of opening the image. */
  selecting: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function objectsLabel(count: number) {
  return count === 1 ? "1 object" : `${count} objects`;
}

/** The time and analysis badge under a thumbnail. */
function CardMeta({ photo }: { photo: Photo }) {
  return (
    <span className="photo-card__meta">
      <span className="photo-card__time num">{formatTime(photo.captured_at)}</span>
      {photo.analysis ? (
        <span className="badge badge--accent">{objectsLabel(photo.analysis.detections.length)}</span>
      ) : (
        <span className="badge">Not analyzed</span>
      )}
    </span>
  );
}

/**
 * One image in the library grid. The delete button sits beside the link
 * rather than inside it, since a button nested in a link is invalid and
 * would open the image as well.
 */
export function PhotoCard({ photo, selecting, selected, onToggle, onDelete }: PhotoCardProps) {
  const thumb = (
    <span className="photo-card__thumb">
      <ImageView url={photo.url} width={photo.width} height={photo.height} fit="cover" alt="" />
    </span>
  );

  if (selecting) {
    return (
      <div className={`photo-card photo-card--selecting ${selected ? "is-selected" : ""}`} data-photo-id={photo.id}>
        <label className="photo-card__link">
          <input
            type="checkbox"
            className="photo-card__checkbox"
            checked={selected}
            onChange={() => onToggle(photo.id)}
            aria-label={`Select image from ${formatDateTime(photo.captured_at)}`}
          />
          <span className="photo-card__check" aria-hidden="true">
            <Check size={14} strokeWidth={2.4} />
          </span>
          {thumb}
          <CardMeta photo={photo} />
        </label>
      </div>
    );
  }

  return (
    <div className="photo-card" data-photo-id={photo.id}>
      <Link
        href={`/data/${photo.id}`}
        className="photo-card__link"
        aria-label={`Open image from ${formatDateTime(photo.captured_at)}`}
        onClick={rememberScroll}
      >
        {thumb}
        <CardMeta photo={photo} />
      </Link>
      <button type="button" className="photo-card__delete" aria-label="Delete photo" title="Delete photo" onClick={() => onDelete(photo.id)}>
        <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
