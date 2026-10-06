import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  Gavel,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/chrome";
import { Reveal } from "@/components/motion";
import { ParallaxImg, TrustCounters, HowItWorksScroll } from "@/components/landing-anims";
import { SectionHeading } from "@/components/ui";
import { BRAND } from "@/lib/config";
import { db } from "@/lib/store";
import { money } from "@/lib/engine";

const TESTIMONIALS = [
  {
    quote: "My husband and I both finished ours in under 20 minutes. The lawyer caught a superannuation issue we'd never have spotted.",
    name: "Fiona R.",
    meta: "Carindale — Standard Will",
  },
  {
    quote: "After our twins were born this was hanging over us. The guardian questions made it feel considered, not scary.",
    name: "Daniel & Priya S.",
    meta: "Toowoomba — Standard Will",
  },
  {
    quote: "I have a blended family and a business. The senior lawyer called before anything was finalised — exactly the right care.",
    name: "Margaret W.",
    meta: "Sunshine Coast — Premium Will",
  },
];

const FAQS = [
  {
    q: "Is an online will legally valid in Queensland?",
    a: "Yes — the document must still be printed and signed in front of two adult witnesses under s 10 of the Succession Act 1981 (Qld). Every issued will ships with a step-by-step signing checklist.",
  },
  {
    q: "Who checks my answers?",
    a: "A solicitor at Moreton & Grey reviews every single questionnaire before a will is issued. Complex matters — blended families, large estates, excluded dependants — are escalated to our principal for sign-off.",
  },
  {
    q: "What if my situation is too complex?",
    a: "The lawyer can return your matter with guidance and refer you to our full-service team. You won't receive a document that isn't right for your circumstances.",
  },
  {
    q: "Can I update my will later?",
    a: "Essential includes 12 months of free updates. Standard and Premium include forever-update options in the full product (illustrated in the mock screens).",
  },
  {
    q: "Is this prototype real?",
    a: "No — it's a working prototype on dummy data for user testing. Payments run in Stripe test mode, emails are previewed in-app, and everyone here is fictional.",
  },
];

