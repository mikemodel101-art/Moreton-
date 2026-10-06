"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CreditCard,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  WifiOff,
} from "lucide-react";
import { saveAnswersAction } from "@/lib/actions/client";
import {
  sectionCompletion,
  sectionVisible,
  validateSection,
  visibleQuestions,
  type ErrorMap,
} from "@/lib/validation";
import type { QuestionField, Section } from "@/lib/config";
import type { Answers, AnswerValue, MatterStatus } from "@/lib/types";
import { Button, FieldShell, Input, Select, Textarea, cn } from "@/components/ui";
import {
  AnimatedCheck,
  Callout,
  CompletionOverlay,
  CompletionRing,
  CountUp,
  DirSlide,
  PercentAllocator,
  useOnline,
  useToast,
} from "@/components/design-system";
import { AbnLookup, CurrencyInput } from "@/components/field-extras";

const AUS_STATES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"];
const AUTOSAVE_MS = 900;

interface WizardProps {
  matter: { id: string; ref: string; status: MatterStatus };
  sections: Section[];
  initialAnswers: Answers;
  readOnly: boolean;
  startSection: number;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function Wizard({ matter, sections, initialAnswers, readOnly, startSection }: WizardProps) {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [idx, setIdx] = useState(Math.min(startSection, sections.length - 1));
  const [dir, setDir] = useState<1 | -1>(1);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [offlineQueue, setOfflineQueue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const reduce = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(answers);
  latest.current = answers;
  const topRef = useRef<HTMLDivElement>(null);
  const prevPct = useRef(0);

  const visible = useMemo(() => sections.filter((s) => sectionVisible(s, answers)), [sections, answers]);
  const section = visible[Math.min(idx, visible.length - 1)];
  const pct = useMemo(() => sectionCompletion(sections, answers), [sections, answers]);
  const completionKey = `mgw-complete-${matter.id}`;

  // Trigger the calm completion screen the first time everything is answered
  useEffect(() => {
    if (readOnly) return;
    try {
      const seen = sessionStorage.getItem(completionKey);
      if (pct === 100 && !seen && prevPct.current < 100 && matter.status === "draft") {
        sessionStorage.setItem(completionKey, "1");
        setCelebrate(true);
      }
    } catch {
      /* storage unavailable */
    }
    prevPct.current = pct;
  }, [pct, completionKey, matter.status, readOnly]);

  const doneSections = useMemo(
    () =>
      visible.map((s) => {
        const errs = validateSection(s, answers);
        const qs = visibleQuestions(s, answers);
        return (
          qs.length > 0 &&
          Object.keys(errs).length === 0 &&
          qs.every((q) => {
            const v = answers[q.id];
            return !(
              v === undefined ||
              v === null ||
              v === "" ||
              (Array.isArray(v) && v.length === 0) ||
              (q.type === "consent" && v !== true)
            );
          })
        );
      }),
    [visible, answers]
  );

  const save = useCallback(() => {
    if (readOnly) return;
    if (!online) {
      setOfflineQueue(true);
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    saveAnswersAction(matter.id, latest.current).then((r) => {
      setSaveState(r.ok ? "saved" : "error");
    });
  }, [matter.id, online, readOnly]);

  // Flush when the connection returns
  useEffect(() => {
    if (online && offlineQueue) {
      setOfflineQueue(false);
      save();
    }
  }, [online, offlineQueue, save]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function update(id: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, AUTOSAVE_MS);
  }

  function goTo(i: number) {
    setDir(i < idx ? -1 : 1);
    if (timer.current) {
      clearTimeout(timer.current);
      save();
    }
    setIdx(i);
    setErrors({});
    topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function next() {
    const errs = validateSection(section, answers);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      return;
    }
    if (idx >= visible.length - 1) {
      setSubmitting(true);
      if (timer.current) clearTimeout(timer.current);
      saveAnswersAction(matter.id, latest.current).finally(() => {
        router.push(`/app/wizard/${matter.id}/review`);
      });
      return;
    }
    toast.push({ title: "Step complete", body: `${section.title} — saved.`, tone: "success" });
    goTo(idx + 1);
  }

  const railFill = visible.length > 1 ? (doneSections.filter(Boolean).length / visible.length) * 100 : 0;

  return (
    <div ref={topRef} className="grid gap-6 lg:grid-cols-[260px_1fr]" id="wizard">
      <CompletionOverlay
        open={celebrate}
        title="That's everything answered"
        body="Nicely done. Take a breath — the next screen shows everything you'll send to the lawyer, and nothing is submitted until you say so."
        ctaLabel="Review my answers"
        onCta={() => {
          setCelebrate(false);
          router.push(`/app/wizard/${matter.id}/review`);
        }}
      />

      {/* Step rail — rings + animated fill (desktop) / compact bar (mobile) */}
      <aside aria-label="Questionnaire sections">
        <div className="rounded-2xl border border-ink/10 bg-paper p-4 card-shadow lg:sticky lg:top-24">
          <div className="lg:hidden">
            <div className="flex items-center justify-between text-xs font-semibold text-ink/60">
              <span>{matter.ref} — progress</span>
              <CountUp value={pct} format={(v) => `${Math.round(v)}%`} className="font-bold text-eucalyptus" />
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <motion.div className="h-full rounded-full bg-eucalyptus" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
            </div>
          </div>

          <div className="relative mt-1 hidden lg:block">
            <span aria-hidden className="absolute bottom-4 left-[10px] top-4 w-0.5 bg-ink/10" />
            <motion.span
              aria-hidden
              className="absolute left-[10px] top-4 w-0.5 origin-top bg-eucalyptus"
              initial={false}
              animate={{ height: `calc(${Math.min(railFill, 100)}% * 0.9)` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            <ol className="relative space-y-0.5">
              {visible.map((s, i) => {
                const active = i === idx;
                const done = doneSections[i];
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors",
                        active ? "bg-eucalyptus font-semibold text-paper" : "text-ink/70 hover:bg-sand"
                      )}
                    >
                      <span className={cn(active && "[&_.stroke-eucalyptus]:stroke-paper [&_*]:!text-paper")}>
                        <CompletionRing done={done && !active} current={active} size={21} />
                      </span>
                      <span className="leading-tight">{s.title}</span>
                    </button>
                  </li>
                );
              })}
              <li>
                <div className="flex items-center gap-3 px-2 py-2 text-sm text-ink/45">
                  <span className="flex h-[21px] w-[21px] items-center justify-center rounded-full bg-ink/10" aria-hidden>
                    <CreditCard className="h-3 w-3 text-ink/45" />
                  </span>
                  Review &amp; payment
                </div>
              </li>
            </ol>
          </div>

          {/* Autosave indicator with tick morph + offline state */}
          <div className="mt-4 flex min-h-6 items-center gap-2 border-t border-ink/10 pt-3 text-xs" role="status" aria-live="polite">
            {!online ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-gold" aria-hidden />
                <span className="font-semibold text-[#7A5C14]">You&rsquo;re offline — will save when you&rsquo;re back online</span>
              </>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                {saveState === "saving" && (
                  <motion.span key="saving" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-fern" aria-hidden /> Saving…
                  </motion.span>
                )}
                {saveState === "saved" && (
                  <motion.span key="saved" className="flex items-center gap-1.5 font-semibold text-eucalyptus" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <AnimatedCheck size={15} /> Saved just now
                  </motion.span>
                )}
                {saveState === "idle" && !readOnly && (
                  <motion.span key="idle" className="text-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Autosave is on
                  </motion.span>
                )}
                {saveState === "error" && (
                  <motion.span key="error" className="flex items-center gap-2 text-danger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <CircleAlert className="h-3.5 w-3.5" aria-hidden /> Save failed — retrying on next change
                  </motion.span>
                )}
                {readOnly && (
                  <motion.span key="ro" className="text-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Read-only view
                  </motion.span>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </aside>

      {/* Current section — direction-aware slide */}
      <div className="min-w-0">
        <DirSlide k={section.id + idx} dir={dir}>
          <section className="rounded-3xl border border-ink/10 bg-paper p-6 card-shadow sm:p-8" aria-labelledby="section-title">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">
              Section {idx + 1} of {visible.length}
            </p>
            <h2 id="section-title" className="mt-1 font-display text-3xl font-semibold text-ink">
              {section.title}
            </h2>
            {section.intro && <p className="mt-2 text-sm leading-relaxed text-ink/60">{section.intro}</p>}

            <div className="mt-7">
              <AnimatePresence initial={false} mode="popLayout">
                {visibleQuestions(section, answers).map((q) => (
                  <motion.div
                    key={q.id}
                    layout={!reduce}
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduce ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pb-7">
                      <Question
                        q={q}
                        value={answers[q.id]}
                        error={errors[q.id] ?? null}
                        disabled={readOnly}
                        onChange={(v) => update(q.id, v)}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-ink/10 pt-6">
              <Button type="button" variant="ghost" onClick={() => goTo(Math.max(0, idx - 1))} disabled={idx === 0 || submitting}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </Button>
              {!readOnly ? (
                <Button type="button" onClick={next} loading={submitting}>
                  {idx >= visible.length - 1 ? "Review answers" : "Continue"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button type="button" onClick={() => (idx >= visible.length - 1 ? router.push(`/app/wizard/${matter.id}/review`) : goTo(idx + 1))}>
                  {idx >= visible.length - 1 ? "See review" : "Next section"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          </section>
        </DirSlide>
      </div>
    </div>
  );
}

/* ============================ Question ============================ */

export function Question({
  q,
  value,
  error,
  disabled,
  onChange,
  prefix = "",
}: {
  q: QuestionField;
  value: AnswerValue | undefined;
  error: string | null;
  disabled: boolean;
  onChange: (v: AnswerValue) => void;
  prefix?: string;
}) {
  const id = `${prefix}${q.id}`;
  const invalid = !!error;

  if (q.type === "radio") {
    return (
      <fieldset aria-invalid={invalid} aria-describedby={error ? `${id}-error` : undefined}>
        <legend className="mb-2.5 text-sm font-semibold text-ink">
          {q.label}
          {q.required && <span className="ml-1 text-danger" aria-hidden>*</span>}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(q.options ?? []).map((opt) => {
            const checked = value === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-medium transition-colors",
                  checked ? "border-eucalyptus bg-eucalyptus/8 text-ink" : "border-ink/12 bg-white text-ink/75 hover:border-ink/25",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                <input type="radio" name={id} value={opt.value} checked={checked} disabled={disabled} onChange={() => onChange(opt.value)} className="h-4 w-4 accent-eucalyptus" />
                {opt.label}
              </label>
            );
          })}
        </div>
        {q.help && !error && <p className="mt-2 text-xs leading-relaxed text-ink/55">{q.help}</p>}
        {error && <ErrorText id={`${id}-error`} message={error} />}
      </fieldset>
    );
  }

  if (q.type === "checkbox") {
    return (
      <div>
        <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-medium", value === true ? "border-eucalyptus bg-eucalyptus/8" : "border-ink/12 bg-white", disabled && "cursor-not-allowed opacity-60")}>
          <input type="checkbox" checked={value === true} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-eucalyptus" aria-describedby={error ? `${id}-error` : undefined} />
          {q.label}
        </label>
        {error && <ErrorText id={`${id}-error`} message={error} />}
      </div>
    );
  }

  if (q.type === "consent") {
    return (
      <div>
        <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-sm font-medium leading-relaxed", value === true ? "border-eucalyptus bg-eucalyptus/8" : invalid ? "border-danger bg-danger/5" : "border-gold/40 bg-[#FFFBEC]", disabled && "cursor-not-allowed opacity-60")}>
          <input type="checkbox" checked={value === true} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-eucalyptus" aria-describedby={error ? `${id}-error` : undefined} />
          <span className="font-semibold">{q.label}</span>
        </label>
        {error && <ErrorText id={`${id}-error`} message={error} />}
      </div>
    );
  }

  if (q.type === "checkboxes") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset aria-invalid={invalid}>
        <legend className="mb-2.5 text-sm font-semibold text-ink">
          {q.label}
          {q.required && <span className="ml-1 text-danger" aria-hidden>*</span>}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(q.options ?? []).map((opt) => {
            const checked = arr.includes(opt.value);
            return (
              <label key={opt.value} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-medium transition-colors", checked ? "border-eucalyptus bg-eucalyptus/8" : "border-ink/12 bg-white hover:border-ink/25", disabled && "cursor-not-allowed opacity-60")}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => onChange(e.target.checked ? [...arr, opt.value] : arr.filter((v) => v !== opt.value))}
                  className="h-4 w-4 accent-eucalyptus"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
        {q.help && !error && <p className="mt-2 text-xs leading-relaxed text-ink/55">{q.help}</p>}
        {error && <ErrorText id={`${id}-error`} message={error} />}
      </fieldset>
    );
  }

  if (q.type === "select") {
    return (
      <FieldShell label={q.label} htmlFor={id} help={q.help} error={error} required={q.required}>
        <Select id={id} value={(value as string) ?? ""} disabled={disabled} aria-invalid={invalid} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(q.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </FieldShell>
    );
  }

  if (q.type === "textarea") {
    return (
      <FieldShell label={q.label} htmlFor={id} help={q.help} error={error} required={q.required}>
        <Textarea id={id} value={(value as string) ?? ""} disabled={disabled} aria-invalid={invalid} placeholder={q.placeholder} maxLength={q.maxLength} onChange={(e) => onChange(e.target.value)} />
      </FieldShell>
    );
  }

  if (q.type === "currency") {
    return (
      <FieldShell label={q.label} htmlFor={id} help={q.help} error={error} required={q.required}>
        <CurrencyInput
          id={id}
          value={value as number | string | undefined}
          disabled={disabled}
          invalid={invalid}
          onChange={(v) => onChange(v === "" ? "" : v)}
        />
      </FieldShell>
    );
  }

  if (q.type === "abn") {
    return (
      <FieldShell label={q.label} htmlFor={id} help={q.help} error={error} required={q.required}>
        <AbnLookup id={id} value={(value as string) ?? ""} disabled={disabled} onChange={(v) => onChange(v)} />
      </FieldShell>
    );
  }

  if (["date", "text", "tel", "email", "number", "percentage"].includes(q.type)) {
    const typeMap: Record<string, string> = { text: "text", tel: "tel", email: "email", number: "number", percentage: "number", date: "date" };
    return (
      <FieldShell label={q.label} htmlFor={id} help={q.help} error={error} required={q.required}>
        <Input
          id={id}
          type={typeMap[q.type]}
          value={(value as string | number) ?? ""}
          disabled={disabled}
          aria-invalid={invalid}
          placeholder={q.placeholder}
          maxLength={q.maxLength}
          min={q.type === "number" ? q.min : undefined}
          max={q.type === "number" ? q.max : undefined}
          autoComplete={q.type === "tel" ? "tel" : q.type === "email" ? "email" : "off"}
          onChange={(e) => onChange(q.type === "number" ? Number(e.target.value) : e.target.value)}
        />
      </FieldShell>
    );
  }

  if (q.type === "address") {
    const a = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Partial<{ street: string; suburb: string; state: string; postcode: string }>;
    const setPart = (k: string, v: string) => onChange({ street: "", suburb: "", state: "QLD", postcode: "", ...a, [k]: v });
    return (
      <fieldset aria-invalid={invalid} aria-describedby={error ? `${id}-error` : undefined}>
        <legend className="mb-2.5 text-sm font-semibold text-ink">
          {q.label}
          {q.required && <span className="ml-1 text-danger" aria-hidden>*</span>}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-street`} className="mb-1 block text-xs font-semibold text-ink/60">Street address</label>
            <Input id={`${id}-street`} value={a.street ?? ""} disabled={disabled} onChange={(e) => setPart("street", e.target.value)} placeholder="12 Example Street" autoComplete="street-address" />
          </div>
          <div>
            <label htmlFor={`${id}-suburb`} className="mb-1 block text-xs font-semibold text-ink/60">Suburb</label>
            <Input id={`${id}-suburb`} value={a.suburb ?? ""} disabled={disabled} onChange={(e) => setPart("suburb", e.target.value)} placeholder="Paddington" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-state`} className="mb-1 block text-xs font-semibold text-ink/60">State</label>
              <Select id={`${id}-state`} value={a.state ?? "QLD"} disabled={disabled} onChange={(e) => setPart("state", e.target.value)}>
                {AUS_STATES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label htmlFor={`${id}-postcode`} className="mb-1 block text-xs font-semibold text-ink/60">Postcode</label>
              <Input id={`${id}-postcode`} value={a.postcode ?? ""} disabled={disabled} onChange={(e) => setPart("postcode", e.target.value)} placeholder="4064" inputMode="numeric" autoComplete="postal-code" />
            </div>
          </div>
        </div>
        {error && <ErrorText id={`${id}-error`} message={error} />}
      </fieldset>
    );
  }

  if (q.type === "repeater") {
    return <Repeater q={q} value={value} error={error} disabled={disabled} onChange={onChange} />;
  }

  return null;
}

/* ============================ Repeater (drag-reorder + allocator) ============================ */

function Repeater({
  q,
  value,
  error,
  disabled,
  onChange,
}: {
  q: QuestionField;
  value: AnswerValue | undefined;
  error: string | null;
  disabled: boolean;
  onChange: (v: AnswerValue) => void;
}) {
  const items = Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  const canAdd = !q.maxItems || items.length < q.maxItems;
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function setItem(i: number, field: string, v: unknown) {
    const next = items.slice();
    next[i] = { ...next[i], [field]: v };
    onChange(next);
  }
  function move(from: number, to: number) {
    const next = items.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  }

  const allocated = q.mustTotal !== undefined && q.totalField;

  return (
    <fieldset aria-invalid={!!error} aria-describedby={error ? `${q.id}-error` : undefined}>
      <legend className="mb-2.5 text-sm font-semibold text-ink">
        {q.label}
        {q.required && <span className="ml-1 text-danger" aria-hidden>*</span>}
      </legend>
      {q.help && <p className="-mt-1 mb-3 text-xs leading-relaxed text-ink/55">{q.help}</p>}

      {items.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-ink/15 bg-white px-4 py-6 text-center text-sm text-ink/55">
          Nothing added yet — use the button below.
        </p>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              draggable={!disabled && items.length > 1}
              onDragStart={() => setDragIdx(i)}
              onDragEnd={() => setDragIdx(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx !== null && dragIdx !== i) move(dragIdx, i);
                setDragIdx(null);
              }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className={cn("rounded-2xl border border-ink/12 bg-white p-4", dragIdx === i && "opacity-60")}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-fern">
                  {items.length > 1 && !disabled && <GripVertical className="h-3.5 w-3.5 cursor-grab text-ink/30" aria-label="Drag to reorder" />}
                  {q.label.replace(/s$/, "")} {i + 1}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const next = items.slice();
                    next.splice(i, 1);
                    onChange(next);
                  }}
                  disabled={disabled}
                  aria-label={`Remove item ${i + 1}`}
                  className="rounded-full p-1.5 text-ink/40 hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(q.fields ?? [])
                  .filter((f) => !(allocated && f.id === q.totalField))
                  .map((f) => {
                    if (f.type === "checkbox") {
                      return (
                        <label key={f.id} className="flex items-center gap-2.5 text-sm text-ink/80 sm:col-span-2">
                          <input type="checkbox" checked={item[f.id] === true} disabled={disabled} onChange={(e) => setItem(i, f.id, e.target.checked)} className="h-4 w-4 accent-eucalyptus" />
                          {f.label}
                        </label>
                      );
                    }
                    if (f.type === "select") {
                      return (
                        <div key={f.id}>
                          <label htmlFor={`${q.id}-${i}-${f.id}`} className="mb-1 block text-xs font-semibold text-ink/60">
                            {f.label}
                            {f.required && <span className="text-danger"> *</span>}
                          </label>
                          <Select id={`${q.id}-${i}-${f.id}`} value={(item[f.id] as string) ?? ""} disabled={disabled} onChange={(e) => setItem(i, f.id, e.target.value)}>
                            <option value="">Select…</option>
                            {(f.options ?? []).map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </Select>
                        </div>
                      );
                    }
                    if (f.type === "currency") {
                      return (
                        <div key={f.id}>
                          <label htmlFor={`${q.id}-${i}-${f.id}`} className="mb-1 block text-xs font-semibold text-ink/60">
                            {f.label}
                            {f.required && <span className="text-danger"> *</span>}
                          </label>
                          <CurrencyInput
                            id={`${q.id}-${i}-${f.id}`}
                            value={item[f.id] as number | string | undefined}
                            disabled={disabled}
                            onChange={(v) => setItem(i, f.id, v)}
                          />
                        </div>
                      );
                    }
                    if (f.type === "abn") {
                      if (item.kind && item.kind !== "charity") return null;
                      return (
                        <div key={f.id} className="sm:col-span-2">
                          <label htmlFor={`${q.id}-${i}-${f.id}`} className="mb-1 block text-xs font-semibold text-ink/60">
                            {f.label}
                          </label>
                          <AbnLookup
                            id={`${q.id}-${i}-${f.id}`}
                            value={(item[f.id] as string) ?? ""}
                            disabled={disabled}
                            onChange={(v) => setItem(i, f.id, v)}
                            onPickName={(name) => setItem(i, "name", name)}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={f.id} className={f.id === "description" || f.id === "address" || f.id === "message" ? "sm:col-span-2" : undefined}>
                        <label htmlFor={`${q.id}-${i}-${f.id}`} className="mb-1 block text-xs font-semibold text-ink/60">
                          {f.label}
                          {f.required && <span className="text-danger"> *</span>}
                        </label>
                        <Input
                          id={`${q.id}-${i}-${f.id}`}
                          type={f.type === "date" ? "date" : f.type === "number" ? "number" : f.type === "tel" ? "tel" : f.type === "email" ? "email" : "text"}
                          value={(item[f.id] as string | number) ?? ""}
                          disabled={disabled}
                          placeholder={f.placeholder}
                          onChange={(e) => setItem(i, f.id, f.type === "number" ? Number(e.target.value) : e.target.value)}
                        />
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { ...(q.itemDefaults ?? {}) }])} disabled={disabled || !canAdd} className="mt-3">
        <Plus className="h-4 w-4" aria-hidden /> {q.addLabel ?? "Add another"}
      </Button>

      {allocated && items.length > 0 && (
        <div className="mt-5 rounded-2xl border-2 border-eucalyptus/15 bg-eucalyptus/5 p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-eucalyptus">Allocate shares with the sliders — total must be exactly 100%</p>
          <PercentAllocator
            items={items.map((it, i) => ({
              id: String(i),
              label: String(it.name ?? "") || `Beneficiary ${i + 1}`,
              sub: String(it.relationship ?? ""),
              value: Number(it[q.totalField!]) || 0,
            }))}
            onChange={(id, v) => setItem(Number(id), q.totalField!, v)}
          />
        </div>
      )}
      {error && <ErrorText id={`${q.id}-error`} message={error} />}
    </fieldset>
  );
}

function ErrorText({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-danger">
      <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden /> {message}
    </p>
  );
}
