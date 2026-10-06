import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { ADMIN_NAV } from "@/app/admin/page";
import { db } from "@/lib/store";
import { money } from "@/lib/engine";
import { Card } from "@/components/ui";
import { PriceEditor } from "@/components/admin-widgets";

export const metadata: Metadata = { title: "Pricing" };

export default async function AdminPricingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer"].includes(user.role)) redirect("/lawyer");
  const isAdmin = user.role === "admin";

  return (
    <ConsoleShell title="Plan pricing" subtitle="Changes flow straight to the landing page, checkout and documents" currentPath="/admin/pricing" allowedRoles={["admin", "observer"]} nav={ADMIN_NAV}>
      <div className="grid gap-5 lg:grid-cols-3">
        {db().plans.map((p) => (
          <Card key={p.id} className="flex flex-col p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">{p.name}</h2>
                <p className="mt-0.5 text-sm text-ink/60">{p.blurb}</p>
              </div>
              {p.popular && <span className="rounded-full bg-eucalyptus px-2.5 py-1 text-[10px] font-bold uppercase text-paper">Popular</span>}
            </div>
            <p className="mt-4 font-display text-4xl font-semibold text-eucalyptus">{money(p.price)}</p>
            <ul className="mt-4 flex-1 space-y-1.5 text-sm text-ink/70">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-ink/10 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fern">One-off price (AUD)</p>
              {isAdmin ? <PriceEditor planId={p.id} price={p.price} /> : <p className="text-xs text-ink/45">Read-only observer</p>}
            </div>
          </Card>
        ))}
      </div>
    </ConsoleShell>
  );
}
