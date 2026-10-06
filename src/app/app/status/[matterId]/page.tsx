import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  FileText,
  Gavel,
  MessageSquareText,
  PenLine,
  StampIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { canSeeMatter, clientOf, db, getMatter, lawyerOf } from "@/lib/store";
import { formatDateTime, money } from "@/lib/engine";
import { Card, FlagChip, StatusPill, cn } from "@/components/ui";

export const metadata: Metadata = { title: "Matter status" };

interface Step {
  key: string;
  label: string;
  icon: typeof FileText;
  when: string | null;
  state: "done" | "current" | "upcoming" | "attention";
  note?: string;
}

export default async function StatusPage({ params }: { params: Promise<{ matterId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { matterId } = await params;
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(user, matter)) notFound();

  const client = clientOf(matter)!;
  const lawyer = lawyerOf(matter);
  const plan = db().plans.find((p) => p.id === matter.planId)!;
  const isObserver = user.role === "observer";

  const order: string[] = ["draft", "awaiting_payment", "in_review", "approved", "issued"];
  const currentIdx = matter.status === "changes_requested" ? 2 : order.indexOf(matter.status);

  const steps: Step[] = [
    {
      key: "questionnaire",
      label: "Questionnaire",
      icon: PenLine,
      when: matter.submittedAt,
      state: matter.submittedAt ? "done" : matter.status === "draft" ? "current" : "done",
      note: matter.status === "draft" ? "Finish all sections and review your answers." : "Completed",
    },
    {
      key: "payment",
      label: "Payment",
      icon: CreditCard,
      when: matter.paidAt,
      state: matter.paidAt ? "done" : matter.status === "awaiting_payment" ? "current" : matter.status === "draft" ? "upcoming" : "done",
      note: matter.payment
        ? `${plan.name} — ${money(matter.payment.total)}${matter.payment.promoCode ? ` (${matter.payment.promoCode})` : ""}`
        : `${plan.name} — ${money(plan.price)}`,
    },
    {
      key: "review",
      label: "Lawyer review",
      icon: Gavel,
      when: matter.status === "changes_requested" ? matter.updatedAt : matter.approvedAt,
      state:
        matter.status === "changes_requested"
          ? "attention"
          : ["approved", "issued"].includes(matter.status)
            ? "done"
            : matter.status === "in_review"
              ? "current"
              : "upcoming",
      note:
        matter.status === "changes_requested"
          ? "Your lawyer needs a change — see messages."
          : matter.status === "in_review"
            ? lawyer
              ? `${lawyer.name} is reviewing (round ${matter.reviewRound}).`
              : "Waiting for a lawyer to pick this up."
            : ["approved", "issued"].includes(matter.status)
              ? "Review passed."
              : "",
    },
    {
      key: "approval",
      label: "Approval",
      icon: StampIcon,
      when: matter.approvedAt,
      state: matter.approvedAt ? "done" : matter.status === "in_review" ? "upcoming" : "upcoming",
      note: matter.pendingSignOff
        ? "Awaiting Senior Lawyer sign-off (triage flags)."
        : matter.signedOffBy
          ? "Including Senior Lawyer sign-off."
          : undefined,
    },
    {
      key: "issue",
      label: "Issued & ready to sign",
      icon: FileText,
      when: matter.issuedAt,
      state: matter.status === "issued" ? "done" : "upcoming",
      note: matter.status === "issued" ? "Download your will and follow the signing checklist." : "",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/app" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">{matter.ref}</p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
            {client.name.split(" ")[0]}&rsquo;s will
          </h1>
        </div>
        <StatusPill status={matter.status} />
      </div>

      {matter.flags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Triage flags under review">
          {matter.flags.map((f) => (
            <FlagChip key={f.id} flag={f} />
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* Timeline */}
        <Card className="p-7">
          <h2 className="font-display text-xl font-semibold text-ink">Progress</h2>
          <ol className="mt-6 space-y-0">
            {steps.map((s, i) => {
              const last = i === steps.length - 1;
              return (
                <li key={s.key} className="relative flex gap-4 pb-8 last:pb-0">
                  {!last && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-[19px] top-10 h-full w-0.5",
                        s.state === "done" ? "bg-eucalyptus" : "bg-ink/10"
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
                      s.state === "done" && "border-eucalyptus bg-eucalyptus text-paper",
                      s.state === "current" && "border-gold bg-gold/15 text-[#7A5C14]",
                      s.state === "attention" && "border-clay bg-clay/10 text-clay",
                      s.state === "upcoming" && "border-ink/15 bg-paper text-ink/35"
                    )}
                    aria-hidden
                  >
                    {s.state === "done" ? <CheckCircle2 className="h-5 w-5" /> : s.state === "attention" ? <CircleAlert className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 pt-1.5">
                    <p className={cn("font-semibold", s.state === "upcoming" ? "text-ink/45" : "text-ink")}>
                      {s.label}
                      {s.when && <span className="ml-2 text-xs font-normal text-ink/50">{formatDateTime(s.when)}</span>}
                    </p>
                    {s.note && <p className="mt-0.5 text-sm text-ink/60">{s.note}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Next step</h2>
            <div className="mt-3 space-y-2.5 text-sm">
              {matter.status === "draft" && (
                <Link href={`/app/wizard/${matter.id}`} className="flex items-center justify-between rounded-2xl bg-eucalyptus px-5 py-3.5 font-bold text-paper hover:bg-moss">
                  Continue questionnaire <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              {matter.status === "awaiting_payment" && (
                <Link href={`/app/pay/${matter.id}`} className="flex items-center justify-between rounded-2xl bg-eucalyptus px-5 py-3.5 font-bold text-paper hover:bg-moss">
                  Pay {money(plan.price)} securely <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              {matter.status === "changes_requested" && !isObserver && (
                <Link href={`/app/wizard/${matter.id}`} className="flex items-center justify-between rounded-2xl bg-clay px-5 py-3.5 font-bold text-white hover:brightness-110">
                  Update my answers <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              {matter.status === "in_review" && (
                <p className="rounded-2xl bg-sand px-5 py-3.5 text-ink/70">
                  Nothing for you to do — your lawyer will message you if anything needs clarifying.
                  Typical turnaround is 2–3 business days.
                </p>
              )}
              {matter.status === "approved" && (
                <p className="rounded-2xl bg-sand px-5 py-3.5 text-ink/70">
                  Approved — being prepared for issue. You&rsquo;ll get an email preview when it&rsquo;s
                  ready.
                </p>
              )}
              {matter.status === "issued" && (
                <Link href={`/app/documents/${matter.id}`} className="flex items-center justify-between rounded-2xl bg-eucalyptus px-5 py-3.5 font-bold text-paper hover:bg-moss">
                  View &amp; download will <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              {!isObserver && (
                <Link href={`/app/messages/${matter.id}`} className="flex items-center justify-between rounded-2xl border border-ink/15 px-5 py-3.5 font-semibold text-ink/70 hover:bg-sand">
                  Message your lawyer <MessageSquareText className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink/55">Plan</dt>
                <dd className="font-semibold text-ink">{plan.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/55">Assigned lawyer</dt>
                <dd className="font-semibold text-ink">{lawyer ? lawyer.name : "Being assigned"}</dd>
              </div>
              {matter.payment && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink/55">Paid</dt>
                  <dd className="font-semibold text-ink">
                    {money(matter.payment.total)}
                    {matter.payment.promoCode && (
                      <span className="ml-1 text-xs font-normal text-eucalyptus">({matter.payment.promoCode})</span>
                    )}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink/55">Review round</dt>
                <dd className="font-semibold text-ink">{matter.reviewRound}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
