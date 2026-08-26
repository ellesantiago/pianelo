"use client";

import { useEffect, useRef, useState } from "react";
import { AudioEngine } from "@/lib/audio/AudioEngine";
import {
  deleteRecording,
  downloadRecordingAsJson,
  listRecordings,
  renameRecording,
  type StoredRecording,
} from "@/lib/recordings/localStore";

/** My Recordings: list, play back (through the same AudioEngine the piano
 * uses), rename, delete, export as JSON. Reads entirely from the browser's
 * IndexedDB -- nothing here ever touches the server. */
export function RecordingsList() {
  const [recordings, setRecordings] = useState<StoredRecording[] | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const engineRef = useRef<AudioEngine | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  const refresh = () => {
    listRecordings().then(setRecordings);
  };

  useEffect(() => {
    refresh();
  }, []);

  const stopPlayback = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
    engineRef.current?.stopAll();
    setPlayingId(null);
  };

  const play = (recording: StoredRecording) => {
    stopPlayback();
    if (recording.events.length === 0) return;

    if (!engineRef.current) engineRef.current = new AudioEngine();
    setPlayingId(recording.id);

    for (const event of recording.events) {
      const t = window.setTimeout(() => {
        if (event.action === "down") engineRef.current?.playNote(event.note);
        else engineRef.current?.releaseNote(event.note);
      }, event.timestamp);
      timeoutsRef.current.push(t);
    }
    const lastTimestamp = recording.events[recording.events.length - 1].timestamp;
    const done = window.setTimeout(() => setPlayingId(null), lastTimestamp + 200);
    timeoutsRef.current.push(done);
  };

  const startRename = (recording: StoredRecording) => {
    setRenamingId(recording.id);
    setNameDraft(recording.name);
  };

  const saveRename = async (id: string) => {
    await renameRecording(id, nameDraft.trim() || "My Recording");
    setRenamingId(null);
    refresh();
  };

  const remove = async (id: string) => {
    await deleteRecording(id);
    if (playingId === id) stopPlayback();
    refresh();
  };

  if (recordings === null) {
    return <p className="text-center text-sm text-neutral-400">Loading…</p>;
  }
  if (recordings.length === 0) {
    return (
      <p className="text-center text-sm text-neutral-400">
        No recordings yet. Press ● Record above the piano to save one.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200">
      {recordings.map((recording) => (
        <li key={recording.id} className="flex items-center justify-between gap-3 px-4 py-3">
          {renamingId === recording.id ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => saveRename(recording.id)}
              onKeyDown={(e) => e.key === "Enter" && saveRename(recording.id)}
              className="rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          ) : (
            <span className="font-medium">{recording.name}</span>
          )}

          <div className="flex shrink-0 gap-3 text-xs">
            {playingId === recording.id ? (
              <button type="button" onClick={stopPlayback} className="text-red-600 hover:underline">
                ■ Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => play(recording)}
                className="text-neutral-900 hover:underline"
              >
                ▶ Play
              </button>
            )}
            <button
              type="button"
              onClick={() => startRename(recording)}
              className="text-neutral-500 hover:underline"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => downloadRecordingAsJson(recording)}
              className="text-neutral-500 hover:underline"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => remove(recording.id)}
              className="text-neutral-500 hover:underline"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
