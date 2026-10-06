import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { clientOf, db, getActiveMatter } from "@/lib/store";
import { buildWillDocument } from "@/lib/clauseEngine";
import { GlossaryButton } from "@/components/extras";
import { LiveWillPreview } from "@/components/live-preview";
import { FLAGS } from "@/lib/config";
import { getSections } from "@/lib/config";
import { firstUnansweredPath, questionPath } from "@/lib/steps";
import { computeDerived } from "@/lib/engine";
import { QuestionScreen } from "@/components/question-screen";
import type { AnswerValue } from "@/lib/types";

export const metadata: Metadata = { title: "Question" };

export default async function QuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ step: string; questionId: string }>;
  searchParams: Promise<{ m?: string; back?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/will");
  const { step, questionId } = await params;
  const sp = await searchParams;
  const matter = getActiveMatter(user, sp.m);
  if (!matter) redirect("/start");

  const sections = getSections();
  const path = questionPath(sections, matter.answers);
  const m = `?m=${matter.id}`;

  const idx = path.findIndex((p) => p.section.id === step && p.question.id === questionId);
  if (idx === -1) {
    const next = firstUnansweredPath(sections, matter.answers);
    if (next) redirect(`/will/${next.section.id}/${next.question.id}${m}`);
    redirect(`/will${m}`);
  }

  const current = path[idx];
  const prev = idx > 0 ? path[idx - 1] : null;
  const next = idx < path.length - 1 ? path[idx + 1] : null;
  const visibleSections = [...new Set(path.map((p) => p.section.id))];
  const readOnly = user.role === "observer" || !["draft", "changes_requested"].includes(matter.status);

  const firstUnansweredIndex = path.findIndex((p) => {
    const v = matter.answers[p.question.id];
    return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
  });

  // Live preview — the document as it stands right now
  const doc = buildWillDocument(matter, clientOf(matter)!, db().clauses);
  const previewClauses = doc.sections.flatMap((s) =>
    s.clauses
      .filter((c) => c.texts.length > 0 && !c.disabled)
      .flatMap((c, ci) => c.texts.map((t, ti) => ({ id: `${c.clauseId}-${ci}-${ti}`, section: s.categoryTitle, text: t })))
  );

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href={`/will${m}`} className="font-display text-base font-semibold text-eucalyptus hover:underline">
            {matter.ref} — your will
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-semibold text-ink/50 sm:inline">
              {firstUnansweredIndex === -1
                ? "All questions answered"
                : `${firstUnansweredIndex} of ${path.length} answered`}
            </span>
            <GlossaryButton />
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 xl:grid-cols-[1fr_340px]">
        <QuestionScreen
          matterId={matter.id}
          matterStatus={matter.status}
          question={current.question}
          initialValue={matter.answers[current.question.id] as AnswerValue}
          position={{
            current: idx + 1,
            total: path.length,
            sectionTitle: current.section.title,
            sectionIndex: visibleSections.indexOf(current.section.id),
            sectionCount: visibleSections.length,
          }}
          prevHref={prev ? `/will/${prev.section.id}/${prev.question.id}${m}&back=1` : null}
          nextHref={next ? `/will/${next.section.id}/${next.question.id}${m}` : null}
          reviewHref={`/app/wizard/${matter.id}/review`}
          exitHref={`/will${m}`}
          readOnly={readOnly}
          dir={sp.back === "1" ? -1 : 1}
          showExplainer={current.section.id === "executors" && current.indexInSection === 0}
          estateMidpoint={computeDerived(matter.answers).estateMidpoint}
          userTesting={FLAGS.userTestingMode === true && !readOnly}
        />
        {FLAGS.livePreview && <LiveWillPreview clauses={previewClauses} draft={matter.status !== "issued"} />}
      </main>
    </div>
  );
}
