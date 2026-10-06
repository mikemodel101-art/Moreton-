import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { ADMIN_NAV } from "@/app/admin/page";
import { AuditLogView } from "@/components/audit-log-view";
import { db } from "@/lib/store";
import { formatDateTime } from "@/lib/engine";

export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAuditPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer"].includes(user.role)) redirect("/lawyer");

  const rows = db().audit.slice(0, 100).map((e) => {
    const actor = db().users.find((u) => u.id === e.actorId);
    const hasBA = e.before !== undefined || e.after !== undefined;
    return {
      id: e.id,
      at: e.at,
      atLabel: formatDateTime(e.at),
      actorName: actor?.name ?? e.actorId,
      actorColor: actor?.color ?? "#888",
      actorRole: e.actorRole,
      action: e.action,
      summary: e.summary,
      ba: hasBA ? `${JSON.stringify(e.before ?? null)} → ${JSON.stringify(e.after ?? null)}` : null,
    };
  });

  return (
    <ConsoleShell title="Audit log" subtitle="Full-fidelity before/after snapshots — sort, filter, search, paginate" currentPath="/admin/audit" allowedRoles={["admin", "observer"]} nav={ADMIN_NAV}>
      <AuditLogView rows={rows} />
    </ConsoleShell>
  );
}
