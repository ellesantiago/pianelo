import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const service = createSupabaseServiceRoleClient();
  if (!service) {
    return <p className="text-neutral-500">Supabase is not configured yet.</p>;
  }

  const [
    { count: totalUsers },
    { count: paidUsers },
    { count: activeSessions },
    { data: purchases },
  ] = await Promise.all([
    service.from("profiles").select("*", { count: "exact", head: true }),
    service.from("purchases").select("user_id", { count: "exact", head: true }).eq("status", "paid"),
    service.from("active_sessions").select("*", { count: "exact", head: true }),
    service.from("purchases").select("amount, status"),
  ]);

  const revenue = (purchases ?? [])
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const stats: { label: string; value: number | string }[] = [
    { label: "Total users", value: totalUsers ?? 0 },
    { label: "Paid users", value: paidUsers ?? 0 },
    {
      label: "Conversion rate",
      value: totalUsers ? `${(((paidUsers ?? 0) / totalUsers) * 100).toFixed(1)}%` : "—",
    },
    { label: "Revenue (₱)", value: revenue.toFixed(2) },
    { label: "Active sessions", value: activeSessions ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500">{stat.label}</p>
            <p className="mt-1 text-xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
