import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { canSeeMatter, getMatter } from "@/lib/store";
import { getSections } from "@/lib/config";
import {
  sectionVisible,
  visibleQuestions,
  validateAll,
  allHardStops,
} from "@/lib/validation";
import { Callout } from "@/components/design-system";
import { answerDisplay, repeaterRows } from "@/lib/format";
import { SubmitReview } from "@/components/submit-review";
import { FlagChip, Badge } from "@/components/ui";
import { checkConsistency, computeComplexity, evaluateFlags } from "@/lib/engine";
import { ConsistencyPanel } from "@/components/consistency-panel";
import { GlossaryButton } from "@/components/extras";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = { title: "Review answers" };

export default async function ReviewPage({ params }: { params: Promise<{ matterId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { matterId } = await params;
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(user, matter)) notFound();

  const sections = getSections().filter((s) => sectionVisible(s, matter.answers));
  const { errors } = validateAll(sections, matter.answers);
  const issueCount = Object.keys(errors).length;
  const draftFlags = evaluateFlags(matter.answers);
  const hardStops = allHardStops(matter.answers);
  const complexity = computeComplexity(draftFlags);
  const issues = checkConsistency(matter.answers);
  const editable = matter.status === "draft" || matter.status === "changes_requested";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/app/wizard/${matter.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to questionnaire
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">Final check</p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink">Review your answers</h1>
          <p className="mt-2 max-w-xl text-sm text-ink/60">
            This is exactly what your reviewing lawyer will see. Anything you change later is versioned
            and logged.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          {issueCount > 0 ? (
            <Badge tone="red">{issueCount} item{issueCount > 1 ? "s" : ""} need attention</Badge>
          ) : (
            <Badge tone="green">All answered</Badge>
          )}
          <GlossaryButton />
          <PrintButton />
        </div>
      </div>

      {hardStops.length > 0 && (
        <div className="mt-6 space-y-3">
          {hardStops.map((h) => (
            <Callout key={h.questionId} tone="danger" title="This needs changing before you can submit">
              {h.message}
            </Callout>
          ))}
        </div>
      )}

      <ConsistencyPanel issues={issues} matterId={matter.id} />

      {complexity.blocked && (
        <div className="mt-6 rounded-2xl border border-clay/40 bg-clay/8 px-5 py-4">
          <p className="font-display text-lg font-semibold text-ink">This one is best handled with a lawyer</p>
          <p className="mt-1 text-sm text-ink/70">
            Nothing is lost — we&rsquo;d just rather talk it through than hand you a form-built will.
          </p>
          <Link href={`/book-a-call?m=${matter.id}`} className="mt-3 inline-flex rounded-full bg-clay px-5 py-2.5 text-sm font-bold text-white hover:brightness-110">
            Book a call
          </Link>
        </div>
      )}

      {draftFlags.length > 0 && !complexity.blocked && (
        <div className="mt-6 rounded-2xl border border-gold/40 bg-[#FFF7E0] px-5 py-4 text-sm">
          <p className="font-bold text-ink">A lawyer will look at these points</p>
          <p className="mt-1 text-ink/70">
            Completely normal — it&rsquo;s the part of the service you&rsquo;re paying for. Your matter is
            currently assessed as <strong>{complexity.label}</strong>
            {complexity.routing === "senior-lawyer" ? ", so a senior lawyer will personally review it." : "."}
          </p>
          <ul className="mt-3 space-y-1.5 text-ink/75">
            {draftFlags
              .filter((f) => f.severity !== "info")
              .map((f) => (
                <li key={f.id}>· {f.clientMessage}</li>
              ))}
          </ul>
        </div>
      )}

      <div className="mt-8 space-y-5">
        {sections.map((s, sIdx) => (
          <section
            key={s.id}
            className="overflow-hidden rounded-2xl border border-ink/10 bg-paper card-shadow"
            aria-labelledby={`review-${s.id}`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink/10 bg-sand/70 px-5 py-3.5">
              <h2 id={`review-${s.id}`} className="font-display text-lg font-semibold text-ink">
                {sIdx + 1}. {s.title}
              </h2>
              {editable && (
                <Link
                  href={`/app/wizard/${matter.id}?s=${sIdx}`}
                  className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold text-ink/70 hover:bg-white"
                >
                  <Pencil className="h-3 w-3" aria-hidden /> EDIT
                </Link>
              )}
            </div>
            <dl className="divide-y divide-ink/5">
              {visibleQuestions(s, matter.answers).map((q) => {
                const err = errors[`${s.id}:${q.id}`] ?? errors[q.id];
                const rows = q.type === "repeater" ? repeaterRows(q, matter.answers[q.id]) : [];
                return (
                  <div key={q.id} className="px-5 py-3.5">
                    <dt className="text-xs font-bold uppercase tracking-wide text-fern">{q.label}</dt>
                    <dd className={`mt-1 text-sm ${err ? "font-semibold text-danger" : "text-ink"}`}>
                      {q.type === "repeater" ? (
                        rows.length === 0 ? (
                          "—"
                        ) : (
                          <ul className="space-y-1.5">
                            {rows.map((r, i) => (
                              <li key={i}>
                                <span className="font-semibold">{r.label}</span>
                                {r.value && <span className="text-ink/60"> — {r.value}</span>}
                              </li>
                            ))}
                          </ul>
                        )
                      ) : (
                        answerDisplay(q, matter.answers[q.id])
                      )}
                    </dd>
                    {err && (
                      <p role="alert" className="mt-1 text-xs font-semibold text-danger">
                        {err}
                      </p>
                    )}
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>

      <SubmitReview
        matterId={matter.id}
        status={matter.status}
        issueCount={issueCount}
        readOnly={user.role === "observer" || !editable}
      />
    </div>
  );
}
