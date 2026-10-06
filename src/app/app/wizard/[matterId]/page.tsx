import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { canSeeMatter, getMatter, lawyerOf } from "@/lib/store";
import { getSections } from "@/lib/config";
import { Wizard } from "@/components/wizard";

export const metadata: Metadata = { title: "Questionnaire" };

export default async function WizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ matterId: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { matterId } = await params;
  const sp = await searchParams;
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(user, matter)) notFound();

  const sections = getSections();
  const editable = matter.status === "draft" || matter.status === "changes_requested";
  const readOnly = user.role === "observer" || !editable;
  const startSection = Math.max(0, parseInt(sp.s ?? "0", 10) || 0);
  const lawyer = lawyerOf(matter);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
        </Link>
        <div className="text-right text-xs text-ink/55">
          <p className="font-semibold text-ink/80">{matter.ref}</p>
          {lawyer && <p>Assigned lawyer: {lawyer.name}</p>}
        </div>
      </div>

      {matter.status === "changes_requested" && (
        <div className="mb-6 rounded-2xl border border-clay/30 bg-clay/10 px-5 py-4 text-sm text-ink">
          <p className="font-bold text-clay">Your lawyer has requested changes</p>
          <p className="mt-1 text-ink/70">
            Update the highlighted answers below, then resubmit from the review step. Your payment is
            already received — there is nothing more to pay.
          </p>
        </div>
      )}
      {!editable && user.role !== "observer" && (
        <div className="mb-6 rounded-2xl border border-sky/40 bg-sky/15 px-5 py-4 text-sm text-ink">
          <p className="font-bold text-eucalyptus">Answers are locked</p>
          <p className="mt-1 text-ink/70">
            Your will is with the lawyer. If you need to change something, send a message from the{" "}
            <Link className="font-semibold underline" href={`/app/messages/${matter.id}`}>
              messages page
            </Link>
            .
          </p>
        </div>
      )}

      <Wizard
        matter={{ id: matter.id, ref: matter.ref, status: matter.status }}
        sections={sections}
        initialAnswers={matter.answers}
        readOnly={readOnly}
        startSection={startSection}
      />
    </div>
  );
}
