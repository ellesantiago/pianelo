"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LetterNotesViewer } from "./LetterNotesViewer";
import type { LetterNote } from "@/types/letterNotes";

/**
 * Free-for-everyone search over admin-curated letter-notes songs (public RLS
 * read policy on letter_notes -- see supabase/migrations/0003_letter_notes.sql),
 * queried directly from the browser since there's nothing user-specific to
 * gate here.
 */
export function LetterNotesSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LetterNote[]>([]);
  const [selected, setSelected] = useState<LetterNote | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured) return null;

  const search = async (value: string) => {
    setQuery(value);
    setSelected(null);
    if (value.trim().length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("letter_notes")
      .select("id, title, notes, created_at, updated_at")
      .ilike("title", `%${value.trim()}%`)
      .order("title")
      .limit(10);
    setResults(data ?? []);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Search letter notes…"
        className="w-full rounded-md border border-neutral-300 px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
      />

      {loading && <p className="text-center text-xs text-neutral-400">Searching…</p>}

      {!loading && query.trim().length > 0 && results.length === 0 && (
        <p className="text-center text-xs text-neutral-400">No songs found.</p>
      )}

      {!selected && results.length > 0 && (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-md border border-neutral-200">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => setSelected(result)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50"
              >
                {result.title}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && <LetterNotesViewer key={selected.id} title={selected.title} notes={selected.notes} />}
    </div>
  );
}
