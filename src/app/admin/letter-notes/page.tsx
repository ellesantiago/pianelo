import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { LetterNotesAdmin } from "@/components/admin/LetterNotesAdmin";

export default async function AdminLetterNotesPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const service = createSupabaseServiceRoleClient();
  if (!service) {
    return <p className="text-neutral-500">Supabase is not configured yet.</p>;
  }

  const { data } = await service
    .from("letter_notes")
    .select("id, title, notes, created_at, updated_at")
    .order("title");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Letter Notes</h1>
      <LetterNotesAdmin initial={data ?? []} />
    </div>
  );
}
