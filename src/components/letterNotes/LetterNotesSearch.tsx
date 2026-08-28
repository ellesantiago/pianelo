"use client";

import { useState } from "react";
import { LetterNotesViewer } from "./LetterNotesViewer";

interface SearchResult {
  id: string;
  title: string;
  /** null when the caller hasn't paid for full_access -- see the search route. */
  notes: string | null;
}

interface LetterNotesSearchProps {
  isLoggedIn: boolean;
}

/**
 * Search over admin-curated letter-notes songs -- a free preview surface
 * above the piano. Titles are searchable by anyone; viewing a song's actual
 * notes requires the full_access purchase (enforced server-side, see
 * app/api/letter-notes/search/route.ts, not just hidden in this UI).
 */
export function LetterNotesSearch({ isLoggedIn }: LetterNotesSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (value: string) => {
    setQuery(value);
    setSelected(null);
    if (value.trim().length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/letter-notes/search?q=${encodeURIComponent(value.trim())}`);
      const json = res.ok ? await res.json() : { results: [] };
      setResults(json.results ?? []);
    } finally {
      setLoading(false);
    }
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

      {selected && (
        <LetterNotesViewer
          key={selected.id}
          title={selected.title}
          notes={selected.notes}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
}
