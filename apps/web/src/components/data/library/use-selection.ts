"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Multi select for the library grid. Picks are kept as a set of IDs, and the
 * selection only ever reports IDs that are still visible, so a filter change
 * or a delete can't leave hidden images in a bulk action.
 */
export function useSelection(visibleIds: string[], keysEnabled: boolean) {
  const [active, setActive] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());

  const selected = useMemo(() => visibleIds.filter((id) => picked.has(id)), [visibleIds, picked]);

  const toggle = useCallback((id: string) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setPicked(new Set(visibleIds)), [visibleIds]);

  const setMode = useCallback((on: boolean) => {
    setActive(on);
    setPicked(new Set());
  }, []);

  // Escape leaves select mode, unless a dialog on top is using the key.
  useEffect(() => {
    if (!active || !keysEnabled) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMode(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, keysEnabled, setMode]);

  return { active, setMode, selected, toggle, selectAll };
}
