"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileText, PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "@/components/ui";

export interface PreviewClause {
  id: string;
  section: string;
  text: string;
}

/**
 * Live will preview — rebuilds as the client answers, highlighting
 * whichever clause appeared or changed most recently.
 */
export function LiveWillPreview({ clauses, draft }: { clauses: PreviewClause[]; draft: boolean }) {
  const [open, setOpen] = useState(true);
  const [newest, setNewest] = useState<string | null>(null);
  const prev = useRef<Map<string, string>>(new Map());
  const reduce = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new Map(clauses.map((c) => [c.id, c.text]));
    if (prev.current.size > 0) {
      const changed = clauses.find((c) => prev.current.get(c.id) !== c.text);
      if (changed) {
        setNewest(changed.id);
        const t = setTimeout(() => setNewest(null), 2600);
        prev.current = map;
        return () => clearTimeout(t);
      }
    }
    prev.current = map;
  }, [clauses]);

  useEffect(() => {
    if (!newest || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-clause="${newest}"]`);
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [newest, reduce]);

  let n = 0;
  let lastSection = "";

  return (
    <aside className="hidden xl:block" aria-label="Live will preview">
      <div className="sticky top-24">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink/65 hover:border-eucalyptus hover:text-eucalyptus"
        >
          {open ? <PanelRightClose className="h-3.5 w-3.5" aria-hidden /> : <PanelRightOpen className="h-3.5 w-3.5" aria-hidden />}
          {open ? "Hide live preview" : "Show live preview"}
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: 16 }}
              className="overflow-hidden rounded-2xl border border-ink/10 bg-paper card-shadow"
            >
              <div className="flex items-center gap-2 border-b border-ink/10 bg-sand/70 px-4 py-2.5">
                <FileText className="h-4 w-4 text-eucalyptus" aria-hidden />
                <p className="text-xs font-bold uppercase tracking-widest text-fern">Your will, so far</p>
                {draft && <span className="ml-auto rounded bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-danger">draft</span>}
              </div>
              <div ref={scrollRef} className="max-h-[62vh] overflow-y-auto px-4 py-4 nice-scroll" aria-live="polite">
                {clauses.length === 0 && (
                  <p className="py-6 text-center text-xs text-ink/45">
                    Start answering and your will appears here, clause by clause.
                  </p>
                )}
                {clauses.map((c) => {
                  n += 1;
                  const showSection = c.section !== lastSection;
                  lastSection = c.section;
                  const isNew = newest === c.id;
                  return (
                    <div key={c.id} data-clause={c.id}>
                      {showSection && (
                        <p className="mb-1.5 mt-3 text-[9px] font-bold uppercase tracking-widest text-fern first:mt-0">{c.section}</p>
                      )}
                      <motion.p
                        animate={isNew && !reduce ? { backgroundColor: ["rgba(194,155,60,.28)", "rgba(194,155,60,0)"] } : {}}
                        transition={{ duration: 2.4 }}
                        className={cn("mb-2 rounded-md px-2 py-1 text-[11px] leading-relaxed text-ink/80", isNew && "ring-1 ring-gold/50")}
                      >
                        <span className="mr-1.5 font-semibold text-ink/35">{n}.</span>
                        {c.text}
                      </motion.p>
                    </div>
                  );
                })}
              </div>
              <p className="border-t border-ink/10 px-4 py-2 text-[10px] text-ink/45">
                Placeholder wording — a lawyer reviews and finalises every clause.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
