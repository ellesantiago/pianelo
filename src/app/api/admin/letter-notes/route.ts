import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { validateLetterNotesInput } from "@/lib/letterNotes/validate";

/** Creates a new letter-notes song. Admin-only (service role bypasses RLS). */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const validation = validateLetterNotesInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const service = createSupabaseServiceRoleClient();
  if (!service) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data, error } = await service
    .from("letter_notes")
    .insert({ title: validation.title, notes: validation.notes })
    .select("id, title, notes, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ letterNotes: data });
}
