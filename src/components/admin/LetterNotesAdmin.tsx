"use client";

import { useEffect, useRef, useState } from "react";
import type { LetterNote } from "@/types/letterNotes";
import { notesToRows, rowsToNotes, type NoteRow } from "@/lib/letterNotes/grid";

interface LetterNotesAdminProps {
  initial: LetterNote[];
}

type Row = NoteRow & { id: string };
const emptyRow = (): Row => ({ id: crypto.randomUUID(), left: "", right: "" });
const toRows = (notes: string): Row[] =>
  notesToRows(notes).map((row) => ({ id: crypto.randomUUID(), ...row }));

/** Admin create/edit/delete UI for letter-notes songs, backed by /api/admin/letter-notes. */
export function LetterNotesAdmin({ initial }: LetterNotesAdminProps) {
  const [items, setItems] = useState<LetterNote[]>(initial);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editRows, setEditRows] = useState<Row[]>([]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const notes = rowsToNotes(rows);
    if (notes.trim().length === 0) {
      setError("Add at least one note.");
      return;
    }
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
      setRows([emptyRow()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (item: LetterNote) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditRows(toRows(item.notes));
  };

  const saveEdit = async (id: string) => {
    setError(null);
    const notes = rowsToNotes(editRows);
    if (notes.trim().length === 0) {
      setError("Add at least one note.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/letter-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, notes }),
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
        <NotesGrid rows={rows} onChange={setRows} />
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
              <NotesGrid rows={editRows} onChange={setEditRows} />
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

/**
 * Notebook-style note entry: one row per beat, a left-hand column and a
 * right-hand column -- type a row's notes into whichever column(s) play it,
 * space-separated if that hand plays more than one at once, and leave the
 * other column blank for a one-handed beat. Mirrors LetterNotesViewer's own
 * two-column layout so what's built here is exactly what players will see.
 *
 * Every note needs its own explicit octave (e.g. "C4", not just "C") -- the
 * same name shown on the on-screen piano and used by the keyboard-letter
 * conversion, so what's typed here is unambiguous rather than relying on a
 * separately-chosen default octave.
 */
function NotesGrid({
  rows,
  onChange,
}: {
  rows: Row[];
  onChange: (rows: Row[]) => void;
}) {
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const focusRowId = useRef<string | null>(null);

  useEffect(() => {
    if (focusRowId.current == null) return;
    inputRefs.current.get(`${focusRowId.current}-left`)?.focus();
    focusRowId.current = null;
  }, [rows]);

  const setRow = (id: string, patch: Partial<NoteRow>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRowAfter = (index: number) => {
    const row = emptyRow();
    const next = [...rows];
    next.splice(index + 1, 0, row);
    focusRowId.current = row.id;
    onChange(next);
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex justify-center gap-8 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        <span>Left hand</span>
        <span>Right hand</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-right text-[10px] text-neutral-400">{i + 1}</span>
            <input
              ref={(el) => {
                if (el) inputRefs.current.set(`${row.id}-left`, el);
                else inputRefs.current.delete(`${row.id}-left`);
              }}
              value={row.left}
              onChange={(e) => setRow(row.id, { left: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRowAfter(i);
                }
              }}
              placeholder="—"
              className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-right text-sm font-bold focus:outline-none focus:border-neutral-500"
            />
            <div className="h-5 w-px shrink-0 bg-neutral-200" />
            <input
              ref={(el) => {
                if (el) inputRefs.current.set(`${row.id}-right`, el);
                else inputRefs.current.delete(`${row.id}-right`);
              }}
              value={row.right}
              onChange={(e) => setRow(row.id, { right: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRowAfter(i);
                }
              }}
              placeholder="—"
              className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-left text-sm font-bold focus:outline-none focus:border-neutral-500"
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              aria-label="Remove row"
              className="shrink-0 px-1 text-neutral-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => addRowAfter(rows.length - 1)}
        className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium hover:bg-neutral-100"
      >
        + Add row
      </button>
      <p className="text-xs text-neutral-500">
        One row per beat. Type each note with its octave (e.g.{" "}
        <code className="rounded bg-neutral-100 px-1">C4</code>) — space-separated if that hand
        plays more than one note at once. Press Enter in a cell to add the next row.
      </p>
    </div>
  );
}