export default async function LandingPage() {
  const plans = db().plans;

  return (
    <div className="bg-sand">
      <SiteHeader active="home" />

      {/* ------------------------------ HERO ------------------------------ */}
      <section className="relative overflow-hidden bg-eucalyptus text-paper">
        <ParallaxImg src={BRAND.images.hero} className="opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <Reveal>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-paper/25 bg-paper/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-gold">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Reviewed by real Queensland lawyers
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
              {BRAND.tagline}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/75">
              Answer guided questions in about 20 minutes, pay a fixed fee, and a solicitor checks
              everything before your will is issued. From {money(Math.min(...plans.map((p) => p.price)))} — no
              appointments, no hourly rates.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-base font-bold text-ink transition-all hover:brightness-105"
              >
                Start my will
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border-2 border-paper/40 px-7 py-3.5 text-base font-semibold text-paper hover:border-paper hover:bg-paper/10"
              >
                See pricing
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.34}>
            <TrustCounters />
          </Reveal>
        </div>
      </section>

      {/* --------------------------- TRUST STRIP --------------------------- */}
      <section className="border-b border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-4 text-xs font-bold uppercase tracking-[0.16em] text-fern sm:px-6">
          <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-eucalyptus" aria-hidden /> {BRAND.trust.lawSociety}</span>
          <span className="inline-flex items-center gap-2"><Timer className="h-4 w-4 text-eucalyptus" aria-hidden /> 2–3 business day review</span>
          <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-eucalyptus" aria-hidden /> Family owned firm, Brisbane</span>
          <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-eucalyptus" aria-hidden /> Succession Act 1981 (Qld) compliant</span>
        </div>
      </section>

      {/* --------------------------- HOW IT WORKS --------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" id="how">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <SectionHeading
                kicker="How it works"
                title="Four calm steps between you and peace of mind"
                intro="Everything happens in your portal — and a human lawyer is on the other side of every file. Scroll to walk through it."
              />
            </Reveal>
            <Reveal delay={0.1}>
              <img
                src={BRAND.images.signing}
                alt="A solicitor guiding a client through paperwork"
                className="mt-8 hidden aspect-[4/3] w-full rounded-3xl object-cover card-shadow lg:block"
                loading="lazy"
              />
            </Reveal>
          </div>
          <HowItWorksScroll />
        </div>
      </section>

      {/* ------------------------------ STORY ------------------------------ */}
      <section className="bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <div className="relative">
              <img
                src={BRAND.images.family}
                alt="Three generations of a family laughing together outdoors"
                className="aspect-[4/3] w-full rounded-3xl object-cover card-shadow-lg"
                loading="lazy"
              />
              <div className="absolute -bottom-6 -right-4 hidden rounded-2xl bg-eucalyptus px-6 py-4 text-paper card-shadow-lg sm:block">
                <p className="font-display text-2xl font-semibold">96%</p>
                <p className="text-xs text-paper/70">of reviews finish without changes (dummy)</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <SectionHeading
              kicker="Why families choose us"
              title="A will is care, written down"
              intro="Most Queenslanders know they need a will. Few book the appointment. We bring the lawyer's review to your kitchen table — careful questions, honest pricing, and a solicitor who reads every word."
            />
            <ul className="mt-6 space-y-3 text-sm text-ink/70">
              {[
                "Guardian nominations that hold up in practice, not just on paper",
                "Family provision risk spot-checks under Part 4, Succession Act 1981 (Qld)",
                "Superannuation and binding nomination guidance built in",
                "Plain-English documents — your executor will thank you",
              ].map((li) => (
                <li key={li} className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-eucalyptus" aria-hidden />
                  {li}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------ PRICING ------------------------------ */}
      <section className="paper-grain mx-auto max-w-7xl px-4 py-20 sm:px-6" id="pricing">
        <Reveal>
          <SectionHeading
            kicker="Fixed fees"
            title="Choose your will"
            intro="Every plan includes lawyer review before issue. Prices in AUD, GST-inclusive (dummy pricing for the prototype)."
          />
        </Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <div
                className={`relative flex h-full flex-col rounded-3xl border p-7 card-shadow ${
                  p.popular ? "border-eucalyptus bg-paper ring-2 ring-eucalyptus/20" : "border-ink/10 bg-paper"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-eucalyptus px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-paper">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-2xl font-semibold text-ink">{p.name}</h3>
                <p className="mt-1 text-sm text-ink/60">{p.blurb}</p>
                <p className="mt-5">
                  <span className="font-display text-5xl font-semibold text-eucalyptus">{money(p.price)}</span>
                  <span className="ml-2 text-sm text-ink/50">one-off</span>
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-fern">{p.recommendedFor}</p>
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
                  className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-colors ${
                    p.popular
                      ? "bg-eucalyptus text-paper hover:bg-moss"
                      : "border-2 border-eucalyptus text-eucalyptus hover:bg-eucalyptus hover:text-paper"
                  }`}
                >
                  Start with {p.name} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <p className="mt-6 text-center text-sm text-ink/60">
            Have a partner code? Try <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-eucalyptus">WELCOME20</code> at checkout — the mock checkout applies it for real.
          </p>
        </Reveal>
      </section>

      {/* --------------------------- TESTIMONIALS --------------------------- */}
      <section className="bg-eucalyptus py-20 text-paper">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <SectionHeading
              kicker="Client stories"
              title="Trusted by Queensland families"
              className="[&_h2]:text-paper [&_p]:text-paper/70 [&_.text-clay]:text-gold"
            />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <figure className="flex h-full flex-col rounded-3xl bg-paper/8 p-7 backdrop-blur-sm">
                  <blockquote className="flex-1 font-display text-lg leading-relaxed text-paper/90">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 border-t border-paper/15 pt-4 text-sm">
                    <span className="font-bold text-gold">{t.name}</span>
                    <span className="block text-paper/60">{t.meta} — dummy testimonial</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- FAQ ------------------------------- */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Reveal>
          <SectionHeading kicker="Questions" title="Good questions, straight answers" className="text-center mx-auto" />
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <Reveal key={f.q}>
              <details className="group rounded-2xl border border-ink/10 bg-paper px-6 py-4 card-shadow open:ring-1 open:ring-eucalyptus/20">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-eucalyptus/10 text-eucalyptus transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink/65">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------- CTA ------------------------------- */}
      <section className="relative overflow-hidden">
        <img src={BRAND.images.forest} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-ink/70" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <Reveal>
            <h2 className="font-display text-4xl font-semibold text-paper sm:text-5xl">
              Twenty minutes today. A lifetime sorted.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-paper/75">
              Start now, save as you go, and let a Queensland lawyer make sure it&rsquo;s right.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-bold text-ink hover:brightness-105"
            >
              Start my will <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------ FOOTER ------------------------------ */}
      <footer className="border-t border-ink/10 bg-paper">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <p className="font-display text-lg font-semibold text-eucalyptus">{BRAND.firmName}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">
              {BRAND.address}
              <br />
              {BRAND.phone} · {BRAND.email}
              <br />
              {BRAND.abn}
            </p>
          </div>
          <nav aria-label="Footer product">
            <p className="text-xs font-bold uppercase tracking-widest text-fern">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-ink/70">
              <li><Link className="hover:text-eucalyptus" href="/pricing">Pricing</Link></li>
              <li><Link className="hover:text-eucalyptus" href="/#how">How it works</Link></li>
              <li><Link className="hover:text-eucalyptus" href="/extras/storage">Document vault (mock)</Link></li>
              <li><Link className="hover:text-eucalyptus" href="/signing-guide">Signing guide</Link></li>
            </ul>
          </nav>
          <nav aria-label="Footer demo">
            <p className="text-xs font-bold uppercase tracking-widest text-fern">Demo</p>
            <ul className="mt-3 space-y-2 text-sm text-ink/70">
              <li><Link className="hover:text-eucalyptus" href="/login">Sign in</Link></li>
              <li><Link className="hover:text-eucalyptus" href="/mail">Email preview inbox</Link></li>
              <li><Link className="hover:text-eucalyptus" href="/lawyer">Lawyer console</Link></li>
              <li><Link className="hover:text-eucalyptus" href="/admin">Admin console</Link></li>
              <li><Link className="hover:text-eucalyptus" href="/design">Design system (/design)</Link></li>
            </ul>
          </nav>
          <nav aria-label="Footer legal">
            <p className="text-xs font-bold uppercase tracking-widest text-fern">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-ink/70">
              <li><Link className="hover:text-eucalyptus" href="/legal/privacy">Privacy policy</Link></li>
              <li><Link className="hover:text-eucalyptus" href="/legal/terms">Terms of service</Link></li>
              <li><Link className="hover:text-eucalyptus" href="/legal/disclaimer">Disclaimer</Link></li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink/50">{BRAND.legalNote}</p>
          </nav>
        </div>
        <div className="border-t border-ink/10 py-4 text-center text-xs text-ink/50">
          © 2026 {BRAND.firmName} (fictional). Prototype for user testing and sales demonstration.
        </div>
      </footer>
    </div>
  );
}
