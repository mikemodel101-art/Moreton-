import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/chrome";
import { Reveal } from "@/components/motion";
import { SectionHeading } from "@/components/ui";
import { PromoTester } from "@/components/promo-tester";
import { db } from "@/lib/store";
import { money } from "@/lib/engine";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const plans = db().plans;
  const activePromos = db().promos.filter((p) => p.active);

  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader active="pricing" />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal>
          <SectionHeading
            kicker="Pricing"
            title="Fixed fees, reviewed by lawyers"
            intro="Every plan includes a solicitor's review before your will is issued. Pricing below is read live from the admin-editable pricing config."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <div
                className={`flex h-full flex-col rounded-3xl border p-7 card-shadow ${
                  p.popular ? "border-eucalyptus bg-paper ring-2 ring-eucalyptus/20" : "border-ink/10 bg-paper"
                }`}
              >
                {p.popular && (
                  <span className="mb-1 self-start rounded-full bg-eucalyptus px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-paper">
                    Most popular
                  </span>
                )}
                <h2 className="font-display text-2xl font-semibold text-ink">{p.name}</h2>
                <p className="mt-1 text-sm text-ink/60">{p.blurb}</p>
                <p className="mt-5">
                  <span className="font-display text-5xl font-semibold text-eucalyptus">{money(p.price)}</span>
                  <span className="ml-2 text-sm text-ink/50">one-off</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink/75">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-eucalyptus px-5 py-3 text-sm font-bold text-paper hover:bg-moss"
                >
                  Start with {p.name} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-ink/10 bg-paper p-7 card-shadow">
              <h2 className="font-display text-xl font-semibold text-ink">Try the promo engine</h2>
              <p className="mt-1 text-sm text-ink/60">
                Codes are validated against the same promos the Admin console manages. Try{" "}
                <code className="rounded bg-sand px-1.5 py-0.5 font-mono text-xs font-bold text-eucalyptus">WELCOME20</code>,{" "}
                <code className="rounded bg-sand px-1.5 py-0.5 font-mono text-xs font-bold text-eucalyptus">QLDFAMILY25</code>{" "}
                or an expired one like{" "}
                <code className="rounded bg-sand px-1.5 py-0.5 font-mono text-xs font-bold text-eucalyptus">EXPIRED50</code>.
              </p>
              <div className="mt-5">
                <PromoTester plans={plans.map((p) => ({ id: p.id, name: p.name, price: p.price }))} />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="h-full rounded-3xl border border-ink/10 bg-paper p-7 card-shadow">
              <h2 className="font-display text-xl font-semibold text-ink">Referral partners</h2>
              <p className="mt-1 text-sm text-ink/60">
                Community partners share these codes with their members. Usage counts feed the referral
                report in the Admin console.
              </p>
              <ul className="mt-5 space-y-3">
                {activePromos
                  .filter((p) => p.referrer)
                  .map((p) => (
                    <li key={p.code} className="flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-eucalyptus">{p.code}</p>
                        <p className="text-xs text-ink/60">{p.referrer}</p>
                      </div>
                      <span className="text-sm font-semibold text-ink/70">
                        {p.kind === "percent" ? `${p.value}% off` : `${money(p.value)} off`} · {p.uses} uses
                      </span>
                    </li>
                  ))}
              </ul>
              <p className="mt-5 flex items-start gap-2 text-xs text-ink/55">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-eucalyptus" aria-hidden />
                Checkout in this prototype runs in Stripe test mode — no card is ever charged.
              </p>
            </div>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
