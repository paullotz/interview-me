import type { InterviewSession } from "./types";

const DB_NAME = "interview_me_db";
const DB_VERSION = 1;
const STORE_NAME = "sessions";
const LOCAL_STORAGE_KEY = "interview-me:sessions";
const ACTIVE_DRAFT_KEY = "interview-me:active-draft";

// In-memory fallback for SSR or restricted environments
const memoryStore = new Map<string, InterviewSession>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function hasIndexedDB(): boolean {
  try {
    return isBrowser() && Boolean(window.indexedDB);
  } catch {
    return false;
  }
}

function hasLocalStorage(): boolean {
  try {
    if (!isBrowser()) return false;
    const testKey = "__interview_me_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });
}

function getFromLocalStorage(): InterviewSession[] {
  if (!hasLocalStorage()) return Array.from(memoryStore.values());
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InterviewSession[];
  } catch {
    return [];
  }
}

function saveToLocalStorage(sessions: InterviewSession[]): void {
  if (!hasLocalStorage()) {
    memoryStore.clear();
    for (const s of sessions) {
      memoryStore.set(s.id, s);
    }
    return;
  }
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.warn("[interview-me] Failed to save to localStorage:", err);
  }
}

export async function saveSession(session: InterviewSession): Promise<void> {
  memoryStore.set(session.id, session);

  if (hasIndexedDB()) {
    try {
      const db = await openDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(session);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      console.warn("[interview-me] IndexedDB put failed, falling back to localStorage", err);
    }
  }

  // Fallback to localStorage
  const existing = getFromLocalStorage().filter((s) => s.id !== session.id);
  existing.unshift(session);
  saveToLocalStorage(existing);
}

export async function getSession(id: string): Promise<InterviewSession | null> {
  if (memoryStore.has(id)) {
    return memoryStore.get(id) ?? null;
  }

  if (hasIndexedDB()) {
    try {
      const db = await openDB();
      return new Promise<InterviewSession | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
          resolve(req.result ?? null);
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      console.warn("[interview-me] IndexedDB get failed, falling back to localStorage", err);
    }
  }

  const sessions = getFromLocalStorage();
  return sessions.find((s) => s.id === id) ?? null;
}

export async function getAllSessions(): Promise<InterviewSession[]> {
  if (hasIndexedDB()) {
    try {
      const db = await openDB();
      return new Promise<InterviewSession[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const results = (req.result as InterviewSession[]) || [];
          results.sort((a, b) => b.startTime - a.startTime);
          resolve(results);
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      console.warn("[interview-me] IndexedDB getAll failed, falling back to localStorage", err);
    }
  }

  const sessions = getFromLocalStorage();
  sessions.sort((a, b) => b.startTime - a.startTime);
  return sessions;
}

export async function deleteSession(id: string): Promise<void> {
  memoryStore.delete(id);

  if (hasIndexedDB()) {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      console.warn("[interview-me] IndexedDB delete failed, updating localStorage", err);
    }
  }

  const existing = getFromLocalStorage().filter((s) => s.id !== id);
  saveToLocalStorage(existing);
}

export async function clearSessions(): Promise<void> {
  memoryStore.clear();

  if (hasIndexedDB()) {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (err) {
      console.warn("[interview-me] IndexedDB clear failed", err);
    }
  }

  if (hasLocalStorage()) {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

// Active session draft (safe against reload)
export function saveActiveDraft(session: InterviewSession): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(session));
  } catch {}
}

export function loadActiveDraft(): InterviewSession | null {
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as InterviewSession) : null;
  } catch {
    return null;
  }
}

export function clearActiveDraft(): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(ACTIVE_DRAFT_KEY);
  } catch {}
}
