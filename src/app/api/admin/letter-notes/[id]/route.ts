import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { validateLetterNotesInput } from "@/lib/letterNotes/validate";

/** Updates a letter-notes song's title/notes. Admin-only. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
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
    .update({ title: validation.title, notes: validation.notes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, title, notes, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ letterNotes: data });
}

/** Deletes a letter-notes song. Admin-only. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const service = createSupabaseServiceRoleClient();
  if (!service) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { error } = await service.from("letter_notes").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
