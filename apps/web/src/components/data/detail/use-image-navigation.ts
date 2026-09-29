"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Device, Photo } from "@/model/types";
import { applyFilters, effectiveFilters, loadFilters } from "../library/filters";

/**
 * The list to step through: whatever the library was showing (same filters,
 * same sort). If the image isn't in that list, say it was opened from Home,
 * the whole library is used instead so prev and next still work.
 */
export function useLibraryOrder(photos: Photo[], devices: Device[], id: string) {
  const [filters] = useState(loadFilters);
  return useMemo(() => {
    const shown = applyFilters(photos, effectiveFilters(filters, devices));
    return shown.some((p) => p.id === id) ? shown : photos;
  }, [photos, devices, filters, id]);
}

/**
 * Keys typed into a field, pressed with a modifier, or pressed while a menu
 * or dialog is open belong to someone else. Menus close on Escape too, and
 * that press shouldn't also leave the image.
 */
function ignoreKey(e: KeyboardEvent) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
  if (document.querySelector("[role='menu'], [role='dialog']")) return true;
  const target = e.target as HTMLElement | null;
  return !!target?.closest("input, textarea, select, [contenteditable='true']");
}

/**
 * Previous and next around the open image, plus the arrow and Escape keys.
 * Stepping replaces the history entry, so Back returns to the library
 * instead of replaying every image looked at.
 */
export function useImageNavigation(order: Photo[], id: string, keysEnabled: boolean) {
  const router = useRouter();
  const index = order.findIndex((p) => p.id === id);
  const prev = index > 0 ? order[index - 1] : null;
  const next = index >= 0 && index < order.length - 1 ? order[index + 1] : null;

  const open = useCallback((photo: Photo | null) => photo && router.replace(`/data/${photo.id}`), [router]);

  useEffect(() => {
    if (!keysEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (ignoreKey(e)) return;
      if (e.key === "ArrowLeft" && prev) open(prev);
      else if (e.key === "ArrowRight" && next) open(next);
      else if (e.key === "Escape") router.push("/data");
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [keysEnabled, prev, next, open, router]);

  return { index, total: order.length, prev, next, open };
}
