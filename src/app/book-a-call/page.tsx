import Link from "next/link";
import { ArrowLeft, Clock3, HeartHandshake, Phone, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { SiteHeader } from "@/components/chrome";
import { getActiveMatter } from "@/lib/store";
import { evaluateFlags, computeComplexity } from "@/lib/engine";
import { BookCallForm } from "@/components/book-call-form";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Let's talk it through" };

export default async function BookCallPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const matter = user ? getActiveMatter(user, sp.m) : null;
  const blockers = matter ? computeComplexity(evaluateFlags(matter.answers)).blockers : [];
  const reason = sp.reason ?? blockers[0]?.clientMessage ?? "";

  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link href={matter ? `/will?m=${matter.id}` : "/"} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </Link>

        <div className="mt-5 flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-eucalyptus/10 text-eucalyptus" aria-hidden>
            <HeartHandshake className="h-7 w-7" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">Not a problem — just a conversation</p>
            <h1 className="mt-1.5 font-display text-4xl font-semibold tracking-tight text-ink">
              This one is best handled with a lawyer
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink/65">
              Nothing has gone wrong, and nothing you&rsquo;ve entered is lost. Something in your answers means
              a short conversation will get you a better will than a form can. It usually takes 20 minutes.
            </p>
          </div>
        </div>

        {blockers.length > 0 && (
          <div className="mt-6 rounded-2xl border border-gold/50 bg-[#FFF7E0] px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#7A5C14]">Why we paused</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink/80">
              {blockers.map((b) => (
                <li key={b.id}>· {b.clientMessage}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <BookCallForm
            matterId={matter?.id ?? null}
            defaultName={user?.name ?? ""}
            defaultEmail={user?.email ?? ""}
            defaultReason={reason}
          />
          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-ink">What happens next</h2>
              <ol className="mt-4 space-y-3 text-sm text-ink/70">
                {[
                  "We call you at a time that suits — usually within one business day.",
                  "A solicitor reviews what you've already entered, so you don't repeat yourself.",
                  "You get a fixed-fee quote before any work starts.",
                  "If it turns out the online path works after all, you simply continue.",
                ].map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-eucalyptus text-xs font-bold text-paper">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </Card>
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Phone className="h-5 w-5 text-eucalyptus" aria-hidden /> Prefer to call us?
              </h2>
              <p className="mt-2 text-sm text-ink/70">
                <span className="font-display text-2xl font-semibold text-eucalyptus">(07) 3000 0000</span>
                <br />
                <span className="inline-flex items-center gap-1.5 text-xs text-ink/55">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden /> Mon–Fri, 8:30am–5:30pm AEST (dummy number)
                </span>
              </p>
              <p className="mt-4 flex items-start gap-2 text-xs text-ink/55">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-eucalyptus" aria-hidden />
                Your draft stays saved. You can keep editing answers any time.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
