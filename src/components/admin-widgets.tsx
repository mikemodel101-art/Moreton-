"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, Save, TriangleAlert } from "lucide-react";
import {
  togglePromoAction,
  updateClauseTextAction,
  updatePlanPriceAction,
  updateQuestionsJsonAction,
  updateUserRoleAction,
  upsertPromoAction,
  toggleClauseOptionalAction,
} from "@/lib/actions/admin";
import { resetDemoAction } from "@/lib/actions/auth";
import { Button, Input, Select, Textarea, cn } from "@/components/ui";
import type { Role } from "@/lib/types";

function useFlash() {
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  return {
    flash,
    report: (r: { ok: boolean; error?: string }, okText: string) =>
      setFlash(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Failed" }),
    clear: () => setFlash(null),
  };
}

export function Flash({ flash }: { flash: { ok: boolean; text: string } | null }) {
  if (!flash) return null;
  return (
    <p role="status" className={cn("mt-2 rounded-xl px-3 py-2 text-xs font-semibold", flash.ok ? "bg-eucalyptus/10 text-eucalyptus" : "bg-danger/10 text-danger")}>
      {flash.text}
    </p>
  );
}

/* ------------------------------ users ------------------------------ */

export function RoleSelect({ userId, role, self }: { userId: string; role: Role; self: boolean }) {
  const [pending, start] = useTransition();
  const { flash, report } = useFlash();
  const router = useRouter();
  return (
    <span>
      <label htmlFor={`role-${userId}`} className="sr-only">Role</label>
      <Select
        id={`role-${userId}`}
        defaultValue={role}
        disabled={pending || self}
        title={self ? "You cannot change your own role" : undefined}
        className="max-w-[170px] py-1.5 text-xs"
        onChange={(e) => {
          const next = e.target.value as Role;
          start(async () => {
            const r = await updateUserRoleAction(userId, next);
            report(r, `Role changed to ${next.replace("_", " ")}`);
            router.refresh();
          });
        }}
      >
        <option value="client">Client</option>
        <option value="lawyer">Lawyer</option>
        <option value="senior_lawyer">Senior Lawyer</option>
        <option value="admin">Admin</option>
        <option value="observer">Observer</option>
      </Select>
      <Flash flash={flash} />
    </span>
  );
}

/* ------------------------------ promos ------------------------------ */

export function PromoUpsert({ edit }: { edit?: { code: string; kind: "percent" | "fixed"; value: number; referrer: string | null; note: string; active: boolean } }) {
  const [open, setOpen] = useState(!!edit);
  const [form, setForm] = useState({
    code: edit?.code ?? "",
    kind: (edit?.kind ?? "percent") as "percent" | "fixed",
    value: edit?.value ?? 20,
    referrer: edit?.referrer ?? "",
    note: edit?.note ?? "",
  });
  const [pending, start] = useTransition();
  const { flash, report } = useFlash();
  const router = useRouter();

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden /> New promo code
      </Button>
    );
  }

  return (
    <form
      className="rounded-2xl border border-ink/12 bg-sand p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await upsertPromoAction({ ...form, referrer: form.referrer || null });
          report(r, `Saved ${form.code.toUpperCase()}`);
          if (r.ok) { setOpen(false); router.refresh(); }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="p-code" className="mb-1 block text-xs font-bold text-ink/60">Code</label>
          <Input id="p-code" required value={form.code} disabled={!!edit} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="font-mono uppercase" placeholder="SPRING15" />
        </div>
        <div>
          <label htmlFor="p-kind" className="mb-1 block text-xs font-bold text-ink/60">Kind</label>
          <Select id="p-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "percent" | "fixed" })}>
            <option value="percent">% off</option>
            <option value="fixed">$ off (AUD)</option>
          </Select>
        </div>
        <div>
          <label htmlFor="p-value" className="mb-1 block text-xs font-bold text-ink/60">Value</label>
          <Input id="p-value" required type="number" min={1} max={form.kind === "percent" ? 100 : 10000} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
        </div>
        <div>
          <label htmlFor="p-ref" className="mb-1 block text-xs font-bold text-ink/60">Referrer (optional)</label>
          <Input id="p-ref" value={form.referrer} onChange={(e) => setForm({ ...form, referrer: e.target.value })} placeholder="Partner name" />
        </div>
        <div>
          <label htmlFor="p-note" className="mb-1 block text-xs font-bold text-ink/60">Note</label>
          <Input id="p-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Internal note" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button type="submit" size="sm" loading={pending}><Save className="h-3.5 w-3.5" aria-hidden /> Save promo</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <Flash flash={flash} />
    </form>
  );
}

