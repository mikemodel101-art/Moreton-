import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { ADMIN_NAV } from "@/app/admin/page";
import { db } from "@/lib/store";
import { money } from "@/lib/engine";
import { Badge, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

function days(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer", "senior_lawyer"].includes(user.role)) redirect("/lawyer");

  const matters = db().matters;
  const paid = matters.filter((m) => m.payment);
  const revenue = paid.reduce((s, m) => s + (m.payment?.total ?? 0), 0);
  const discounts = paid.reduce((s, m) => s + (m.payment?.discount ?? 0), 0);
  const addOnRevenue = paid.reduce((s, m) => s + (m.payment?.addOnTotal ?? 0), 0);

  const started = matters.length;
  const submitted = matters.filter((m) => m.submittedAt).length;
  const issued = matters.filter((m) => m.status === "issued").length;
  const conversion = started ? Math.round((paid.length / started) * 100) : 0;

  const reviewTimes = matters
    .map((m) => days(m.paidAt, m.approvedAt))
    .filter((d): d is number => d !== null);
  const avgReview = reviewTimes.length ? (reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length).toFixed(1) : "—";

  // Flag frequency across all matters
  const flagCounts = new Map<string, { label: string; severity: string; n: number }>();
  for (const m of matters) {
    for (const f of m.flags) {
      const cur = flagCounts.get(f.id) ?? { label: f.label, severity: f.severity, n: 0 };
      cur.n += 1;
      flagCounts.set(f.id, cur);
    }
  }
  const topFlags = [...flagCounts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 10);
  const maxFlag = Math.max(1, ...topFlags.map(([, v]) => v.n));

  const promoRows = db().promos.map((p) => ({
    ...p,
    attributed: paid.filter((m) => m.payment?.promoCode === p.code).length,
    revenue: paid.filter((m) => m.payment?.promoCode === p.code).reduce((s, m) => s + (m.payment?.total ?? 0), 0),
  }));

  const referrals = Object.entries(db().referralCredits).map(([userId, v]) => ({
    name: db().users.find((u) => u.id === userId)?.name ?? userId,
    ...v,
  }));

  const funnel = [
    { label: "Started a will", n: started },
    { label: "Completed questionnaire", n: submitted },
    { label: "Paid", n: paid.length },
    { label: "Approved", n: matters.filter((m) => m.approvedAt).length },
    { label: "Issued", n: issued },
  ];

  return (
    <ConsoleShell title="Reports" subtitle="Conversion, revenue, promos, referrals and flag frequency" currentPath="/admin/reports" allowedRoles={["admin", "observer", "senior_lawyer"]} nav={ADMIN_NAV}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Revenue (test)", value: money(revenue), sub: `${paid.length} orders` },
          { label: "Conversion", value: `${conversion}%`, sub: `${paid.length} of ${started} started` },
          { label: "Avg review time", value: `${avgReview} days`, sub: `${reviewTimes.length} approvals` },
          { label: "Discounts given", value: money(discounts), sub: `add-ons ${money(addOnRevenue)}` },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs font-semibold text-ink/55">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">{s.value}</p>
            <p className="text-xs text-ink/45">{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Conversion funnel</h2>
          <ul className="mt-5 space-y-3">
            {funnel.map((f) => (
              <li key={f.label}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-ink">{f.label}</span>
                  <span className="text-ink/60">{f.n} · {started ? Math.round((f.n / started) * 100) : 0}%</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-ink/8">
                  <div className="h-full rounded-full bg-eucalyptus transition-[width] duration-500" style={{ width: `${started ? (f.n / started) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Flag frequency</h2>
          <ul className="mt-5 space-y-2.5">
            {topFlags.map(([id, v]) => (
              <li key={id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <Badge tone={v.severity === "blocker" ? "red" : v.severity === "high" ? "clay" : v.severity === "medium" ? "gold" : "sky"}>{v.severity}</Badge>
                    <span className="truncate text-ink/80">{v.label}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink">{v.n}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/8">
                  <div className="h-full rounded-full bg-clay" style={{ width: `${(v.n / maxFlag) * 100}%` }} />
                </div>
              </li>
            ))}
            {topFlags.length === 0 && <li className="text-sm text-ink/50">No flags raised yet.</li>}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Promo code usage</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-fern">
                  <th className="pb-2 font-bold">Code</th>
                  <th className="pb-2 font-bold">Discount</th>
                  <th className="pb-2 text-right font-bold">Lifetime</th>
                  <th className="pb-2 text-right font-bold">This session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {promoRows.map((p) => (
                  <tr key={p.code} className={p.active ? "" : "opacity-55"}>
                    <td className="py-2.5 font-mono text-xs font-bold text-eucalyptus">{p.code}</td>
                    <td className="py-2.5">{p.kind === "percent" ? `${p.value}%` : money(p.value)}</td>
                    <td className="py-2.5 text-right">{p.uses}{p.maxUses ? ` / ${p.maxUses}` : ""}</td>
                    <td className="py-2.5 text-right font-semibold">{p.attributed} · {money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Referral performance</h2>
          <ul className="mt-4 space-y-2.5">
            {referrals.map((r) => (
              <li key={r.code} className="flex items-center justify-between gap-3 rounded-xl bg-sand px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{r.name}</p>
                  <p className="font-mono text-xs text-ink/55">{r.code}</p>
                </div>
                <div className="text-right text-xs text-ink/65">
                  <p>{r.invited} invited · {r.converted} converted</p>
                  <p className="font-semibold text-eucalyptus">{money(r.credit)} credit</p>
                </div>
              </li>
            ))}
            {referrals.length === 0 && <li className="text-sm text-ink/50">No referral activity yet.</li>}
          </ul>
        </Card>
      </div>
    </ConsoleShell>
  );
}
