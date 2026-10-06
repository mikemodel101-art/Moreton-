"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/components/ui";

const KEY = "mgw-start-consent";

/** Prototype consent — acknowledged before a matter is created. */
export function StartConsent() {
  const [ticked, setTicked] = useState(false);

  useEffect(() => {
    try { setTicked(localStorage.getItem(KEY) === "1"); } catch { /* ignore */ }
  }, []);

  function set(v: boolean) {
    setTicked(v);
    try { v ? localStorage.setItem(KEY, "1") : localStorage.removeItem(KEY); } catch { /* ignore */ }
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-sm leading-relaxed transition-colors",
        ticked ? "border-eucalyptus bg-eucalyptus/8" : "border-gold/50 bg-[#FFFBEC]"
      )}
    >
      <input type="checkbox" checked={ticked} onChange={(e) => set(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-eucalyptus" />
      <span>
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          <ShieldAlert className="h-4 w-4 text-clay" aria-hidden /> I understand this is a prototype
        </span>
        <span className="mt-1 block text-ink/70">
          This is a test environment using dummy data. It is <strong>not legal advice</strong>, no real will
          is created, and no payment is taken. I will <strong>not enter real personal details</strong> about
          myself or anyone else — I&rsquo;ll use invented names, addresses and amounts.
        </span>
      </span>
    </label>
  );
}
