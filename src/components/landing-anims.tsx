"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { BadgeCheck, FileText, Gavel, MessageSquareText, Sparkles, StampIcon } from "lucide-react";
import { cn } from "@/components/ui";
import { CountUp } from "@/components/design-system";

/* Subtle parallax on hero image layers */
export function ParallaxImg({ src, alt = "", className }: { src: string; alt?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "14%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.06]);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" aria-hidden>
      <motion.img src={src} alt={alt} style={{ y, scale }} className={cn("h-full w-full object-cover", className)} />
      <div className="absolute inset-0 bg-gradient-to-b from-eucalyptus/70 via-eucalyptus/80 to-eucalyptus" />
    </div>
  );
}

/* Animated trust counters */
export function TrustCounters() {
  const stats = [
    { value: 2.5, format: (v: number) => `${v % 1 === 0 ? v : v.toFixed(1)} days`, label: "typical lawyer turnaround", from: 0 },
    { value: 11400, format: (v: number) => `${Math.round(v).toLocaleString()}+`, label: "wills prepared (dummy figure)", from: 10400 },
    { value: 27, format: (v: number) => `${Math.round(v)} years`, label: "serving QLD families", from: 0 },
  ];
  return (
    <dl className="mt-14 grid max-w-2xl grid-cols-1 gap-6 border-t border-paper/15 pt-8 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label}>
          <dt className="sr-only">{s.label}</dt>
          <dd className="font-display text-3xl font-semibold text-paper">
            <CountUp value={s.value} format={s.format} />
          </dd>
          <dd className="mt-1 text-sm text-paper/60">{s.label}</dd>
        </div>
      ))}
    </dl>
  );
}

/* Animated, scroll-driven "How it works" — 4 steps with progress rail */
const STEPS = [
  {
    icon: MessageSquareText,
    title: "Answer guided questions",
    body: "Plain-English questions about your family, assets and wishes — with a 'What does this mean?' tooltip on every legal term. It autosaves as you go.",
  },
  {
    icon: Sparkles,
    title: "Pay a fixed fee online",
    body: "No hourly rates, no surprises. Partner promo codes apply instantly at the Stripe test-mode checkout.",
  },
  {
    icon: Gavel,
    title: "A Queensland lawyer reviews every word",
    body: "A real solicitor checks your answers, triage flags anything needing care, and can ask for changes before anything is finalised.",
  },
  {
    icon: StampIcon,
    title: "Approved, issued, and signed properly",
    body: "Your will arrives with a step-by-step signing checklist that keeps it valid under s 10, Succession Act 1981 (Qld).",
  },
];

function ScrollStep({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  const reduce = useReducedMotion();
  return (
    <li ref={ref} className="relative pb-16 last:pb-0 sm:pl-16">
      <span
        aria-hidden
        className={cn(
          "absolute -left-[1px] top-1 hidden h-11 w-11 items-center justify-center rounded-full border-2 transition-colors duration-300 sm:flex",
          inView ? "border-eucalyptus bg-eucalyptus text-paper" : "border-ink/15 bg-paper text-ink/35"
        )}
      >
        <step.icon className="h-5 w-5" />
      </span>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn("rounded-3xl border p-7 card-shadow transition-colors duration-300", inView ? "border-eucalyptus/30 bg-paper" : "border-ink/10 bg-paper/60")}
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">Step {index + 1}</p>
        <h3 className="mt-1.5 font-display text-2xl font-semibold text-ink">{step.title}</h3>
        <p className="mt-2.5 text-sm leading-relaxed text-ink/65">{step.body}</p>
      </motion.div>
    </li>
  );
}

export function HowItWorksScroll() {
  return (
    <div className="relative">
      <span aria-hidden className="absolute bottom-8 left-[21px] top-6 hidden w-0.5 bg-ink/10 sm:block" />
      <ol className="relative">
        {STEPS.map((s, i) => (
          <ScrollStep key={s.title} step={s} index={i} />
        ))}
      </ol>
      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-fern sm:pl-16">
        <FileText className="h-4 w-4" aria-hidden /> And when you're ready — a same-day DOCX/PDF export.
        <BadgeCheck className="h-4 w-4 text-eucalyptus" aria-hidden />
      </div>
    </div>
  );
}
