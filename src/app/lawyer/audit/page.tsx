import { redirect } from "next/navigation";
import { Briefcase, StampIcon } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { AuditLogView } from "@/components/audit-log-view";
import { db } from "@/lib/store";
import { formatDateTime } from "@/lib/engine";

export const metadata: Metadata = { title: "Audit log" };

export default async function LawyerAuditPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["senior_lawyer", "admin", "observer"].includes(user.role)) redirect("/lawyer");

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
    <ConsoleShell
      title="Audit log"
      subtitle="Every state change, override and export — immutable"
      currentPath="/lawyer/audit"
      allowedRoles={["lawyer", "senior_lawyer", "admin", "observer"]}
      nav={[
        { href: "/lawyer", label: "Review queue", icon: <Briefcase className="h-4 w-4" aria-hidden /> },
        { href: "/lawyer/audit", label: "Audit log", icon: <StampIcon className="h-4 w-4" aria-hidden /> },
      ]}
    >
      <p className="mb-4 max-w-2xl text-sm text-ink/60">
        Senior Lawyer and Admin visibility. Records actor, role, action, entity and before/after
        snapshots for answer edits after submission, flag escalations, overrides, approvals, exports and
        role changes.
      </p>
      <AuditLogView rows={rows} />
    </ConsoleShell>
  );
}
