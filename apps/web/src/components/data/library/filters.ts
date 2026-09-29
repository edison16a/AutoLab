/**
 * Library filtering, kept free of React so the image screen can walk through
 * photos in the same order the library shows them.
 */
import { dayLabel } from "@/lib/format";
import type { Device, Photo, PhotoSource } from "@/model/types";

export type SourceFilter = "all" | "autolab" | "computer" | "upload";
export type StatusFilter = "all" | "analyzed" | "pending";
export type SortOrder = "newest" | "oldest";

export interface LibraryFilters {
  /** Matched against detected labels, so only analyzed images can match. */
  query: string;
  source: SourceFilter;
  status: StatusFilter;
  /** A device ID, or "all". */
  device: string;
  sort: SortOrder;
}

export const DEFAULT_FILTERS: LibraryFilters = {
  query: "",
  source: "all",
  status: "all",
  device: "all",
  sort: "newest",
};

/** The simulator counts as an Autolab. It stands in for the Pi camera. */
const SOURCES: Record<Exclude<SourceFilter, "all">, PhotoSource[]> = {
  autolab: ["pi", "simulator"],
  computer: ["computer"],
  upload: ["upload"],
};

const STORAGE_KEY = "autolab:data-filters";

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Filters live in sessionStorage so opening an image and coming back keeps
 * them, and so the image screen can step through the same list. Storage can
 * be blocked or hold something stale, so every field is checked and anything
 * odd falls back to the default.
 */
export function loadFilters(): LibraryFilters {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Record<keyof LibraryFilters, unknown>>;
    return {
      query: typeof saved.query === "string" ? saved.query : "",
      source: pick(saved.source, ["all", "autolab", "computer", "upload"], "all"),
      status: pick(saved.status, ["all", "analyzed", "pending"], "all"),
      device: typeof saved.device === "string" ? saved.device : "all",
      sort: pick(saved.sort, ["newest", "oldest"], "newest"),
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function saveFilters(filters: LibraryFilters) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Private windows can refuse storage. The filters still work for this visit.
  }
}

/**
 * A saved device filter only applies while there's a choice to make. With
 * one device the select is hidden, so a leftover ID must not hide images.
 */
export function effectiveFilters(filters: LibraryFilters, devices: Device[]): LibraryFilters {
  const deviceKnown = devices.length > 1 && devices.some((d) => d.id === filters.device);
  return deviceKnown ? filters : { ...filters, device: "all" };
}

/** True when something other than the sort order narrows the list. */
export function isFiltered(filters: LibraryFilters) {
  return (
    filters.query.trim() !== "" || filters.source !== "all" || filters.status !== "all" || filters.device !== "all"
  );
}

function matches(photo: Photo, filters: LibraryFilters, query: string) {
  if (filters.source !== "all" && !SOURCES[filters.source].includes(photo.source)) return false;
  if (filters.status === "analyzed" && !photo.analysis) return false;
  if (filters.status === "pending" && photo.analysis) return false;
  if (filters.device !== "all" && photo.device_id !== filters.device) return false;
  if (!query) return true;
  return photo.analysis?.detections.some((d) => d.label.toLowerCase().includes(query)) ?? false;
}

/** Photos arrive newest first, so "oldest" is a reversed copy. */
export function applyFilters(photos: Photo[], filters: LibraryFilters): Photo[] {
  const query = filters.query.trim().toLowerCase();
  const kept = photos.filter((p) => matches(p, filters, query));
  return filters.sort === "oldest" ? kept.reverse() : kept;
}

export interface DayGroup {
  key: string;
  label: string;
  photos: Photo[];
}

/** Local calendar day, so a 1 AM capture lands on the day the person saw it. */
function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Splits an already sorted list into runs of the same day. */
export function groupByDay(photos: Photo[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const photo of photos) {
    const key = dayKey(photo.captured_at);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.photos.push(photo);
    else groups.push({ key, label: dayLabel(photo.captured_at), photos: [photo] });
  }
  return groups;
}
