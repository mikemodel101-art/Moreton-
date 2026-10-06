"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Users, Check, ChevronUp, Eye } from "lucide-react";
import { switchPersonaAction } from "@/lib/actions/auth";
import type { Role } from "@/lib/types";

interface Persona {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  color: string;
}

const ROLE_LABEL: Record<Role, string> = {
  client: "Client",
  lawyer: "Lawyer",
  senior_lawyer: "Senior Lawyer",
  admin: "Admin",
  observer: "Observer",
};

const ROLE_ORDER: Role[] = ["senior_lawyer", "lawyer", "admin", "observer", "client"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PersonaSwitcher({
  personas,
  currentUserId,
}: {
  personas: Persona[];
  currentUserId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const current = personas.find((p) => p.id === currentUserId) ?? null;
  const sorted = [...personas].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name)
  );

  function pick(id: string) {
    setError(null);
    start(async () => {
      const r = await switchPersonaAction(id);
      if (r.ok && r.data) {
        setOpen(false);
        router.push(r.data.redirectTo);
        router.refresh();
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  return (
    <div className="fixed bottom-4 left-4 z-[60] no-print" ref={panelRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="mb-3 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-ink/10 bg-paper card-shadow-lg"
            role="dialog"
            aria-label="Demo persona switcher"
          >
            <div className="border-b border-ink/10 bg-eucalyptus px-4 py-3 text-paper">
              <p className="text-sm font-semibold">Demo persona switcher</p>
              <p className="text-xs text-paper/70">One click signs you in as any seeded user.</p>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2 nice-scroll">
              {sorted.map((p) => {
                const active = p.id === currentUserId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={pending || active}
                      onClick={() => pick(p.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                        active ? "bg-sand" : "hover:bg-sand/70"
                      } disabled:cursor-default`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: p.color }}
                        aria-hidden
                      >
                        {initials(p.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {p.name}
                        </span>
                        <span className="block text-xs text-ink/60">
                          {ROLE_LABEL[p.role]}
                          {p.title ? ` · ${p.title}` : ""}
                          {p.role === "observer" && (
                            <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-sky/25 px-1 py-px text-[10px] font-semibold text-eucalyptus">
                              <Eye className="h-2.5 w-2.5" aria-hidden /> read-only
                            </span>
                          )}
                        </span>
                      </span>
                      {active && <Check className="h-4 w-4 shrink-0 text-eucalyptus" aria-label="Current persona" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {error && <p className="px-4 pb-3 text-xs text-danger">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-ink/15 bg-ink py-2 pl-2 pr-3.5 text-paper card-shadow-lg transition-transform hover:-translate-y-0.5"
      >
        {current ? (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: current.color }}
            aria-hidden
          >
            {initials(current.name)}
          </span>
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper/15">
            <Users className="h-4 w-4" aria-hidden />
          </span>
        )}
        <span className="text-xs font-semibold">
          {current ? `Viewing as ${current.name.split(" ")[0]}` : "Demo personas"}
        </span>
        <ChevronUp
          className={`h-3.5 w-3.5 text-paper/60 transition-transform ${open ? "" : "rotate-180"}`}
          aria-hidden
        />
      </button>
    </div>
  );
}
