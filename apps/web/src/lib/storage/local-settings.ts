/**
 * Small settings kept in localStorage: the demo session, the demo device
 * list, the selected device, a custom gateway URL and whether this computer
 * is the lab station. Images never go here, they are far too big (see
 * photo-store.ts).
 */

/** Every key is namespaced so it can't collide with other apps on the origin. */
export const STORAGE_KEYS = {
  session: "autolab:session",
  gateway: "autolab:gateway",
  theme: "autolab:theme",
  devices: (userId: string) => `autolab:devices:${userId}`,
  selected: (userId: string) => `autolab:selected:${userId}`,
  station: (userId: string) => `autolab:station:${userId}`,
};

/**
 * Reads a JSON value, falling back when the key is missing, the JSON is
 * broken, or storage is blocked (private windows can throw on access).
 */
export function readSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Writes a JSON value. Passing null removes the key. */
export function writeSetting(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked. The app keeps working in memory.
  }
}
