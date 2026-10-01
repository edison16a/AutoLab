/**
 * Lab mode: asks the Pi for a photo through the action log and waits for it.
 * The command is a pending row; a "wake" on the Autolab's channel gets the Pi
 * to look at once, and the Pi also checks every few seconds by itself.
 */
import type { ActionEntry, Photo } from "@/model/types";
import { addAction, expirePending, getAction } from "./actions";
import { fetchImage } from "./images";

/** How long the Pi has to take the command before it expires. */
export const PICKUP_MS = 20_000;
/** A full resolution still and its upload can take a while on a slow network. */
const RESULT_MS = 90_000;
const POLL_MS = 700;
const FINAL = new Set<ActionEntry["status"]>(["done", "failed", "expired"]);
const NOT_TAKEN = "The Autolab didn't pick this up. Check that it's on and online.";

export type CaptureOutcome = { photo: Photo } | { error: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function capturePhoto(deviceId: string, wake: () => void): Promise<CaptureOutcome> {
  const entry = await addAction({ device_id: deviceId, kind: "capture_photo", status: "pending" });
  wake();
  const started = Date.now();
  let expired = false;
  while (Date.now() - started < RESULT_MS) {
    await sleep(POLL_MS);
    const now = await getAction(entry.id).catch(() => null);
    if (now && FINAL.has(now.status)) return finish(now);
    if (!expired && Date.now() - started > PICKUP_MS) {
      expired = true;
      await expirePending(entry.id, NOT_TAKEN).catch(() => false);
    }
  }
  return { error: "The Autolab is still working on it. The photo will appear in Data." };
}

async function finish(entry: ActionEntry): Promise<CaptureOutcome> {
  if (entry.status !== "done" || !entry.image_id) return { error: entry.error || "The photo wasn't taken." };
  const photo = await fetchImage(entry.image_id);
  return photo ? { photo } : { error: "The photo was taken but couldn't be loaded. Refresh to see it." };
}
