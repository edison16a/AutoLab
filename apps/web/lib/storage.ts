"use client";
import type { Analysis } from "./detection";
import type { PhotoSource } from "./types";

/* ---------- localStorage (small settings) ---------- */

export const keys = {
  session: "autolab.session",
  gateway: "autolab.gateway",
  devices: (user: string) => `autolab.devices.${user}`,
  selected: (user: string) => `autolab.selected.${user}`,
};

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be unavailable (private mode, quota). The app keeps working in memory. */
  }
}

/* ---------- IndexedDB (demo image library) ---------- */

export type StoredPhoto = {
  id: string;
  owner: string;
  device_id: string | null;
  blob: Blob;
  width: number;
  height: number;
  captured_at: string;
  bytes: number;
  source: PhotoSource;
  analysis?: Analysis;
  analyzed_at?: string;
};

const DB_NAME = "autolab",
  STORE = "photos";
let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening;
  opening = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("owner", "owner");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await open();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const photoStore = {
  async list(owner: string): Promise<StoredPhoto[]> {
    try {
      const rows =
        (await run<StoredPhoto[]>("readonly", (s) =>
          s.index("owner").getAll(owner),
        )) || [];
      return rows.sort((a, b) => b.captured_at.localeCompare(a.captured_at));
    } catch {
      return [];
    }
  },
  async put(photo: StoredPhoto) {
    try {
      await run("readwrite", (s) => s.put(photo));
      return true;
    } catch {
      return false;
    }
  },
  async setAnalysis(id: string, analysis: Analysis, analyzed_at: string) {
    try {
      const db = await open();
      if (!db) return;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite"),
          store = tx.objectStore(STORE),
          get = store.get(id);
        get.onsuccess = () => {
          if (get.result) store.put({ ...get.result, analysis, analyzed_at });
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      /* Analysis stays visible for this session. */
    }
  },
  async remove(ids: string[]) {
    try {
      await run("readwrite", (s) => {
        ids.forEach((id) => s.delete(id));
      });
    } catch {
      /* Already gone or storage unavailable. */
    }
  },
  async clear(owner: string) {
    const rows = await this.list(owner);
    await this.remove(rows.map((r) => r.id));
  },
};
