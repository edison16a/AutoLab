"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Device, Photo } from "@/model/types";
import {
  DEFAULT_FILTERS,
  applyFilters,
  effectiveFilters,
  groupByDay,
  isFiltered,
  loadFilters,
  saveFilters,
  type LibraryFilters,
} from "./filters";

/**
 * Filter state for the library, plus the photos it leaves visible, already
 * sorted and grouped by day. The state is restored from the session so a
 * trip to an image and back doesn't reset it.
 */
export function useLibraryFilters(photos: Photo[], devices: Device[]) {
  const [filters, setFilters] = useState<LibraryFilters>(loadFilters);

  useEffect(() => saveFilters(filters), [filters]);

  const update = useCallback(<K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  // Sort order is a view preference, not a filter, so it survives a clear.
  const clear = useCallback(() => setFilters((current) => ({ ...DEFAULT_FILTERS, sort: current.sort })), []);

  const active = useMemo(() => effectiveFilters(filters, devices), [filters, devices]);
  const visible = useMemo(() => applyFilters(photos, active), [photos, active]);
  const groups = useMemo(() => groupByDay(visible), [visible]);

  return { filters: active, update, clear, filtered: isFiltered(active), visible, groups };
}
