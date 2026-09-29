"use client";
import { useCallback, useEffect, useRef } from "react";
import type { Photo } from "@/model/types";

interface Plan {
  deleted: string[];
  /** The card to focus once the deleted ones are gone, or null when none is left. */
  next: string | null;
}

/** The nearest card that survives: the first one after the deleted card, else the last one before it. */
function survivor(visibleIds: string[], deleted: string[]) {
  const gone = new Set(deleted);
  const first = visibleIds.findIndex((id) => gone.has(id));
  if (first < 0) return null;
  const after = visibleIds.slice(first + 1).find((id) => !gone.has(id));
  return after ?? visibleIds.slice(0, first).reverse().find((id) => !gone.has(id)) ?? null;
}

/**
 * Deleting a card removes the button that had focus, and the browser drops
 * focus to the page body, so keyboard users lose their place. This moves
 * focus to the card that took the deleted one's place. When no card is left
 * it goes to the empty state's button instead.
 *
 * It waits until the photos are really gone from the list: a failed delete
 * keeps the card, and focus should stay where the dialog put it back.
 */
export function useDeleteFocus(photos: Photo[], visibleIds: string[]) {
  const plan = useRef<Plan | null>(null);

  const expect = useCallback(
    (deleted: string[]) => {
      plan.current = deleted.length ? { deleted, next: survivor(visibleIds, deleted) } : null;
    },
    [visibleIds],
  );

  useEffect(() => {
    const current = plan.current;
    if (!current || photos.some((p) => current.deleted.includes(p.id))) return;
    plan.current = null;
    const card = current.next
      ? document.querySelector<HTMLElement>(
          `[data-photo-id="${current.next}"] a.photo-card__link, [data-photo-id="${current.next}"] .photo-card__checkbox`,
        )
      : null;
    (card ?? document.querySelector<HTMLElement>(".data .empty .btn"))?.focus();
  }, [photos]);

  return expect;
}
