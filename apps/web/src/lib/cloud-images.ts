/**
 * Cloud mode image calls. The gateway checks ownership and returns rows with
 * short lived signed URLs, so the browser never needs storage credentials.
 */
import { api } from "./cloud";
import type { Analysis, Photo } from "@/model/types";

/** The gateway pages images 25 at a time. A full page means there may be more. */
export const CLOUD_PAGE_SIZE = 25;

interface ImageRow {
  id: string;
  device_id: string;
  captured_at: string;
  width: number;
  height: number;
  url: string;
  image_analysis?: { result_json: Analysis; created_at: string }[];
}

/** Maps a database row to a Photo, keeping only the newest saved analysis. */
function toPhoto(row: ImageRow): Photo {
  const latest = [...(row.image_analysis ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).at(-1);
  return {
    id: row.id,
    device_id: row.device_id,
    url: row.url,
    width: row.width,
    height: row.height,
    captured_at: row.captured_at,
    source: "pi",
    cloud: true,
    analysis: latest?.result_json,
    analyzed_at: latest?.created_at,
  };
}

export async function fetchImagePage(gateway: string, deviceId: string, offset: number) {
  const rows: ImageRow[] = await api(gateway, `/devices/${deviceId}/images?offset=${offset}`);
  return { photos: rows.map(toPhoto), hasMore: rows.length === CLOUD_PAGE_SIZE };
}

export async function deleteCloudImage(gateway: string, id: string) {
  await api(gateway, `/images/${id}`, "DELETE");
}
