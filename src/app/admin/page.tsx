import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BadgePercent,
  BarChart3,
  CircleDollarSign,
  FlaskConical,
  MessageSquareHeart,
  Handshake,
  LayoutDashboard,
  ListChecks,
  PhoneCall,
  ScrollText,
  StampIcon,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { db } from "@/lib/store";
import { money } from "@/lib/engine";
import { Card, ResetDemoNote } from "@/components/admin-shared";
import { ResetDemo } from "@/components/admin-widgets";

export const metadata: Metadata = { title: "Admin dashboard" };

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", exact: true, icon: <LayoutDashboard className="h-4 w-4" aria-hidden /> },
  { href: "/admin/users", label: "Users & roles", icon: <Users className="h-4 w-4" aria-hidden /> },
  { href: "/admin/promos", label: "Promo codes", icon: <BadgePercent className="h-4 w-4" aria-hidden /> },
  { href: "/admin/pricing", label: "Pricing", icon: <CircleDollarSign className="h-4 w-4" aria-hidden /> },
  { href: "/admin/clauses", label: "Clause bank", icon: <ScrollText className="h-4 w-4" aria-hidden /> },
  { href: "/admin/questions", label: "Questions", icon: <ListChecks className="h-4 w-4" aria-hidden /> },
  { href: "/admin/simulator", label: "Logic simulator", icon: <FlaskConical className="h-4 w-4" aria-hidden /> },
  { href: "/admin/reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" aria-hidden /> },
  { href: "/admin/testing", label: "User testing", icon: <MessageSquareHeart className="h-4 w-4" aria-hidden /> },
  { href: "/admin/leads", label: "Leads", icon: <PhoneCall className="h-4 w-4" aria-hidden /> },
  { href: "/admin/audit", label: "Audit log", icon: <StampIcon className="h-4 w-4" aria-hidden /> },
];

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer"].includes(user.role)) {
    redirect(user.role === "client" ? "/app" : "/lawyer");
  }

  const paid = db().matters.filter((m) => m.payment);
  const revenue = paid.reduce((s, m) => s + (m.payment?.total ?? 0), 0);
  const discounts = paid.reduce((s, m) => s + (m.payment?.discount ?? 0), 0);
  const byPlan = db().plans.map((p) => ({
    name: p.name,
    count: paid.filter((m) => m.payment?.planId === p.id).length,
    total: paid.filter((m) => m.payment?.planId === p.id).reduce((s, m) => s + (m.payment?.total ?? 0), 0),
  }));
  const maxCount = Math.max(1, ...byPlan.map((b) => b.count));

  const referrals = db()
    .promos.filter((p) => p.referrer)
    .map((p) => ({
      referrer: p.referrer!,
      code: p.code,
      uses: paid.filter((m) => m.payment?.promoCode === p.code).length + Math.min(p.uses, paid.length ? 0 : 0),
      revenue: paid.filter((m) => m.payment?.promoCode === p.code).reduce((s, m) => s + (m.payment?.total ?? 0), 0),
      discount: paid.filter((m) => m.payment?.promoCode === p.code).reduce((s, m) => s + (m.payment?.discount ?? 0), 0),
    }));

  const funnel = (["draft", "awaiting_payment", "in_review", "changes_requested", "approved", "issued"] as const).map(
    (s) => ({ status: s, count: db().matters.filter((m) => m.status === s).length })
  );

  return (
    <ConsoleShell
      title="Admin console"
      subtitle="Operations, revenue and configuration"
      currentPath="/admin"
      allowedRoles={["admin", "observer"]}
      nav={ADMIN_NAV}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Revenue (test mode)", value: money(revenue), sub: `${paid.length} paid matters` },
            { label: "Discounts given", value: money(discounts), sub: "via promo codes" },
            { label: "Active matters", value: db().matters.length, sub: `${db().matters.filter((m) => m.status === "in_review").length} in review` },
            { label: "Users", value: db().users.length, sub: `${db().users.filter((u) => u.role === "client").length} clients` },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs font-semibold text-ink/55">{s.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{s.value}</p>
              <p className="text-xs text-ink/45">{s.sub}</p>
            </Card>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <ResetDemoNote />
        {user.role === "admin" && <ResetDemo />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Revenue by plan */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Revenue by plan</h2>
          <div className="mt-5 space-y-4">
            {byPlan.map((b) => (
              <div key={b.name}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-ink">{b.name}</span>
                  <span className="text-ink/60">
                    {b.count} sold · <strong className="text-ink">{money(b.total)}</strong>
                  </span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-ink/8" role="img" aria-label={`${b.name}: ${b.count} sales`}>
                  <div className="h-full rounded-full bg-eucalyptus" style={{ width: `${(b.count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 flex items-center gap-1.5 text-xs text-ink/50">
            <Handshake className="h-3.5 w-3.5" aria-hidden /> Live data from dummy payments in this session.
          </p>
        </Card>

        {/* Referral report */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Referral partner report</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-fern">
                  <th className="pb-2 font-bold">Partner</th>
                  <th className="pb-2 font-bold">Code</th>
                  <th className="pb-2 text-right font-bold">Attributed</th>
                  <th className="pb-2 text-right font-bold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {referrals.map((r) => (
                  <tr key={r.code}>
                    <td className="py-2.5 font-semibold text-ink">{r.referrer}</td>
                    <td className="py-2.5 font-mono text-xs">{r.code}</td>
                    <td className="py-2.5 text-right">{r.uses}</td>
                    <td className="py-2.5 text-right font-semibold">{money(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-ink/50">
            Promo redemptions since this demo session started are attributed live; seeded lifetime usage
            numbers appear in the <Link href="/admin/promos" className="font-semibold text-eucalyptus underline">promo register</Link>.
          </p>
        </Card>

        {/* Status funnel */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink">Matter pipeline</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {funnel.map((f) => (
              <div key={f.status} className="rounded-2xl bg-sand p-4 text-center">
                <p className="font-display text-3xl font-semibold text-eucalyptus">{f.count}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink/50">
                  {f.status.replace("_", " ")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ConsoleShell>
  );
}
