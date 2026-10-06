import { redirect } from "next/navigation";
import Link from "next/link";
import { Database, Eye, ShieldCheck, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { SiteHeader } from "@/components/chrome";
import { db } from "@/lib/store";
import { Card } from "@/components/ui";
import { DeleteTestData } from "@/components/delete-test-data";

export const metadata: Metadata = { title: "Your data" };

export default async function PrivacyControlsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/privacy-controls");
  const mine = db().matters.filter((m) => m.clientId === user.id);
  const myMail = db().mail.filter((m) => m.toEmail === user.email);
  const myMessages = db().messages.filter((m) => mine.some((x) => x.id === m.matterId));

  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">Privacy &amp; data</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">What we hold about you</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink/65">
          In this prototype everything lives in memory for the length of the demo session. Nothing is written
          to a database, nothing leaves the sandbox, and no real email is ever sent.
        </p>

        <Card className="mt-8 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Database className="h-5 w-5 text-eucalyptus" aria-hidden /> Your records right now
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Matters", mine.length],
              ["Answers stored", mine.reduce((s, m) => s + Object.keys(m.answers).length, 0)],
              ["Messages", myMessages.length],
              ["Email previews", myMail.length],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl bg-sand p-3 text-center">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-ink/45">{k}</dt>
                <dd className="font-display text-2xl font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="mt-5 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-eucalyptus" aria-hidden /> Retention (what the real service would do)
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li>· Draft answers kept while your matter is open, then 7 years after a will is issued (professional obligation).</li>
            <li>· Signed originals held in custody until you ask for them back.</li>
            <li>· Payment records retained 7 years for tax purposes; card data never touches our servers (Stripe only).</li>
            <li>· Audit logs are immutable and retained for the life of the file.</li>
            <li>· You can request access to, correction of, or deletion of your information at any time.</li>
          </ul>
          <p className="mt-4 text-xs text-ink/55">
            Read the full <Link href="/legal/privacy" className="font-semibold text-eucalyptus underline">privacy policy</Link>.
          </p>
        </Card>

        <Card className="mt-5 border-clay/30 bg-clay/5 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Trash2 className="h-5 w-5 text-clay" aria-hidden /> Delete my test data
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            Wipes every matter, message, email preview and answer tied to your demo account. Useful between
            user-testing sessions so the next participant starts clean.
          </p>
          <div className="mt-4">
            <DeleteTestData count={mine.length} />
          </div>
        </Card>

        <p className="mt-6 flex items-start gap-2 text-xs text-ink/55">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-fern" aria-hidden />
          Reminder: please don&rsquo;t enter real personal details anywhere in this prototype — use invented
          names, addresses and amounts.
        </p>
      </main>
    </div>
  );
}
