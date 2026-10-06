import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, FileText, ShieldCheck, Wallet, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { SiteHeader } from "@/components/chrome";
import { StartJourney } from "@/components/start-journey";
import { Callout, Term } from "@/components/design-system";
import { PrintButton } from "@/components/print-button";
import { StartConsent } from "@/components/start-consent";
import { db, getActiveMatter } from "@/lib/store";

export const metadata: Metadata = { title: "Before you begin" };

const ELIGIBLE = [
  { ok: true, label: "You're 18 or older" },
  { ok: true, label: "You understand what a will does (take our word — a lawyer confirms it later anyway)" },
  { ok: true, label: "Your situation broadly fits: family, home, super, savings" },
  { ok: false, label: "Court orders about your capacity, or a contested estate right now" },
  { ok: false, label: "Complex overseas tax residency (talk to us in person instead)" },
];

const NEED = [
  { icon: FileText, text: "Full legal names and birth dates of your partner, children and guardians" },
  { icon: Wallet, text: "A rough sense of what you own — home, super, business. Estimates are fine." },
  { icon: ShieldCheck, text: "Who you'd trust as executor (and a backup)" },
  { icon: Clock3, text: "About 20 minutes, one question at a time — autosaved as you go" },
];

export default async function StartPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/start");
  const active = getActiveMatter(user);
  const resumable = active && ["draft", "changes_requested"].includes(active.status) ? active : null;

  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Home
        </Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-clay">Before you begin</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Seven steps, twenty minutes, one lawyer
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/65">
          Here's exactly what to expect. Your answers save automatically — you can stop anytime and resume on
          any device.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <section aria-labelledby="eligible-h" className="rounded-3xl border border-ink/10 bg-paper p-6 card-shadow">
            <h2 id="eligible-h" className="font-display text-xl font-semibold text-ink">Quick eligibility check</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {ELIGIBLE.map((e) => (
                <li key={e.label} className="flex items-start gap-2.5">
                  {e.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-eucalyptus" aria-hidden />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-clay" aria-hidden />
                  )}
                  <span className={e.ok ? "text-ink/80" : "text-ink/55"}>{e.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <Callout tone="lawyer">Answer honestly — your lawyer sees these answers and would rather adjust early than return your will.</Callout>
            </div>
          </section>

          <section aria-labelledby="need-h" className="rounded-3xl border border-ink/10 bg-paper p-6 card-shadow">
            <h2 id="need-h" className="font-display text-xl font-semibold text-ink">What you'll need</h2>
            <ul className="mt-4 space-y-3.5">
              {NEED.map((n) => (
                <li key={n.text} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-eucalyptus/10 text-eucalyptus" aria-hidden>
                    <n.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm leading-relaxed text-ink/75">{n.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-ink/60">
              Every legal term gets a <Term label="plain-English explainer" tip="Hover or tap any dotted term during the questionnaire and we explain it without jargon." /> — you never need to know the jargon first.
            </p>
          </section>
        </div>

        <section aria-labelledby="checklist-h" className="mt-6 rounded-3xl border border-ink/10 bg-paper p-6 card-shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="checklist-h" className="font-display text-xl font-semibold text-ink">Document checklist</h2>
            <PrintButton />
          </div>
          <p className="mt-1 text-sm text-ink/60">Print this and gather what you need before you start.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              "Your full legal name and any former names",
              "Your date of birth and residential address",
              "Partner's full legal name and date of birth",
              "Children's full names and dates of birth",
              "Executor's full name, address and phone",
              "Backup executor's details",
              "Guardian's full name and address (if children under 18)",
              "Rough value of property, super, savings and investments",
              "How your property is held (joint tenants or tenants in common)",
              "Your super fund's binding nomination status",
              "Names of anyone receiving a specific gift",
              "Charity names and ABNs, if you're leaving a bequest",
            ].map((c) => (
              <li key={c} className="flex items-start gap-2.5 text-sm text-ink/75">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-ink/25" aria-hidden />
                {c}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="plan-h" className="mt-6 rounded-3xl border border-ink/10 bg-paper p-6 card-shadow sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="plan-h" className="font-display text-xl font-semibold text-ink">Choose your plan, then begin</h2>
            <p className="text-xs font-semibold text-fern">Step 1 of 7 starts immediately</p>
          </div>
          <div className="mt-5">
            <StartConsent />
          </div>
          <div className="mt-5">
            <StartJourney
              plans={db().plans.map((p) => ({ id: p.id, name: p.name, price: p.price, popular: p.popular }))}
              defaultPlanId={db().plans.find((p) => p.popular)?.id ?? db().plans[0].id}
              resumeMatterId={resumable?.id ?? null}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
