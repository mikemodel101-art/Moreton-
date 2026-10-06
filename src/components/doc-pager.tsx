"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { cn } from "@/components/ui";

export interface DocPageData {
  id: string;
  title: string;
  clauses: { clauseId: string; title: string; texts: string[]; provenance: string[] }[];
}

/** Page-turn style document preview — fade/slide between sections, clause provenance on hover. */
export function DocPager({ pages, disabled }: { pages: DocPageData[]; disabled?: boolean }) {
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const reduce = useReducedMotion();
  const current = pages[Math.min(page, pages.length - 1)];

  let offset = 0;
  for (let i = 0; i < page; i++) offset += pages[i].clauses.reduce((n, c) => n + c.texts.length, 0);

  function go(to: number) {
    const t = Math.max(0, Math.min(pages.length - 1, to));
    setDir(t < page ? -1 : 1);
    setPage(t);
  }

  return (
    <div>
      <div className="relative overflow-hidden" aria-live="polite">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.section
            key={current.id}
            custom={dir}
            initial={reduce ? false : { opacity: 0, x: 32 * dir, rotateY: 4 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -32 * dir }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            aria-label={current.title}
          >
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fern">{current.title}</h3>
            <div className="mt-4 space-y-4">
              {current.clauses.map((c) =>
                c.texts.map((t, i) => {
                  offset += 1;
                  const n = offset;
                  return (
                    <div key={`${c.clauseId}-${i}`} className="group relative rounded-xl px-2 py-1.5 transition-colors hover:bg-eucalyptus/5">
                      <p className="flex gap-4 text-[15px] leading-relaxed text-ink">
                        <span className="w-8 shrink-0 font-semibold text-ink/40">{n}.</span>
                        <span>{t}</span>
                      </p>
                      {/* "Included because you said…" provenance, revealed on hover/focus */}
                      <div
                        className="pointer-events-none absolute left-10 top-0 z-10 w-72 -translate-y-full rounded-xl bg-ink p-3 text-xs leading-relaxed text-paper opacity-0 shadow-xl transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                        role="tooltip"
                      >
                        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gold">
                          <Lightbulb className="h-3 w-3" aria-hidden /> Why this clause is here
                        </p>
                        <ul className="list-inside list-disc space-y-0.5">
                          {c.provenance.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4 no-print">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page === 0 || disabled}
          className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Previous part
        </button>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Document sections">
          {pages.map((p, i) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={i === page}
              aria-label={p.title}
              onClick={() => go(i)}
              className={cn("h-2 rounded-full transition-all", i === page ? "w-6 bg-eucalyptus" : "w-2 bg-ink/20 hover:bg-ink/35")}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= pages.length - 1 || disabled}
          className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40"
        >
          Next part <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
