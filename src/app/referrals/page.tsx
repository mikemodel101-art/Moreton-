import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gift, Share2, Users } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { SiteHeader } from "@/components/chrome";
import { db, getActiveMatter } from "@/lib/store";
import { PRICING } from "@/lib/config";
import { money } from "@/lib/engine";
import { Card } from "@/components/ui";
import { CopyField } from "@/components/copy-field";
import { makeReferralCode } from "@/lib/seed";

export const metadata: Metadata = { title: "Refer a friend" };

export default async function ReferralsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/referrals");
  const matter = getActiveMatter(user);
  const entry =
    db().referralCredits[user.id] ??
    { code: matter?.referralCode ?? makeReferralCode(user.id, user.name.split(" ")[0]), invited: 0, converted: 0, credit: 0 };
  const link = `https://moretonwills.example/start?ref=${entry.code}`;

  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Portal
        </Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-clay">Referrals</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
          Give {money(PRICING.referral.discountForNewClient)}, get {money(PRICING.referral.creditForReferrer)}
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink/65">
          Most people put off their will until someone they trust tells them it was easy. Share your code —
          they save {money(PRICING.referral.discountForNewClient)}, you earn{" "}
          {money(PRICING.referral.creditForReferrer)} credit toward updates.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Invited", value: entry.invited, icon: Share2 },
            { label: "Became clients", value: entry.converted, icon: Users },
            { label: "Credit earned", value: money(entry.credit), icon: Gift },
          ].map((s) => (
            <Card key={s.label} className="flex items-center gap-3 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-eucalyptus/10 text-eucalyptus" aria-hidden>
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-2xl font-semibold text-ink">{s.value}</p>
                <p className="text-xs font-semibold text-ink/55">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 p-7">
          <h2 className="font-display text-xl font-semibold text-ink">Your code</h2>
          <p className="mt-1 text-sm text-ink/60">Works at checkout for anyone who hasn&rsquo;t used us before.</p>
          <div className="mt-5 space-y-4">
            <CopyField label="Referral code" value={entry.code} big />
            <CopyField label="Shareable link" value={link} />
          </div>
          <p className="mt-5 rounded-xl bg-sand px-4 py-3 text-xs text-ink/60">
            Prototype note: try your own code at checkout with a different persona — the discount applies,
            the referrer&rsquo;s credit increments, and an email preview is generated. You can&rsquo;t use
            your own code.
          </p>
        </Card>
      </main>
    </div>
  );
}
