/**
 * Small display helpers. They all use the browser locale so dates and
 * numbers read naturally wherever the app is opened.
 */
import type { PhotoSource } from "@/model/types";

/** 1536 becomes "1.5 KB". One decimal below 10 keeps small sizes honest. */
export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Short date. The year only shows up when it isn't this year. */
export function formatDate(iso: string) {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Group heading for a day: "Today", "Yesterday", a weekday this week, else a date. */
export function dayLabel(iso: string) {
  const day = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(day)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return day.toLocaleDateString([], { weekday: "long" });
  return formatDate(iso);
}

/** "Just now", "5m ago" and so on. Older than a day falls back to a date. */
export function relativeTime(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "Never";
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(iso);
}

export const SOURCE_LABEL: Record<PhotoSource, string> = {
  pi: "Autolab camera",
  simulator: "Simulator",
  computer: "Computer camera",
  upload: "Upload",
};

/** First block of a UUID, uppercased. Enough to tell devices apart at a glance. */
export function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
