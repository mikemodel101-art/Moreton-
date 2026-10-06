import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, FileText, Printer, TriangleAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { SiteHeader } from "@/components/chrome";
import { getActiveMatter } from "@/lib/store";
import { Card, EmptyState } from "@/components/ui";
import { Callout, Term } from "@/components/design-system";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = { title: "QLD signing guide" };

const RULES = [
  {
    title: "Two witnesses, together, watching you sign",
    body: "Both witnesses must be physically present at the same time and must actually see you sign each page. Video witnessing has separate rules — this guide covers in-person signing.",
  },
  {
    title: "Witnesses must be 18+ and impartial",
    body: "Neither witness should be a beneficiary or the spouse/partner of a beneficiary — a gift to a witness (or their partner) is void under s 11, Succession Act 1981 (Qld).",
  },
  {
    title: "Sign every page, in blue or black pen",
    body: "Blue pen makes originals obvious against photocopies. Use the same signature as your photo ID where possible.",
  },
  {
    title: "Date it, in front of your witnesses",
    body: "Write the actual date everyone signs. Don't backdate or pre-date — that's the kind of thing that unravels wills.",
  },
  {
    title: "No staples removed, no alterations later",
    body: "Keep the document exactly as issued. Changes after signing need a codicil or a fresh will — never white-out or cross-outs.",
  },
  {
    title: "Store the original, tell your executor where",
    body: "A safe, a fireproof box, or with your solicitor. A scan is a backup, not the will.",
  },
];

export default async function SigningGuidePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/signing-guide");
  const matter = getActiveMatter(user);
  const issued = matter?.status === "issued";

  return (
    <div className="min-h-screen bg-sand">
      <div className="no-print"><SiteHeader /></div>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 print:max-w-none print:px-0 print:py-0">
        <div className="no-print">
          <Link href={matter ? `/app/status/${matter.id}` : "/app"} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">Queensland · Succession Act 1981 s 10</p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-ink">How to sign your will correctly</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
              A will that is signed wrong can be invalid — that's the whole point of this page. Print it and
              take it to your signing. It takes two witnesses and about ten minutes.
            </p>
          </div>
          <div className="no-print flex flex-col gap-2">
            <a
              href={matter ? `/api/signing-guide?m=${matter.id}` : "/api/signing-guide"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-eucalyptus px-5 py-2.5 text-sm font-bold text-paper hover:bg-moss"
            >
              <Download className="h-4 w-4" aria-hidden /> 1-page guide (PDF)
            </a>
            <PrintButton />
            {issued && matter && (
              <a href={`/api/export/${matter.id}/pdf`} className="inline-flex items-center gap-2 rounded-full border-2 border-eucalyptus px-5 py-2.5 text-sm font-bold text-eucalyptus hover:bg-eucalyptus hover:text-paper">
                <Download className="h-4 w-4" aria-hidden /> Your will (PDF)
              </a>
            )}
          </div>
        </div>

        {!issued && (
          <div className="no-print mt-6">
            <Callout tone="info">
              Your will isn't issued yet — this guide is ready whenever it is. The downloadable document
              appears here once your lawyer approves and issues it.
            </Callout>
          </div>
        )}

        <Card className="mt-8 p-7 print:border-0 print:shadow-none">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <Users className="h-5 w-5 text-eucalyptus" aria-hidden /> The six rules
          </h2>
          <ol className="mt-5 space-y-5">
            {RULES.map((r, i) => (
              <li key={r.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-eucalyptus font-display text-sm font-bold text-paper" aria-hidden>
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-ink">{r.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/65">{r.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Witness checklist</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-ink/75">
              {[
                "Neighbour, workmate or friend — not a beneficiary",
                "Both 18 or older",
                "Both in the room the whole time",
                "Each writes name, signs and dates the last page",
              ].map((w) => (
                <li key={w} className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-eucalyptus" aria-hidden /> {w}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <TriangleAlert className="h-5 w-5 text-clay" aria-hidden /> Common mistakes
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm text-ink/75">
              {[
                "Witnesses signing later, separately",
                "Beneficiary acting as a witness",
                "Staples removed to scan — never",
                "Mistakes 'fixed' with white-out",
              ].map((w) => (
                <li key={w} className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-clay" aria-hidden /> {w}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink/55">
              Made a mistake? Ask us for a fresh copy — <Term label="codicils" tip="A codicil is a formal amendment to a will, signed with the same ceremony as the will itself." /> and re-issues are always cleaner than corrections.
            </p>
          </Card>
        </div>

        {!issued && (
          <div className="no-print mt-6">
            <EmptyState
              icon={<FileText className="h-6 w-6" aria-hidden />}
              title="Nothing to sign yet"
              body="Once your will is issued, this page links straight to the printable document."
              action={
                matter ? (
                  <Link href={`/app/status/${matter.id}`} className="rounded-full bg-eucalyptus px-5 py-2.5 text-sm font-bold text-paper hover:bg-moss">
                    Track your matter
                  </Link>
                ) : undefined
              }
            />
          </div>
        )}

        <p className="mt-8 border-t border-ink/10 pt-4 text-xs text-ink/55">
          Prototype guide, not legal advice. Sources: ss 10–11, Succession Act 1981 (Qld).
        </p>
      </main>
    </div>
  );
}
