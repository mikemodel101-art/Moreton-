"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Search, X } from "lucide-react";
import charities from "../../config/charities.json";
import { cn, inputBase } from "@/components/ui";

/* ------------------------------ Currency ------------------------------ */

export function CurrencyInput({
  id,
  value,
  onChange,
  disabled,
  invalid,
  placeholder = "0",
}: {
  id: string;
  value: number | string | undefined;
  onChange: (v: number | "") => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(value === undefined || value === "" ? "" : String(value));
  const pretty = useMemo(() => {
    const n = Number(String(text).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && text !== "" ? n.toLocaleString("en-AU") : "";
  }, [text]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink/45" aria-hidden>
        $
      </span>
      <input
        id={id}
        inputMode="decimal"
        disabled={disabled}
        aria-invalid={invalid}
        placeholder={placeholder}
        value={pretty}
        className={cn(inputBase, "pl-7 pr-12 font-mono")}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.]/g, "");
          setText(raw);
          onChange(raw === "" ? "" : Number(raw));
        }}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink/35" aria-hidden>
        AUD
      </span>
    </div>
  );
}

/* --------------------------- Charity ABN lookup --------------------------- */

export function AbnLookup({
  id,
  value,
  onChange,
  onPickName,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onPickName?: (name: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const picked = charities.charities.find((c) => c.abn === value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return charities.charities.slice(0, 5);
    return charities.charities
      .filter((c) => c.name.toLowerCase().includes(q) || c.abn.replace(/\s/g, "").includes(q.replace(/\s/g, "")))
      .slice(0, 6);
  }, [query]);

  if (picked) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border-2 border-eucalyptus/30 bg-eucalyptus/5 px-3.5 py-2.5">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-eucalyptus" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{picked.name}</p>
          <p className="font-mono text-xs text-ink/55">ABN {picked.abn}</p>
          <p className="text-[11px] text-eucalyptus">{picked.status} · mock registry</p>
        </div>
        {!disabled && (
          <button type="button" aria-label="Clear charity" onClick={() => onChange("")} className="rounded p-1 text-ink/40 hover:text-danger">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" aria-hidden />
        <input
          id={id}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-results`}
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder="Search a charity name or ABN"
          className={cn(inputBase, "pl-9")}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.ul
            id={`${id}-results`}
            role="listbox"
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="absolute z-30 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-ink/10 bg-paper p-1.5 card-shadow-lg nice-scroll"
          >
            <li className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-fern">Mock ACNC registry</li>
            {results.length === 0 && <li className="px-3 py-2 text-sm text-ink/50">No charity matches that search.</li>}
            {results.map((c) => (
              <li key={c.abn} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left hover:bg-sand"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(c.abn);
                    onPickName?.(c.name);
                    setOpen(false);
                  }}
                >
                  <span className="block text-sm font-semibold text-ink">{c.name}</span>
                  <span className="block font-mono text-[11px] text-ink/50">ABN {c.abn}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------- Executor explainer ------------------------- */

const DUTIES = [
  { t: "Find everything", d: "Bank accounts, super, the house, the car — and any debts." },
  { t: "Apply for probate", d: "The Supreme Court's sign-off that lets them act." },
  { t: "Pay what's owed", d: "Debts, funeral costs and tax, before anyone inherits." },
  { t: "Hand out the rest", d: "Exactly as your will says, keeping records as they go." },
];

/** Small animated illustration: a document, a key and four duty cards. */
export function ExecutorExplainer() {
  const reduce = useReducedMotion();
  return (
    <div className="overflow-hidden rounded-3xl border border-ink/10 bg-paper card-shadow">
      <div className="flex flex-col gap-5 bg-eucalyptus px-6 py-6 text-paper sm:flex-row sm:items-center">
        <svg viewBox="0 0 120 90" className="h-24 w-32 shrink-0" role="img" aria-label="Illustration of a will document being unlocked by an executor's key">
          <motion.rect
            x="16" y="10" width="56" height="70" rx="5"
            fill="rgba(252,250,245,.12)" stroke="#FCFAF5" strokeWidth="2"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          />
          {[22, 32, 42, 52, 62].map((y, i) => (
            <motion.line
              key={y}
              x1="26" y1={y} x2={y === 62 ? "48" : "62"} y2={y}
              stroke="#FCFAF5" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.12 }}
            />
          ))}
          <motion.g
            initial={reduce ? false : { x: 26, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.0, ease: "easeOut" }}
          >
            <circle cx="88" cy="46" r="11" fill="none" stroke="#C29B3C" strokeWidth="4" />
            <line x1="88" y1="57" x2="88" y2="76" stroke="#C29B3C" strokeWidth="4" strokeLinecap="round" />
            <line x1="88" y1="66" x2="96" y2="66" stroke="#C29B3C" strokeWidth="4" strokeLinecap="round" />
          </motion.g>
        </svg>
        <div>
          <h2 className="font-display text-xl font-semibold">What an executor actually does</h2>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-paper/75">
            They&rsquo;re the person who carries out your will. It&rsquo;s a real job — usually a few months of
            admin — so pick someone organised, and ask them first.
          </p>
        </div>
      </div>
      <ol className="grid gap-3 p-5 sm:grid-cols-2">
        {DUTIES.map((d, i) => (
          <motion.li
            key={d.t}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            className="flex gap-3 rounded-2xl bg-sand p-3.5"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-eucalyptus text-xs font-bold text-paper" aria-hidden>
              {i + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">{d.t}</span>
              <span className="block text-xs leading-relaxed text-ink/60">{d.d}</span>
            </span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
