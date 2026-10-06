import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/chrome";
import { BRAND } from "@/lib/config";

export function generateStaticParams() {
  return [{ doc: "privacy" }, { doc: "terms" }, { doc: "disclaimer" }];
}

const DOCS: Record<string, { title: string; updated: string; sections: { h: string; body: string[] }[] }> = {
  privacy: {
    title: "Privacy policy (prototype)",
    updated: "January 2026",
    sections: [
      {
        h: "1. What this prototype collects",
        body: [
          "Nothing real. Every person, will, payment and email in this prototype is seeded dummy data stored in your browser session only. No information you type leaves this demo environment.",
          "In a production service, we would collect the personal information you provide in the questionnaire — identity, family, assets and wishes — to prepare your will, as required by the Privacy Act 1988 (Cth) and the Australian Privacy Principles.",
        ],
      },
      {
        h: "2. How it would be used",
        body: [
          "To prepare and review your will, communicate with you about your matter, meet our obligations as a law practice, and operate the service. Sensitive information (health, family circumstances) would only be used for the purpose you provided it.",
          "In this prototype, lawyer review, notes, messages and document exports operate entirely on dummy data in memory.",
        ],
      },
      {
        h: "3. Storage and access",
        body: [
          "Production systems would store data encrypted at rest in Australia, with role-based access and a full audit trail — both are demonstrated functionally in this prototype.",
          "Demo data resets when the server restarts. Nothing is retained.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of service (prototype)",
    updated: "January 2026",
    sections: [
      {
        h: "1. The service",
        body: [
          "This is a working prototype of an online wills service for demonstration and user testing. It is not a real service, not a law firm, and nothing here constitutes legal advice or creates a solicitor–client relationship.",
          "In production, the service would be: a guided questionnaire, payment, review by an Australian legal practitioner, and issue of a will suitable for execution under the Succession Act 1981 (Qld).",
        ],
      },
      {
        h: "2. Payments",
        body: [
          "All checkout flows run Stripe test mode with test card numbers. No real charge is possible in this prototype.",
          "Production terms would cover fixed-fee pricing, refunds before review begins, and updates windows per plan.",
        ],
      },
      {
        h: "3. Acceptable use",
        body: [
          "Don't enter real personal information about yourself or anyone else into this prototype. Don't rely on exported documents — they are watermarked dummy instruments.",
        ],
      },
      {
        h: "4. Liability",
        body: [
          "This prototype is provided as-is for evaluation. To the extent permitted by law, no liability attaches to its use. Production services would carry the firm's professional obligations and insurance.",
        ],
      },
    ],
  },
  disclaimer: {
    title: "Legal disclaimer",
    updated: "January 2026",
    sections: [
      {
        h: "Prototype notice",
        body: [
          `${BRAND.firmName} and ${BRAND.productName} as presented here are fictional. This prototype is for user testing and sales evaluation only.`,
          "Nothing on this site is legal advice, financial advice or a substitute for advice from a qualified Australian legal practitioner who knows your circumstances.",
        ],
      },
      {
        h: "Queensland law references",
        body: [
          "References to the Succession Act 1981 (Qld) — including signing requirements under s 10 and witness rules under s 11 — are accurate summaries as at January 2026, provided as general information, not advice.",
          "Wills, estate planning and family provision law change. Always confirm current requirements with a solicitor.",
        ],
      },
      {
        h: "Dummy data",
        body: [
          "All names, matters, payments, testimonials and statistics are invented for demonstration. Any resemblance to real persons is coincidental.",
        ],
      },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  return { title: DOCS[doc]?.title ?? "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();

  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Home
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-eucalyptus/10 text-eucalyptus" aria-hidden>
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">{d.title}</h1>
            <p className="text-xs text-ink/50">Updated {d.updated}</p>
          </div>
        </div>
        <nav className="mt-5 flex gap-2 text-xs font-semibold" aria-label="Legal documents">
          {Object.keys(DOCS).map((k) => (
            <Link key={k} href={`/legal/${k}`} aria-current={k === doc ? "page" : undefined} className={`rounded-full px-3.5 py-1.5 ${k === doc ? "bg-eucalyptus text-paper" : "border border-ink/15 text-ink/60 hover:bg-paper"}`}>
              {k[0].toUpperCase() + k.slice(1)}
            </Link>
          ))}
        </nav>
        <article className="mt-8 space-y-8 rounded-3xl border border-ink/10 bg-paper p-8 card-shadow">
          {d.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-xl font-semibold text-ink">{s.h}</h2>
              {s.body.map((p) => (
                <p key={p.slice(0, 24)} className="mt-2.5 text-sm leading-relaxed text-ink/70">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
