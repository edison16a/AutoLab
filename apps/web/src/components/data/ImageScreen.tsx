"use client";
import "@/styles/data-image.css";
import "@/styles/data-panel.css";
import "@/styles/data-detections.css";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { errorText } from "@/lib/errors";
import { useAutolab } from "@/providers/autolab-context";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState } from "../ui/EmptyState";
import { ImageBar } from "./detail/ImageBar";
import { ImagePanel } from "./detail/ImagePanel";
import { ImageStage } from "./detail/ImageStage";
import { useImageNavigation, useLibraryOrder } from "./detail/use-image-navigation";

/** Grey stand ins for the stage and panel while the library loads. */
function ImageSkeleton() {
  return (
    <div className="workspace image-screen" aria-busy="true" aria-label="Loading image">
      <div className="image-bar">
        <span className="skeleton image-screen__skeleton-back" />
      </div>
      <div className="image-screen__body">
        <div className="skeleton image-stage" />
        <div className="skeleton image-panel" />
      </div>
    </div>
  );
}

/**
 * The image a delete moves on to. Each image is its own route, so the screen
 * remounts and focus would fall to the page body. The next screen reads
 * this and puts focus back on its Delete button, where the person left it.
 */
let focusDeleteOn: string | null = null;

/** One image, large, with its analysis and details beside it. */
export function ImageScreen() {
  const { imageId } = useParams<{ imageId: string }>();
  const router = useRouter();
  const { photos, photosReady, devices, removePhotos, notify } = useAutolab();
  const order = useLibraryOrder(photos, devices, imageId);
  const [confirming, setConfirming] = useState(false);
  // The image being deleted, so the brief moment after it's gone and before
  // the next one opens doesn't flash "Image not found".
  const [leaving, setLeaving] = useState<string | null>(null);
  const [overlays, setOverlays] = useState(true);
  const nav = useImageNavigation(order, imageId, !confirming);
  const photo = photos.find((p) => p.id === imageId);

  useEffect(() => {
    if (!photo || focusDeleteOn !== photo.id) return;
    focusDeleteOn = null;
    document.querySelector<HTMLElement>(".image-panel__delete")?.focus();
  }, [photo]);

  if (!photosReady || (leaving === imageId && !photo)) return <ImageSkeleton />;

  if (!photo)
    return (
      <div className="page">
        <EmptyState
          icon={ImageOff}
          title="Image not found"
          text="It may have been deleted."
          action={
            <Link href="/data" className="btn">
              Back to Data
            </Link>
          }
        />
      </div>
    );

  const confirmDelete = async () => {
    setConfirming(false);
    const target = nav.next ?? nav.prev;
    setLeaving(photo.id);
    try {
      await removePhotos([photo.id]);
      focusDeleteOn = target?.id ?? null;
      router.replace(target ? `/data/${target.id}` : "/data");
    } catch (error) {
      setLeaving(null);
      notify(errorText(error), "error");
    }
  };

  return (
    <div className="workspace image-screen">
      <ImageBar index={nav.index} total={nav.total} prev={nav.prev} next={nav.next} onOpen={nav.open} />
      <div className="image-screen__body">
        <ImageStage photo={photo} overlays={overlays} />
        <ImagePanel photo={photo} overlays={overlays} onOverlays={setOverlays} onDelete={() => setConfirming(true)} />
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete image?"
        message="This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
