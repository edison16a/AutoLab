import type { Analysis, Photo, PhotoSource } from "@/model/types";

/**
 * Builds a library photo from an image the browser made itself (a webcam
 * shot or an upload). Decoding once gives the real pixel size, which the
 * detection overlay needs to line up.
 */
export async function photoFromBlob(
  blob: Blob,
  source: Extract<PhotoSource, "computer" | "upload">,
  url: string,
  analysis?: Analysis,
): Promise<Photo> {
  const bitmap = await createImageBitmap(blob);
  const now = new Date().toISOString();
  const photo: Photo = {
    id: crypto.randomUUID(),
    device_id: null,
    url,
    width: bitmap.width,
    height: bitmap.height,
    captured_at: now,
    bytes: blob.size,
    source,
    analysis,
    analyzed_at: analysis ? now : undefined,
  };
  bitmap.close();
  return photo;
}
