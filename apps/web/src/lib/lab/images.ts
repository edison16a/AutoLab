/**
 * Lab mode photos in Supabase: the JPEG in the private bucket and a row in
 * `images` with its newest analysis. Each person's files live under their
 * own user id, which is what the storage policies check.
 */
import { supabase } from "../cloud";
import type { Analysis, Photo, PhotoSource } from "@/model/types";

const BUCKET = "autolab-images";
export const LAB_PAGE_SIZE = 30;
/** Signed links last an hour; the library renews them well before that. */
export const SIGNED_SECONDS = 3600;
const COLUMNS = "id,device_id,captured_at,width,height,source,bytes,storage_path,image_analysis(result_json,created_at)";

interface ImageRow {
  id: string;
  device_id: string | null;
  captured_at: string;
  width: number;
  height: number;
  source: string;
  bytes: number | null;
  storage_path: string;
  image_analysis?: { result_json: Analysis; created_at: string }[];
}

/** Where a photo's file goes: owner, then Autolab (or "local" for webcam shots and uploads). */
export function storagePath(userId: string, photo: Pick<Photo, "id" | "device_id">) {
  return `${userId}/${photo.device_id ?? "local"}/${photo.id}.jpg`;
}

function toPhoto(row: ImageRow, url: string): Photo {
  const latest = [...(row.image_analysis ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).at(-1);
  const source: PhotoSource = row.source === "camera" ? "pi" : (row.source as PhotoSource);
  return {
    id: row.id,
    device_id: row.device_id,
    url,
    width: row.width,
    height: row.height,
    captured_at: row.captured_at,
    source,
    bytes: row.bytes ?? undefined,
    cloud: true,
    analysis: latest?.result_json,
    analyzed_at: latest?.created_at,
  };
}

/** Signs every row's file in one call and drops rows whose file is missing. */
async function withUrls(rows: ImageRow[]) {
  if (!rows.length) return [];
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrls(rows.map((r) => r.storage_path), SIGNED_SECONDS);
  if (error) throw error;
  const urls = new Map(data.map((d) => [d.path, d.signedUrl]));
  return rows.flatMap((row) => {
    const url = urls.get(row.storage_path);
    return url ? [toPhoto(row, url)] : [];
  });
}

/** One page of this account's photos, newest first. */
export async function listImages(offset: number) {
  const { data, error } = await supabase()
    .from("images")
    .select(COLUMNS)
    .order("captured_at", { ascending: false })
    .range(offset, offset + LAB_PAGE_SIZE - 1);
  if (error) throw error;
  const rows = data as unknown as ImageRow[];
  return { photos: await withUrls(rows), hasMore: rows.length === LAB_PAGE_SIZE };
}

export async function fetchImage(id: string) {
  const { data, error } = await supabase().from("images").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? ((await withUrls([data as unknown as ImageRow]))[0] ?? null) : null;
}

/** Uploads the file, then records it. If the record fails the file is removed again. */
export async function uploadImage(userId: string, photo: Photo, jpeg: Blob) {
  const db = supabase();
  const path = storagePath(userId, photo);
  const upload = await db.storage.from(BUCKET).upload(path, jpeg, { contentType: "image/jpeg", upsert: false });
  if (upload.error) throw upload.error;
  const { error } = await db.from("images").insert({
    id: photo.id,
    device_id: photo.device_id,
    storage_path: path,
    captured_at: photo.captured_at,
    width: photo.width,
    height: photo.height,
    source: photo.source,
    bytes: jpeg.size,
    analysis_status: photo.analysis ? "done" : "pending",
  });
  if (error) {
    await db.storage.from(BUCKET).remove([path]);
    throw error;
  }
  if (photo.analysis) await saveAnalysis(photo.id, photo.analysis);
}

export async function deleteImage(userId: string, photo: Photo) {
  const db = supabase();
  const { error } = await db.from("images").delete().eq("id", photo.id);
  if (error) throw error;
  // The row is what the app shows, so a leftover file is only wasted space.
  await db.storage.from(BUCKET).remove([storagePath(userId, photo)]);
}

export async function saveAnalysis(imageId: string, analysis: Analysis) {
  const db = supabase();
  const { error } = await db.from("image_analysis").insert({ image_id: imageId, model_name: analysis.model, result_json: analysis });
  if (error) throw error;
  await db.from("images").update({ analysis_status: "done" }).eq("id", imageId);
}

interface ImageEvents {
  added: (id: string) => void;
  removed: (id: string) => void;
  analyzed: (imageId: string, analysis: Analysis, at: string) => void;
}

/** Live updates from every screen signed in to this account. Returns the unsubscribe. */
export function watchImages(on: ImageEvents) {
  const channel = supabase()
    .channel("lab-images")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "images" }, (e) => on.added(String(e.new.id)))
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "images" }, (e) => on.removed(String(e.old.id)))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "image_analysis" }, (e) =>
      on.analyzed(String(e.new.image_id), e.new.result_json as Analysis, String(e.new.created_at)),
    )
    .subscribe();
  return () => void supabase().removeChannel(channel);
}
