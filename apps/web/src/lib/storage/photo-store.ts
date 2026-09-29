/**
 * The demo image library, kept in IndexedDB so captures survive a refresh.
 * Each row belongs to one signed in user (demo users are keyed by email), so
 * two people sharing a browser don't see each other's images.
 *
 * Every call swallows storage errors and returns an empty or false result.
 * A blocked database should never break capturing, only persistence.
 */
import type { Analysis, PhotoSource } from "@/model/types";

/** A library row as stored: the JPEG blob plus its metadata. */
export interface StoredPhoto {
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
}

const DB_NAME = "autolab";
const STORE = "photos";
let opening: Promise<IDBDatabase | null> | null = null;

/** Opens the database once and reuses it. Resolves null when IndexedDB is unavailable. */
function openDatabase(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
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

/** Runs one request in its own transaction and waits for the transaction to commit. */
async function transact<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDatabase();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const photoStore = {
  /** All of one user's photos, newest first. */
  async list(owner: string): Promise<StoredPhoto[]> {
    try {
      const rows = await transact<StoredPhoto[]>("readonly", (s) => s.index("owner").getAll(owner));
      return (rows ?? []).sort((a, b) => b.captured_at.localeCompare(a.captured_at));
    } catch {
      return [];
    }
  },

  /** Saves or replaces a photo. Returns false when it could not be persisted. */
  async put(photo: StoredPhoto): Promise<boolean> {
    try {
      await transact("readwrite", (s) => s.put(photo));
      return true;
    } catch {
      return false;
    }
  },

  /** Attaches a detection result to a stored photo, leaving the blob untouched. */
  async setAnalysis(id: string, analysis: Analysis, analyzedAt: string) {
    try {
      const row = await transact<StoredPhoto>("readonly", (s) => s.get(id));
      if (row) await transact("readwrite", (s) => s.put({ ...row, analysis, analyzed_at: analyzedAt }));
    } catch {
      // The analysis still shows for this session.
    }
  },

  async remove(ids: string[]) {
    if (!ids.length) return;
    try {
      await transact("readwrite", (s) => ids.forEach((id) => s.delete(id)));
    } catch {
      // Already gone, or storage is unavailable.
    }
  },

  /** Deletes every photo that belongs to one user. */
  async clear(owner: string) {
    const rows = await this.list(owner);
    await this.remove(rows.map((row) => row.id));
  },
};
