"use client";

import { useState } from "react";
import type { LetterNote } from "@/types/letterNotes";

interface LetterNotesAdminProps {
  initial: LetterNote[];
}

/** Admin create/edit/delete UI for letter-notes songs, backed by /api/admin/letter-notes. */
export function LetterNotesAdmin({ initial }: LetterNotesAdminProps) {
  const [items, setItems] = useState<LetterNote[]>(initial);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/letter-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create.");
      setItems((prev) => [...prev, body.letterNotes].sort((a, b) => a.title.localeCompare(b.title)));
      setTitle("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (item: LetterNote) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditNotes(item.notes);
  };

  const saveEdit = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/letter-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, notes: editNotes }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update.");
      setItems((prev) => prev.map((item) => (item.id === id ? body.letterNotes : item)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update.");
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/letter-notes/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete.");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="space-y-3 rounded-xl border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">Add a song</h2>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <textarea
          required
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes, e.g. C4 D4 E4 [D4 F4 A4] E4"
          rows={3}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <p className="text-xs text-neutral-500">
          Space-separated notes. Wrap notes in brackets to make them a chord (played together) —
          e.g. <code className="rounded bg-neutral-100 px-1">[D4 F4 A4]</code>. Chord notes need an
          octave (C4, not just C); single notes outside brackets don&apos;t.
        </p>
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {creating ? "Adding…" : "Add song"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200">
        {items.length === 0 && (
          <li className="px-4 py-3 text-sm text-neutral-400">No letter-notes songs yet.</li>
        )}
        {items.map((item) =>
          editingId === item.id ? (
            <li key={item.id} className="space-y-2 px-4 py-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => saveEdit(item.id)}
                  className="text-neutral-900 hover:underline"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-neutral-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </li>
          ) : (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{item.title}</p>
                <p className="truncate text-xs text-neutral-500">{item.notes}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="text-neutral-500 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="text-neutral-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
