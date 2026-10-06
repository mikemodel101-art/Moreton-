import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PhoneCall } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { ADMIN_NAV } from "@/app/admin/page";
import { db } from "@/lib/store";
import { formatDateTime } from "@/lib/engine";
import { Badge, Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Consultation leads" };

export default async function LeadsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer", "senior_lawyer"].includes(user.role)) redirect("/lawyer");
  const leads = db().leads;

  return (
    <ConsoleShell
      title="Consultation leads"
      subtitle="Captured when a blocker routes a client off the online path"
      currentPath="/admin/leads"
      allowedRoles={["admin", "observer", "senior_lawyer"]}
      nav={ADMIN_NAV}
    >
      {leads.length === 0 ? (
        <EmptyState
          icon={<PhoneCall className="h-6 w-6" aria-hidden />}
          title="No leads yet"
          body="When a blocker flag fires, the client is offered a consultation and their details land here."
        />
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">{l.name}</p>
                    <p className="text-sm text-ink/60">
                      {l.email} · {l.phone}
                    </p>
                    <p className="mt-2 max-w-xl text-sm text-ink/75">{l.reason}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone={l.status === "new" ? "gold" : "green"}>{l.status}</Badge>
                    <p className="mt-1.5 text-xs text-ink/50">{formatDateTime(l.createdAt)}</p>
                    <p className="text-xs font-semibold text-fern">Prefers: {l.preferredTime}</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </ConsoleShell>
  );
}
