"use client";
import { formatBytes, shortId, SOURCE_LABEL } from "@/lib/format";
import { useAutolab } from "@/providers/autolab-context";
import type { Photo } from "@/model/types";
import { CopyButton } from "@/components/ui/CopyButton";

/**
 * Where the image came from and what it is. Rows without a value are left
 * out: webcam shots have no device, and cloud rows don't report a size.
 */
export function ImageFacts({ photo }: { photo: Photo }) {
  const { devices } = useAutolab();
  const device = photo.device_id ? (devices.find((d) => d.id === photo.device_id)?.name ?? shortId(photo.device_id)) : null;

  return (
    <section className="image-panel__section" aria-labelledby="details-title">
      <h2 id="details-title" className="image-panel__title">
        Details
      </h2>
      <dl className="image-facts">
        <div className="image-facts__row">
          <dt>Source</dt>
          <dd>{SOURCE_LABEL[photo.source]}</dd>
        </div>
        {device ? (
          <div className="image-facts__row">
            <dt>Device</dt>
            <dd>{device}</dd>
          </div>
        ) : null}
        <div className="image-facts__row">
          <dt>Resolution</dt>
          <dd className="num">
            {photo.width} × {photo.height}
          </dd>
        </div>
        {photo.bytes ? (
          <div className="image-facts__row">
            <dt>File size</dt>
            <dd className="num">{formatBytes(photo.bytes)}</dd>
          </div>
        ) : null}
        <div className="image-facts__row">
          <dt>Image ID</dt>
          <dd className="image-facts__id">
            <span className="mono" title={photo.id}>
              {photo.id}
            </span>
            <CopyButton text={photo.id} label="Copy image ID" />
          </dd>
        </div>
      </dl>
    </section>
  );
}
