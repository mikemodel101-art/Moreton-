"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CloudOff,
  HelpCircle,
  Loader2,
  LogOut,
  Mail,
} from "lucide-react";
import { saveAnswersAction, sendResumeLinkAction } from "@/lib/actions/client";
import { hardStopFor, validateQuestion } from "@/lib/validation";
import type { QuestionField } from "@/lib/config";
import type { AnswerValue } from "@/lib/types";
import { money } from "@/lib/engine";
import { Question } from "@/components/wizard";
import { AnimatedCheck, Callout, DirSlide, useToast } from "@/components/design-system";
import { ExecutorExplainer } from "@/components/field-extras";
import { FeedbackWidget } from "@/components/feedback-widget";
import { Button, cn } from "@/components/ui";

const UNSURE_TYPES = new Set(["text", "tel", "email", "date", "number", "select", "radio", "textarea"]);
const GENERIC_WHY =
  "Your lawyer uses this to make sure your will is right for your circumstances — nothing here is asked without a reason.";

type SaveState = "idle" | "saving" | "saved" | "error";

export function QuestionScreen({
  matterId,
  matterStatus,
  question,
  initialValue,
  position,
  prevHref,
  nextHref,
  reviewHref,
  exitHref,
  readOnly,
  dir,
  showExplainer,
  estateMidpoint,
  userTesting,
}: {
  matterId: string;
  matterStatus: string;
  question: QuestionField;
  initialValue: AnswerValue | undefined;
  position: { current: number; total: number; sectionTitle: string; sectionIndex: number; sectionCount: number };
  prevHref: string | null;
  nextHref: string | null;
  reviewHref: string;
  exitHref: string;
  readOnly: boolean;
  dir: 1 | -1;
  showExplainer?: boolean;
  estateMidpoint?: number;
  userTesting?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const reduce = useReducedMotion();
  const [value, setValue] = useState<AnswerValue | undefined>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [navBusy, setNavBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;

  const unsure = value === "unsure";
  const canUnsure = UNSURE_TYPES.has(question.type);
  const hardStop = hardStopFor(question, value);

  // Live, friendly guidance that mirrors the lawyer's triage rules
  const advisories: { tone: "info" | "warning" | "lawyer"; text: string }[] = [];
  if (question.id === "executorIssues" && Array.isArray(value)) {
    const v = value as string[];
    if (v.includes("overseas")) advisories.push({ tone: "lawyer", text: "An overseas executor is allowed, but probate and bank access get slower. Your lawyer will suggest adding someone local alongside them." });
    if (v.includes("bankrupt") || v.includes("capacity")) advisories.push({ tone: "lawyer", text: "A court can refuse to appoint someone bankrupt or unable to manage their affairs. Your lawyer will talk through alternatives — nothing is ruled out yet." });
  }
  if (question.id === "professionalExecutor" && ["firm", "trustee", "unsure"].includes(String(value))) {
    advisories.push({ tone: "info", text: "Noted — your lawyer will send a written fee quote before anything is finalised. Professional executors usually charge a percentage of the estate." });
  }
  if (question.id === "vulnerableBeneficiary" && (value === "yes" || value === "unsure")) {
    advisories.push({ tone: "lawyer", text: "A direct inheritance can reduce a pension or NDIS support. A protective trust usually solves it — your lawyer will explain the options." });
  }
  if (question.id === "excludingAnyone" && value === "yes") {
    advisories.push({ tone: "lawyer", text: "There's no judgement here. A lawyer will talk this through with you and record your reasons properly, which is the best protection for your wishes." });
  }
  if (question.id === "propertyOwnership" && ["tenants_in_common", "trust_or_company", "unsure"].includes(String(value))) {
    advisories.push({ tone: "info", text: "Good to know — your lawyer will check the title. How property is held decides whether it passes under your will at all." });
  }
  if (question.id === "backupRule" && value === "custom") {
    advisories.push({ tone: "info", text: "Custom survivorship wording is drafted by hand and confirmed back to you before approval." });
  }
  if (question.id === "organDonation" && value === "yes") {
    advisories.push({ tone: "warning", text: "Please also register on the Australian Organ Donor Register and tell your family — a will is usually read days after the decision is needed." });
  }
  if (question.id === "gifts" && Array.isArray(value)) {
    const items = value as Array<Record<string, unknown>>;
    const cash = items.filter((g) => g?.type === "cash").reduce((s, g) => s + (Number(g?.value) || 0), 0);
    if (items.some((g) => g?.type === "property")) advisories.push({ tone: "lawyer", text: "Gifting property needs care — your lawyer will confirm the title and whether any mortgage travels with the gift." });
    if (items.some((g) => g?.type === "digital")) advisories.push({ tone: "warning", text: "Digital and crypto gifts fail without access to the keys. Your lawyer will arrange a secure memorandum alongside your will." });
    if (items.some((g) => String(g?.condition ?? "").trim() !== "")) advisories.push({ tone: "info", text: "Conditional gifts are allowed, but some conditions can be void. Your lawyer will check this one is enforceable." });
    if (estateMidpoint && cash > estateMidpoint * 0.25) {
      advisories.push({ tone: "warning", text: `Your cash gifts total about ${money(cash)}, which is a sizeable portion of an estate around ${money(estateMidpoint)}. Gifts are paid before anything else — this could leave much less for the people in your residuary estate.` });
    }
  }

  const save = useCallback(() => {
    if (readOnly) return;
    setSaveState("saving");
    saveAnswersAction(matterId, { [question.id]: latest.current })
      .then((r) => setSaveState(r.ok ? "saved" : "error"))
      .catch(() => setSaveState("error"));
  }, [matterId, question.id, readOnly]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function change(v: AnswerValue) {
    setValue(v);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 400); // spec: debounced 400ms autosave
  }

  function proceed() {
    const err = validateQuestion(question, value);
    if (err) {
      setError(err);
      return;
    }
    if (hardStopFor(question, value)) return;
    setNavBusy(true);
    const go = () => router.push(nextHref ?? reviewHref);
    if (!readOnly) {
      if (timer.current) clearTimeout(timer.current);
      saveAnswersAction(matterId, { [question.id]: latest.current }).finally(go);
    } else go();
  }

  function saveAndExit(email: boolean) {
    if (timer.current) clearTimeout(timer.current);
    saveAnswersAction(matterId, { [question.id]: latest.current }).finally(async () => {
      if (email) {
        const r = await sendResumeLinkAction(matterId);
        if (r.ok) toast.push({ title: "Resume link ready", body: "Rendered as an email preview — check the mailbox.", tone: "success" });
      } else {
        toast.push({ title: "Progress saved", body: "Pick up wherever you left off, on any device.", tone: "success" });
      }
      router.push(exitHref);
      router.refresh();
    });
  }

  const pct = position.total > 1 ? Math.round(((position.current - 1) / position.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Compact progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs font-semibold text-ink/55">
          <span>
            <span className="font-bold text-eucalyptus">{position.sectionIndex + 1}/{position.sectionCount}</span> · {position.sectionTitle}
          </span>
          <span aria-live="polite">
            Question {position.current} of {position.total}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={position.current} aria-valuemin={0} aria-valuemax={position.total}>
          <motion.div className="h-full rounded-full bg-eucalyptus" initial={false} animate={{ width: `${Math.max(pct, 2)}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
        </div>
      </div>

      {showExplainer && (
        <div className="mb-5">
          <ExecutorExplainer />
        </div>
      )}

      <DirSlide k={question.id + String(position.current)} dir={dir}>
        <form
          className="rounded-3xl border border-ink/10 bg-paper p-6 card-shadow sm:p-9"
          onSubmit={(e) => {
            e.preventDefault();
            proceed();
          }}
        >
          <div className="min-h-[120px]">
            {unsure ? (
              <div className="rounded-2xl border-2 border-gold/40 bg-[#FFFBEC] px-5 py-6">
                <p className="text-sm font-semibold text-ink">{question.label}{question.required && <span className="ml-1 text-danger" aria-hidden>*</span>}</p>
                <p className="mt-2 text-sm text-ink/70">
                  Marked as <strong>“I'm not sure”</strong> — your lawyer will help you with this one.
                  <Button size="sm" variant="ghost" className="ml-2 align-middle" type="button" onClick={() => change("")}>Answer it instead</Button>
                </p>
              </div>
            ) : (
              <Question q={question} value={value} error={error} disabled={readOnly} onChange={change} />
            )}
          </div>

          {/* Hard stop — blocks continuing entirely */}
          {hardStop && (
            <div className="mt-4">
              <Callout tone="danger" title="We need to stop here">
                {hardStop}
              </Callout>
            </div>
          )}

          {/* Live, reassuring advisories mirroring the lawyer's triage rules */}
          {!hardStop && advisories.length > 0 && (
            <div className="mt-4 space-y-2.5">
              {advisories.map((a) => (
                <Callout key={a.text} tone={a.tone}>
                  {a.text}
                </Callout>
              ))}
            </div>
          )}

          {/* Soft nudge: tell your executors */}
          {question.id === "spokenToExecutors" && (value === "not_yet" || value === "no") && (
            <div className="mt-4">
              <Callout tone="info" title="A gentle nudge">
                Most people find the conversation easier than expected.{" "}
                <Link href="/extras/executor-contact" className="font-semibold text-eucalyptus underline underline-offset-2">
                  See how we can help you tell them
                </Link>{" "}
                — we can draft the message for you.
              </Callout>
            </div>
          )}

          {/* Why we ask + unsure */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <details className="group">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-fern hover:text-eucalyptus [&::-webkit-details-marker]:hidden">
                <HelpCircle className="h-3.5 w-3.5" aria-hidden /> Why we ask this
              </summary>
              <motion.p
                initial={reduce ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-2 max-w-lg text-xs leading-relaxed text-ink/60"
              >
                {question.why ?? GENERIC_WHY}
              </motion.p>
            </details>
            {canUnsure && !unsure && !readOnly && (
              <button type="button" onClick={() => change("unsure")} className="text-xs font-semibold text-ink/45 underline underline-offset-2 hover:text-eucalyptus">
                I'm not sure
              </button>
            )}
          </div>

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-ink/10 pt-5">
            {prevHref ? (
              <Link href={prevHref} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-eucalyptus hover:bg-eucalyptus/10">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </Link>
            ) : (
              <Link href={`/will?m=${matterId}`} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-eucalyptus hover:bg-eucalyptus/10">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
              </Link>
            )}
            <Button type="submit" loading={navBusy} disabled={!!hardStop}>
              {nextHref || !readOnly ? (nextHref ? "Continue" : "Review answers") : "Next"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </form>
      </DirSlide>

      {/* Save status + save & exit */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-h-6 items-center gap-2 text-xs" role="status" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {saveState === "saving" && (
              <motion.span key="s" className="flex items-center gap-1.5 text-ink/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Saving…
              </motion.span>
            )}
            {saveState === "saved" && (
              <motion.span key="d" className="flex items-center gap-1.5 font-semibold text-eucalyptus" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AnimatedCheck size={14} /> Saved just now
              </motion.span>
            )}
            {saveState === "error" && (
              <motion.span key="e" className="flex items-center gap-1.5 text-danger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CloudOff className="h-3.5 w-3.5" aria-hidden /> Will retry on next change
              </motion.span>
            )}
            {saveState === "idle" && !readOnly && <span className="text-ink/40">Autosaves 400ms after you stop typing</span>}
            {readOnly && <span className="text-ink/40">Read-only — {matterStatus.replace("_", " ")}</span>}
          </AnimatePresence>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => saveAndExit(false)} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink/60 hover:bg-paper">
              <LogOut className="h-3.5 w-3.5" aria-hidden /> Save &amp; exit
            </button>
            <button type="button" onClick={() => saveAndExit(true)} title="Sends an in-app email preview with your resume link" className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink/60 hover:bg-paper">
              <Mail className="h-3.5 w-3.5" aria-hidden /> Email resume link
            </button>
          </div>
        )}
      </div>

      {userTesting && (
        <FeedbackWidget matterId={matterId} questionId={question.id} questionLabel={question.label} />
      )}

      <p className={cn("mt-3 text-center text-xs text-ink/35", reduce && "sr-only")}>Tip: press Enter to continue</p>
    </div>
  );
}