export function PromoToggle({ code, active }: { code: string; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`Promo ${code} active`}
      disabled={pending}
      onClick={() => start(async () => { await togglePromoAction(code); router.refresh(); })}
      className={cn("relative h-6 w-11 rounded-full transition-colors", active ? "bg-eucalyptus" : "bg-ink/20")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", active ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

/* ------------------------------ pricing ------------------------------ */

export function PriceEditor({ planId, price }: { planId: string; price: number }) {
  const [value, setValue] = useState(price);
  const [pending, start] = useTransition();
  const { flash, report } = useFlash();
  const router = useRouter();
  const dirty = value !== price;
  return (
    <div>
      <div className="flex items-center gap-2">
        <label htmlFor={`price-${planId}`} className="sr-only">Price in AUD</label>
        <span className="text-lg font-bold text-ink/40" aria-hidden>$</span>
        <Input id={`price-${planId}`} type="number" min={0} max={5000} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-28" />
        <Button
          size="sm"
          variant={dirty ? "primary" : "ghost"}
          loading={pending}
          disabled={!dirty}
          onClick={() => start(async () => {
            const r = await updatePlanPriceAction(planId, value);
            report(r, `Price set to $${value}`);
            router.refresh();
          })}
        >
          <Save className="h-3.5 w-3.5" aria-hidden /> Save
        </Button>
      </div>
      <Flash flash={flash} />
    </div>
  );
}

/* ----------------------------- clause bank ----------------------------- */

export function ClauseBankCard({
  id, title, category, optional, text,
}: {
  id: string; title: string; category: string; optional: boolean; text: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [pending, start] = useTransition();
  const { flash, report } = useFlash();
  const router = useRouter();
  const dirty = value !== text;

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5 card-shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-ink">{title}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-fern">{category}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => { await toggleClauseOptionalAction(id); router.refresh(); })}
            className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", optional ? "bg-ink/8 text-ink/70" : "bg-sky/20 text-eucalyptus")}
            title="Toggle optional/mandatory"
          >
            {optional ? "optional" : "mandatory"}
          </button>
          <Button size="sm" variant={editing ? "outline" : "ghost"} onClick={() => { setEditing(!editing); setValue(text); }}>
            {editing ? "Close" : "Edit"}
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="mt-3">
          <label htmlFor={`clause-${id}`} className="sr-only">Clause text</label>
          <Textarea id={`clause-${id}`} value={value} onChange={(e) => setValue(e.target.value)} className="min-h-[110px] font-mono text-xs" maxLength={5000} />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" loading={pending} disabled={!dirty} onClick={() => start(async () => {
              const r = await updateClauseTextAction(id, value);
              report(r, "Clause bank updated");
              router.refresh();
            })}>
              <Save className="h-3.5 w-3.5" aria-hidden /> Save to clause bank
            </Button>
            <span className="text-xs text-ink/50">Applies to all future wills; existing matters keep lawyer overrides.</span>
          </div>
          <Flash flash={flash} />
        </div>
      ) : (
        <p className="mt-2.5 text-sm leading-relaxed text-ink/70">{text}</p>
      )}
    </div>
  );
}

/* ---------------------------- questions editor ---------------------------- */

export function QuestionsJsonEditor({ json }: { json: string }) {
  const [value, setValue] = useState(json);
  const [pending, start] = useTransition();
  const { flash, report } = useFlash();
  const [stat, setStat] = useState<string | null>(null);
  const router = useRouter();
  const dirty = value !== json;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-start gap-2 text-xs text-ink/60">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
          Structure is validated server-side (sections, question ids and types). Invalid JSON is rejected
          and never applied.
        </p>
        <Button
          size="sm"
          loading={pending}
          disabled={!dirty}
          onClick={() => start(async () => {
            const r = await updateQuestionsJsonAction(value);
            report(r, r.data ? `Applied: ${r.data.sections} sections, ${r.data.questions} questions` : "Applied");
            if (r.ok && r.data) setStat(`Live bank now has ${r.data.sections} sections / ${r.data.questions} questions.`);
            router.refresh();
          })}
        >
          <Save className="h-3.5 w-3.5" aria-hidden /> Validate &amp; apply
        </Button>
      </div>
      <label htmlFor="qjson" className="sr-only">Questionnaire configuration JSON</label>
      <Textarea
        id="qjson"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
        className="mt-3 min-h-[420px] font-mono text-xs leading-relaxed"
      />
      <Flash flash={flash} />
      {stat && <p className="mt-2 text-xs font-semibold text-eucalyptus">{stat}</p>}
    </div>
  );
}

/* ------------------------------ reset demo ------------------------------ */

export function ResetDemo() {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        <RotateCcw className="h-4 w-4" aria-hidden /> Reset demo data
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-clay bg-clay/10 py-1.5 pl-4 pr-1.5 text-xs font-semibold text-clay">
      Restore all seeded dummy data?
      <Button size="sm" variant="danger" loading={pending} onClick={() => start(async () => {
        const r = await resetDemoAction();
        if (r.ok) { setConfirming(false); router.refresh(); }
      })}>
        Yes, reset
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button>
    </span>
  );
}
