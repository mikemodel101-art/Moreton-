"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Accessibility, ArrowRight, Bell, BookOpen, ChevronDown, Contrast, Lightbulb, Minus,
  Moon, Pause, Plus, Search, Sun, Type, Volume2, X,
} from "lucide-react";
import glossary from "../../config/glossary.json";
import { Badge, Button, Card, Input, cn } from "@/components/ui";
import { CountUp, Donut, Drawer } from "@/components/design-system";
import { money } from "@/lib/engine";
import type { NextAction, Nudge, SnapshotSlice } from "@/lib/readiness";

/* ====================== 1 · READINESS RING ====================== */

export function ReadinessRing({
  score,
  band,
  nextActions,
  matterId,
  size = 150,
}: {
  score: number;
  band: string;
  nextActions: NextAction[];
  matterId: string;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const r = (size - 18) / 2;
  const C = 2 * Math.PI * r;
  const next = nextActions[0];

  return (
    <Card className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
      <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`Will readiness ${score} percent`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(20,28,38,.08)" strokeWidth="14" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={score >= 100 ? "var(--color-eucalyptus)" : "var(--color-gold)"}
            strokeWidth="14" strokeLinecap="round" strokeDasharray={C}
            initial={reduce ? false : { strokeDashoffset: C }}
            animate={{ strokeDashoffset: C - (C * score) / 100 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-semibold text-ink">
            <CountUp value={score} suffix="%" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">ready</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">Will readiness</p>
        <h2 className="mt-1 font-display text-2xl font-semibold capitalize text-ink">{band}</h2>
        {next ? (
          <>
            <p className="mt-2 text-sm font-semibold text-ink">Next best thing to do</p>
            <p className="mt-0.5 text-sm leading-relaxed text-ink/65">
              {next.label} <span className="text-eucalyptus">(+{next.points}%)</span> — {next.detail}
            </p>
            <Link
              href={`/will/${next.step}/${next.questionId}?m=${matterId}`}
              className="group mt-3 inline-flex items-center gap-2 rounded-full bg-eucalyptus px-5 py-2.5 text-sm font-bold text-paper hover:bg-moss"
            >
              Do this now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink/65">Everything&rsquo;s covered. Your will is as complete as this service can make it.</p>
        )}

        {nextActions.length > 1 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-fern hover:text-eucalyptus">
              {nextActions.length - 1} more {nextActions.length === 2 ? "suggestion" : "suggestions"}
            </summary>
            <ul className="mt-2 space-y-1.5">
              {nextActions.slice(1).map((a) => (
                <li key={a.questionId + a.label}>
                  <Link href={`/will/${a.step}/${a.questionId}?m=${matterId}`} className="text-xs text-ink/60 hover:text-eucalyptus">
                    · {a.label} <span className="text-eucalyptus">+{a.points}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Card>
  );
}

/* ====================== 2 · ESTATE SNAPSHOT ====================== */

const COLORS = ["var(--color-eucalyptus)", "var(--color-gold)", "var(--color-sky)", "var(--color-clay)", "var(--color-fern)", "var(--color-moss)", "#D08C60", "#7B7C72"];

export function EstateSnapshot({
  slices,
  estimate,
  giftTotal,
  residuePool,
  compact,
}: {
  slices: SnapshotSlice[];
  estimate: number;
  giftTotal: number;
  residuePool: number;
  compact?: boolean;
}) {
  if (estimate === 0 || slices.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Who gets what</h2>
        <p className="mt-2 text-sm text-ink/60">
          Once you&rsquo;ve told us roughly what your estate is worth and who receives it, a live breakdown
          appears here.
        </p>
      </Card>
    );
  }

  const top = [...slices].sort((a, b) => b.value - a.value);
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">Who gets what</h2>
        <p className="text-xs text-ink/50">Estimated on {money(estimate)} · indicative only</p>
      </div>

      <div className={cn("mt-5 grid gap-6", compact ? "" : "sm:grid-cols-[auto_1fr] sm:items-center")}>
        <div className="mx-auto">
          <Donut
            segments={top.map((s) => ({ label: s.label, value: Math.round(s.value) }))}
            size={compact ? 120 : 150}
            centerValue={money(estimate)}
            centerLabel="estate"
          />
        </div>
        <ul className="space-y-2">
          {top.map((s, i) => (
            <li key={s.label + s.sub + i} className="flex items-center gap-2.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{s.label}</span>
                <span className="block truncate text-xs text-ink/55">{s.sub}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-ink">{money(Math.round(s.value))}</span>
            </li>
          ))}
        </ul>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-ink/10 pt-4 text-center">
        {[
          ["Specific gifts", giftTotal],
          ["Residue pool", residuePool],
          ["Total", estimate],
        ].map(([k, v]) => (
          <div key={String(k)}>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink/45">{k}</dt>
            <dd className="font-display text-lg font-semibold text-ink">{money(Number(v))}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink/45">
        Based on the midpoint of the estate range you selected. Debts, taxes and super paid outside the
        estate are not shown.
      </p>
    </Card>
  );
}

/* ====================== 3 · GLOSSARY DRAWER ====================== */

export function GlossaryButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const terms = glossary.terms;
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return terms;
    return terms.filter((t) => t.term.toLowerCase().includes(needle) || t.short.toLowerCase().includes(needle) || t.long.toLowerCase().includes(needle));
  }, [q, terms]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold text-ink/65 hover:border-eucalyptus hover:text-eucalyptus", className)}
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden /> Glossary
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Plain-English glossary">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms…" className="pl-9" aria-label="Search glossary" />
        </div>
        <p className="mt-2 text-xs text-ink/50">{results.length} of {terms.length} terms</p>
        <ul className="mt-4 space-y-2">
          {results.map((t) => (
            <li key={t.term}>
              <details className="group rounded-xl border border-ink/10 bg-paper px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block font-semibold text-ink">{t.term}</span>
                    <span className="block text-xs text-ink/60">{t.short}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink/35 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-ink/75">{t.long}</p>
                {t.related.length > 0 && (
                  <p className="mt-2.5 flex flex-wrap gap-1.5">
                    {t.related.map((r) => (
                      <span key={r} className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold text-fern">{r}</span>
                    ))}
                  </p>
                )}
              </details>
            </li>
          ))}
          {results.length === 0 && <li className="py-6 text-center text-sm text-ink/50">No terms match &ldquo;{q}&rdquo;.</li>}
        </ul>
      </Drawer>
    </>
  );
}

/* ====================== 4 · SMART NUDGES ====================== */

export function SmartNudges({ nudges, matterId }: { nudges: Nudge[]; matterId: string }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = nudges.filter((n) => !dismissed.includes(n.id));
  if (visible.length === 0) return null;

  return (
    <section aria-label="Suggestions" className="space-y-2.5">
      <AnimatePresence initial={false}>
        {visible.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 rounded-2xl border border-gold/40 bg-[#FFFBEC] px-4 py-3.5"
          >
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#7A5C14]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-ink/80">{n.text}</p>
              {n.cta && (
                <Link
                  href={`/will/${n.cta.step}/${n.cta.questionId}?m=${matterId}`}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-eucalyptus hover:underline"
                >
                  {n.cta.label} <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              )}
            </div>
            <button type="button" aria-label="Dismiss suggestion" onClick={() => setDismissed((d) => [...d, n.id])} className="rounded p-1 text-ink/35 hover:bg-black/5">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </section>
  );
}

/* ====================== 5 · NOTIFICATION CENTRE ====================== */

export interface Notice {
  id: string;
  title: string;
  body: string;
  when: string;
  href: string;
  kind: "status" | "message" | "payment" | "document";
}

export function NotificationBell({ notices }: { notices: Notice[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem("mgw-seen-notices") ?? "[]"));
    } catch { /* ignore */ }
  }, []);
  const unread = notices.filter((n) => !seen.includes(n.id)).length;

  function markAll() {
    const ids = notices.map((n) => n.id);
    setSeen(ids);
    try { localStorage.setItem("mgw-seen-notices", JSON.stringify(ids)); } catch { /* ignore */ }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative rounded-full bg-paper/12 p-2.5 text-current hover:bg-paper/20"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">
            {unread}
          </span>
        )}
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Notifications">
        {notices.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink/55">Nothing yet. Status changes and lawyer messages appear here.</p>
        ) : (
          <>
            <button type="button" onClick={markAll} className="mb-3 text-xs font-semibold text-eucalyptus hover:underline">
              Mark all as read
            </button>
            <ul className="space-y-2">
              {notices.map((n) => {
                const isNew = !seen.includes(n.id);
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className={cn("block rounded-xl border px-4 py-3 transition-colors", isNew ? "border-eucalyptus/30 bg-eucalyptus/5" : "border-ink/10 bg-paper")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{n.title}</span>
                        {isNew && <Badge tone="gold">new</Badge>}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink/60">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-ink/40">{n.when}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Drawer>
    </>
  );
}

/* ====================== 6 · ACCESSIBILITY TOOLBAR ====================== */

const A11Y_KEY = "mgw-a11y";

interface A11yState {
  scale: number;
  contrast: boolean;
  dyslexia: boolean;
  dark: boolean;
}

export function AccessibilityToolbar() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<A11yState>({ scale: 100, contrast: false, dyslexia: false, dark: false });
  const [speaking, setSpeaking] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(A11Y_KEY);
      if (raw) setState({ ...JSON.parse(raw) });
    } catch { /* ignore */ }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const root = document.documentElement;
    root.style.fontSize = `${state.scale}%`;
    root.classList.toggle("a11y-contrast", state.contrast);
    root.classList.toggle("a11y-dyslexia", state.dyslexia);
    root.classList.toggle("dark", state.dark);
    try { localStorage.setItem(A11Y_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  function readAloud() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const main = document.getElementById("main");
    const text = (main?.innerText ?? "").replace(/\s+/g, " ").slice(0, 3000);
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[65] no-print">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="mb-3 w-72 rounded-2xl border border-ink/10 bg-paper p-4 card-shadow-lg"
            role="dialog"
            aria-label="Accessibility options"
          >
            <p className="font-display text-base font-semibold text-ink">Accessibility</p>

            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-fern">Text size</p>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Decrease text size" onClick={() => setState((s) => ({ ...s, scale: Math.max(90, s.scale - 10) }))} className="rounded-lg border border-ink/15 p-1.5 hover:bg-sand">
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="flex-1 text-center font-mono text-sm font-bold" aria-live="polite">{state.scale}%</span>
                <button type="button" aria-label="Increase text size" onClick={() => setState((s) => ({ ...s, scale: Math.min(150, s.scale + 10) }))} className="rounded-lg border border-ink/15 p-1.5 hover:bg-sand">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>

            <ul className="mt-3 space-y-1.5">
              {([
                ["contrast", "High contrast", Contrast],
                ["dyslexia", "Dyslexia-friendly font", Type],
                ["dark", "Dark mode", state.dark ? Sun : Moon],
              ] as const).map(([key, label, Icon]) => (
                <li key={key}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={state[key] as boolean}
                    onClick={() => setState((s) => ({ ...s, [key]: !s[key as keyof A11yState] }))}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-sand"
                  >
                    <Icon className="h-4 w-4 text-eucalyptus" aria-hidden />
                    <span className="flex-1 text-ink/80">{label}</span>
                    <span className={cn("relative h-5 w-9 rounded-full transition-colors", state[key] ? "bg-eucalyptus" : "bg-ink/20")}>
                      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", state[key] ? "left-[18px]" : "left-0.5")} />
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={readAloud} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-sand">
                  {speaking ? <Pause className="h-4 w-4 text-clay" aria-hidden /> : <Volume2 className="h-4 w-4 text-eucalyptus" aria-hidden />}
                  <span className="flex-1 text-ink/80">{speaking ? "Stop reading" : "Read page aloud"}</span>
                </button>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => setState({ scale: 100, contrast: false, dyslexia: false, dark: false })}
              className="mt-3 w-full rounded-xl border border-ink/15 py-1.5 text-xs font-semibold text-ink/60 hover:bg-sand"
            >
              Reset to defaults
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Accessibility options"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper card-shadow-lg hover:bg-eucalyptus"
      >
        <Accessibility className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
