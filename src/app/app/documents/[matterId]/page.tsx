import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, FileText, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { canSeeMatter, clientOf, db, getMatter } from "@/lib/store";
import { buildWillDocument } from "@/lib/clauseEngine";
import { clauseProvenance } from "@/lib/provenance";
import { DocPager, type DocPageData } from "@/components/doc-pager";
import { formatDateTime } from "@/lib/engine";
import { Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Your will document" };

const SIGNING_CHECKLIST = [
  "Print the will single-sided on A4 paper.",
  "Read it once more — names, shares and gifts exactly as you intend.",
  "Sign every page in blue or black pen, with BOTH witnesses watching at the same time.",
  "Each witness signs every page too — witnesses must be over 18 and not beneficiaries.",
  "Fill in the date on the last page, in everyone's presence.",
  "Store the original somewhere safe (not just a scan) and tell your executor where.",
];

export default async function DocumentsPage({ params }: { params: Promise<{ matterId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { matterId } = await params;
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(user, matter)) notFound();
  const client = clientOf(matter)!;
  const isObserver = user.role === "observer";
  const issued = matter.status === "issued";
  const doc = buildWillDocument(matter, client, db().clauses);
  const clauseMeta = new Map(db().clauses.map((c) => [c.id, c]));
  const pages: DocPageData[] = doc.sections
    .map((s) => ({
      id: s.categoryId,
      title: s.categoryTitle,
      clauses: s.clauses
        .filter((c) => c.texts.length > 0 && !c.disabled)
        .map((c) => ({
          clauseId: c.clauseId,
          title: c.title,
          texts: c.texts,
          provenance: clauseProvenance(clauseMeta.get(c.clauseId)?.include ?? null, matter.answers),
        })),
    }))
    .filter((p) => p.clauses.length > 0);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/app" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">{matter.ref}</p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink">Your will document</h1>
        </div>
        {issued ? (
          <div className="flex gap-2">
            <a
              href={`/api/export/${matter.id}/pdf`}
              className="inline-flex items-center gap-2 rounded-full bg-eucalyptus px-5 py-2.5 text-sm font-bold text-paper hover:bg-moss"
            >
              <Download className="h-4 w-4" aria-hidden /> PDF
            </a>
            <a
              href={`/api/export/${matter.id}/docx`}
              className="inline-flex items-center gap-2 rounded-full border-2 border-eucalyptus px-5 py-2.5 text-sm font-bold text-eucalyptus hover:bg-eucalyptus hover:text-paper"
            >
              <Download className="h-4 w-4" aria-hidden /> DOCX
            </a>
          </div>
        ) : null}
      </div>

      {!issued ? (
        <div className="mt-8">
          <EmptyState
            icon={<FileText className="h-6 w-6" aria-hidden />}
            title="Your final document arrives after lawyer review"
            body="Once your will is approved and issued, it will appear here with PDF and DOCX downloads plus the signing checklist. Lawyers can preview drafts from the review console."
            action={
              <Link
                href={`/app/status/${matter.id}`}
                className="rounded-full bg-eucalyptus px-5 py-2.5 text-sm font-bold text-paper hover:bg-moss"
              >
                Track progress
              </Link>
            }
          />
        </div>
      ) : isObserver ? null : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card className="p-8 sm:p-10" aria-label={`Rendered preview of ${doc.title}`}>
            <p className="rounded-lg bg-gold/15 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-widest text-[#7A5C14]">
              PROTOTYPE document — dummy data, not legal advice
            </p>
            <h2 className="mt-6 text-center font-display text-3xl font-semibold uppercase tracking-wide text-eucalyptus">
              Last Will and Testament
            </h2>
            <p className="mt-1 text-center font-display text-lg text-ink">of {doc.clientName}</p>
            <p className="mt-1 text-center text-xs text-ink/50">
              {doc.ref} · Issued {formatDateTime(matter.issuedAt)}
            </p>
            <p className="mt-4 rounded-xl bg-sand px-4 py-2.5 text-center text-xs text-ink/60 no-print">
              Hover any clause to see why it was included — generated from your answers via the clause bank.
            </p>
            <div className="mt-6">
              <DocPager pages={pages} />
            </div>
          </Card>

          <aside className="space-y-4">
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <ListChecks className="h-5 w-5 text-eucalyptus" aria-hidden /> Signing checklist
              </h2>
              <ol className="mt-4 space-y-3 text-sm text-ink/75">
                {SIGNING_CHECKLIST.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-eucalyptus/10 text-xs font-bold text-eucalyptus">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-ink/10 pt-3 text-xs text-ink/55">
                Legal source: s 10, Succession Act 1981 (Qld). A will that isn&rsquo;t signed correctly may
                be invalid.
              </p>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}


