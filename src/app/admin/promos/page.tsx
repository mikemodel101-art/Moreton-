import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { ADMIN_NAV } from "@/app/admin/page";
import { db } from "@/lib/store";
import { money } from "@/lib/engine";
import { Badge, Card } from "@/components/ui";
import { PromoToggle, PromoUpsert } from "@/components/admin-widgets";

export const metadata: Metadata = { title: "Promo codes" };

export default async function AdminPromosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer"].includes(user.role)) redirect("/lawyer");

  const promos = db().promos;
  const isAdmin = user.role === "admin";

  return (
    <ConsoleShell title="Promo & referral codes" subtitle="Codes validate live in the mock checkout" currentPath="/admin/promos" allowedRoles={["admin", "observer"]} nav={ADMIN_NAV}>
      <div className="mb-5 flex justify-end">
        {isAdmin ? <PromoUpsert /> : <Badge tone="neutral">Read-only observer</Badge>}
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto nice-scroll">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Promotion and referral code register</caption>
            <thead>
              <tr className="border-b border-ink/10 bg-sand/70 text-xs uppercase tracking-wider text-fern">
                <th scope="col" className="px-5 py-3 font-bold">Code</th>
                <th scope="col" className="px-5 py-3 font-bold">Discount</th>
                <th scope="col" className="px-5 py-3 font-bold">Referrer</th>
                <th scope="col" className="px-5 py-3 font-bold">Note</th>
                <th scope="col" className="px-5 py-3 text-right font-bold">Uses</th>
                <th scope="col" className="px-5 py-3 font-bold">Active</th>
                {isAdmin && <th scope="col" className="px-5 py-3 font-bold">Edit</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {promos.map((p) => (
                <tr key={p.code} className={p.active ? "hover:bg-sand/40" : "opacity-55"}>
                  <td className="px-5 py-3 font-mono font-bold text-eucalyptus">{p.code}</td>
                  <td className="px-5 py-3 font-semibold">{p.kind === "percent" ? `${p.value}%` : money(p.value)}</td>
                  <td className="px-5 py-3 text-ink/70">{p.referrer ?? "—"}</td>
                  <td className="max-w-[220px] px-5 py-3 text-xs text-ink/60">{p.note}</td>
                  <td className="px-5 py-3 text-right font-semibold">{p.uses}</td>
                  <td className="px-5 py-3">
                    {isAdmin ? <PromoToggle code={p.code} active={p.active} /> : <Badge tone={p.active ? "green" : "neutral"}>{p.active ? "active" : "expired"}</Badge>}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3">
                      <PromoUpsert edit={{ code: p.code, kind: p.kind, value: p.value, referrer: p.referrer, note: p.note, active: p.active }} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ConsoleShell>
  );
}
