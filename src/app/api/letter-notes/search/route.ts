import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server-side search over admin-curated letter-notes songs. Titles stay
 * searchable by anyone (a free preview surface), but `notes` -- the actual
 * transcription -- is withheld unless the caller owns full_access.
 * Deliberately not queried straight from the browser (unlike before this
 * paywall existed): the public RLS read policy on letter_notes would hand
 * the full notes text to the anon key regardless of any UI-side gate.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ results: [] });
  }

  const { data } = await supabase
    .from("letter_notes")
    .select("id, title, notes")
    .ilike("title", `%${query}%`)
    .order("title")
    .limit(10);

  const user = await getCurrentUser();
  const unlocked = user?.hasFullAccess ?? false;

  const results = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    notes: unlocked ? row.notes : null,
  }));

  return NextResponse.json({ results });
}
