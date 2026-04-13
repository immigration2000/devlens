/**
 * IndexedDB wrapper for persisting unsent events across page reloads.
 * Uses raw IndexedDB API — no external dependencies.
 */

const DB_NAME = "devlens-events";
const STORE_NAME = "pending-events";
const DB_VERSION = 1;

interface StoredEvent {
  id: string;
  sessionId: string;
  event: any;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("sessionId", "sessionId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Save events to IndexedDB for offline persistence.
 */
export async function saveEvents(
  sessionId: string,
  events: any[]
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (const event of events) {
      const stored: StoredEvent = {
        id: `${sessionId}-${event.seq || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId,
        event,
        createdAt: Date.now(),
      };
      store.put(stored);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to save events to IndexedDB:", err);
  }
}

/**
 * Load all pending (unsent) events from IndexedDB for a session.
 */
export async function loadPendingEvents(
  sessionId: string
): Promise<any[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("sessionId");
    const request = index.getAll(sessionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = (request.result as StoredEvent[])
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((r) => r.event);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to load events from IndexedDB:", err);
    return [];
  }
}

/**
 * Clear successfully sent events from IndexedDB.
 */
export async function clearSessionEvents(
  sessionId: string
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("sessionId");
    const request = index.getAllKeys(sessionId);

    request.onsuccess = () => {
      for (const key of request.result) {
        store.delete(key);
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to clear events from IndexedDB:", err);
  }
}

/**
 * Get count of pending events (for UI indicators).
 */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return 0;
  }
}
