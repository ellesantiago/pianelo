"use client";

import { useState } from "react";
import { saveRecording } from "@/lib/recordings/localStore";
import type { RecordedNoteEvent } from "@/types/music";

interface RecordButtonProps {
  isRecording: boolean;
  /** Captured events waiting to be named/saved/discarded, or null when idle. */
  pendingEvents: RecordedNoteEvent[] | null;
  onStart: () => void;
  onStop: () => void;
  onDismissPending: () => void;
}

/** Record / Stop / Save-or-discard, for the local-only recording feature. */
export function RecordButton({
  isRecording,
  pendingEvents,
  onStart,
  onStop,
  onDismissPending,
}: RecordButtonProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  if (pendingEvents && pendingEvents.length > 0) {
    const handleSave = async () => {
      setSaving(true);
      const duration = pendingEvents[pendingEvents.length - 1].timestamp;
      await saveRecording({
        id: crypto.randomUUID(),
        name: name.trim() || "My Recording",
        duration,
        events: pendingEvents,
        createdAt: new Date().toISOString(),
      });
      setSaving(false);
      setName("");
      onDismissPending();
      setSavedMessage("Saved to Recordings.");
      setTimeout(() => setSavedMessage(null), 3000);
    };

    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-white p-2 text-sm">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this recording"
          className="min-w-0 flex-1 rounded border border-neutral-200 px-2 py-1 text-sm focus:border-neutral-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-neutral-900 px-3 py-1 font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDismissPending}
          className="rounded-md px-3 py-1 font-medium text-neutral-500 hover:text-neutral-900"
        >
          Discard
        </button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <button
        type="button"
        onClick={onStop}
        className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
      >
        <span className="h-2 w-2 rounded-sm bg-red-600" /> Stop recording
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onStart}
        className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
      >
        <span className="h-2 w-2 rounded-full bg-red-600" /> Record
      </button>
      {savedMessage && <span className="text-xs text-neutral-500">{savedMessage}</span>}
    </div>
  );
}
