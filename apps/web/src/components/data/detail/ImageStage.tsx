import type { CSSProperties } from "react";
import { formatDateTime } from "@/lib/format";
import type { Photo } from "@/model/types";
import { ImageView } from "../../ui/ImageView";

interface ImageStageProps {
  photo: Photo;
  overlays: boolean;
}

/**
 * The large viewer. The picture is fitted without cropping so detection
 * boxes stay on their pixels. On phones the stage takes the picture's own
 * shape, passed in as --view-ratio.
 */
export function ImageStage({ photo, overlays }: ImageStageProps) {
  return (
    <section
      className="image-stage"
      aria-label="Image"
      style={{ "--view-ratio": `${photo.width} / ${photo.height}` } as CSSProperties}
    >
      <div className="image-stage__view">
        <ImageView
          url={photo.url}
          width={photo.width}
          height={photo.height}
          analysis={photo.analysis}
          overlays={overlays}
          alt={`Capture from ${formatDateTime(photo.captured_at)}`}
        />
      </div>
    </section>
  );
}
