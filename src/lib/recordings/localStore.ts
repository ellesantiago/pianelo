"use client";

// Local-only recording storage (IndexedDB). Recordings never leave the
// browser -- there is no server table, no per-user sync across devices.
// This is a deliberate product choice, not a limitation of the underlying
// event format (RecordedNoteEvent), which is small enough it could sync
// later if that ever changes.

import type { RecordedNoteEvent } from "@/types/music";

export interface StoredRecording {
  id: string;
  name: string;
  duration: number; // ms
  events: RecordedNoteEvent[];
  createdAt: string; // ISO
}

const DB_NAME = "pianelo";
const STORE_NAME = "recordings";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecording(recording: StoredRecording): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(recording);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listRecordings(): Promise<StoredRecording[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const all = (request.result as StoredRecording[]) ?? [];
      resolve(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function renameRecording(id: string, name: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const record = getRequest.result as StoredRecording | undefined;
      if (record) {
        store.put({ ...record, name });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Triggers a browser download of one recording as a .json file. */
export function downloadRecordingAsJson(recording: StoredRecording): void {
  const blob = new Blob([JSON.stringify(recording, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${recording.name.replace(/[^\w-]+/g, "_") || "recording"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
