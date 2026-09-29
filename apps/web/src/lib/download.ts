import type { Photo } from "@/model/types";

/** A readable, sortable file name like autolab-2026-09-29-14-05-33.jpg. */
function fileName(photo: Photo) {
  return `autolab-${photo.captured_at.slice(0, 19).replace(/[:T]/g, "-")}.jpg`;
}

/**
 * Saves a photo to disk. Fetching first works for both blob URLs and signed
 * cloud URLs, where a plain download link would be ignored cross origin.
 */
export async function downloadPhoto(photo: Photo) {
  const response = await fetch(photo.url);
  if (!response.ok) throw new Error("Download failed. Refresh and try again.");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName(photo);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
