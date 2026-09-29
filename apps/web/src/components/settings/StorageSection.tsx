"use client";
import { useCallback, useMemo, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { errorText } from "@/lib/errors";
import { formatBytes } from "@/lib/format";
import { useAutolab } from "@/providers/autolab-context";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { SettingsRow, SettingsSection } from "./SettingsSection";

function imageCount(count: number) {
  return `${count} ${count === 1 ? "image" : "images"}`;
}

/** "12 images, 3.4 MB", or just "No images" when there's nothing to size. */
function usage(count: number, bytes: number) {
  return count ? `${imageCount(count)}, ${formatBytes(bytes)}` : "No images";
}

/**
 * Where images live. Demo mode keeps them in this browser's IndexedDB, so
 * this is the one place to see how much room they take and wipe them.
 */
export function StorageSection() {
  const { mode, photos, photosReady, clearLocalData, notify } = useAutolab();
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Cloud rows don't report a size, and they aren't in this browser anyway.
  const local = useMemo(() => {
    const kept = photos.filter((p) => !p.cloud);
    return { count: kept.length, bytes: kept.reduce((sum, p) => sum + (p.bytes ?? 0), 0) };
  }, [photos]);

  // The dialog's effect depends on onCancel, so it has to be stable while it's open.
  const cancel = useCallback(() => setConfirming(false), []);

  async function clear() {
    setConfirming(false);
    setClearing(true);
    try {
      await clearLocalData();
      notify("Local images cleared", "success");
    } catch (error) {
      notify(errorText(error), "error");
    } finally {
      setClearing(false);
    }
  }

  if (mode === "cloud")
    return (
      <SettingsSection title="Storage">
        <SettingsRow label="Images are stored in Supabase" />
      </SettingsSection>
    );

  return (
    <SettingsSection title="Storage">
      <SettingsRow
        label="Images in this browser"
        hint={photosReady ? usage(local.count, local.bytes) : "Counting"}
      >
        <button
          type="button"
          className="btn"
          onClick={() => setConfirming(true)}
          disabled={!photosReady || local.count === 0 || clearing}
        >
          {clearing ? (
            <LoaderCircle size={16} strokeWidth={1.8} className="spin" aria-hidden="true" />
          ) : (
            <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
          )}
          Clear local images
        </button>
      </SettingsRow>
      <ConfirmDialog
        open={confirming}
        title="Clear local images?"
        message={`This deletes ${imageCount(local.count)} from this browser. It can't be undone.`}
        confirmLabel="Clear images"
        onConfirm={() => void clear()}
        onCancel={cancel}
      />
    </SettingsSection>
  );
}
