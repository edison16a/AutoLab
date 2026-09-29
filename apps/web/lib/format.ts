import type { PhotoSource } from "./types";

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024,
    unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year:
      new Date(iso).getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  });
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "Today", "Yesterday", or a short date. */
export function dayLabel(iso: string) {
  const day = new Date(iso),
    today = new Date();
  const start = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(today) - start(day)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return day.toLocaleDateString([], {
    weekday: diff < 7 ? "long" : undefined,
    month: "short",
    day: "numeric",
    year: day.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

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

export const sourceLabel: Record<PhotoSource, string> = {
  pi: "Autolab camera",
  simulator: "Simulator",
  computer: "Computer camera",
  upload: "Upload",
};

export function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
