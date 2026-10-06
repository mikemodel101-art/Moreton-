"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Check, FileCheck2, Lock, ShieldCheck } from "lucide-react";
import { resolveFlagAction, setChecklistAction } from "@/lib/actions/lawyer";
import { Badge, Button, Card, SEVERITY_TONE, Textarea, cn } from "@/components/ui";
import { formatDateTime } from "@/lib/engine";
import type { FlagEval, FlagResolution } from "@/lib/types";

export interface FlagRow extends FlagEval {
  state: FlagResolution["state"] | "open";
  note?: string;
  byName?: string;
  at?: string;
}

const STATE_LABEL: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-ink/8 text-ink/60" },
  acknowledged: { label: "Acknowledged", cls: "bg-gold/15 text-[#7A5C14]" },
  resolved: { label: "Resolved", cls: "bg-eucalyptus/12 text-eucalyptus" },
  escalated: { label: "Escalated", cls: "bg-clay/12 text-clay" },
};

export function FlagsPane({
  matterId,
  matterRef,
  flags,
  complexity,
  checklist,
  checklistItems,
  canAct,
  isSenior,
}: {
  matterId: string;
  matterRef: string;
  flags: FlagRow[];
  complexity: { score: number; label: string; routing: string; sla: number; blocked: boolean };
  checklist: Record<string, boolean>;
  checklistItems: { key: string; label: string }[];
  canAct: boolean;
  isSenior: boolean;
}) {
  const blocking = flags.filter((f) => f.blocksAutoApproval && f.state !== "resolved" && f.state !== "acknowledged");
  const grouped = flags.reduce<Record<string, FlagRow[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Complexity summary */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-fern">Complexity score</p>
            <p className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display text-3xl font-semibold text-ink">{complexity.score}</span>
              <Badge tone={complexity.label === "Complex" ? "red" : complexity.label === "Needs attention" ? "gold" : "green"}>
                {complexity.label}
              </Badge>
            </p>
          </div>
          <div className="text-right text-xs text-ink/60">
            <p>Routed to <strong className="text-ink">{complexity.routing === "senior-lawyer" ? "Senior Lawyer" : "Lawyer queue"}</strong></p>
            <p>SLA target: {complexity.sla} business days</p>
          </div>
        </div>
        {blocking.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-clay/10 px-3 py-2.5 text-xs font-semibold text-clay">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {blocking.length} flag{blocking.length > 1 ? "s" : ""} must be acknowledged or resolved before this matter can be approved.
          </p>
        )}
        {complexity.blocked && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-xs font-semibold text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Blocker present — the client was offered a consultation rather than the online path.
          </p>
        )}
      </Card>

      {/* Flags by category */}
      {Object.entries(grouped).map(([category, rows]) => (
        <div key={category}>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-fern">{category}</p>
          <div className="space-y-2.5">
            {rows.map((f) => (
              <FlagCard key={f.id} flag={f} matterId={matterId} canAct={canAct} isSenior={isSenior} />
            ))}
          </div>
        </div>
      ))}
      {flags.length === 0 && (
        <Card className="p-8 text-center text-sm text-ink/55">
          No triage flags — this matter is straightforward.
        </Card>
      )}

      {/* Approval checklist */}
      <Card className="p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <FileCheck2 className="h-4 w-4 text-eucalyptus" aria-hidden /> Approval checklist
        </h3>
        <p className="mt-1 text-xs text-ink/55">All four must be ticked before {matterRef} can be approved.</p>
        <ul className="mt-3 space-y-2">
          {checklistItems.map((c) => (
            <ChecklistRow key={c.key} matterId={matterId} item={c} checked={!!checklist[c.key]} canAct={canAct} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ChecklistRow({
  matterId,
  item,
  checked,
  canAct,
}: {
  matterId: string;
  item: { key: string; label: string };
  checked: boolean;
  canAct: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <li>
      <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm", checked ? "border-eucalyptus/30 bg-eucalyptus/5" : "border-ink/10", !canAct && "cursor-not-allowed opacity-60")}>
        <input
          type="checkbox"
          checked={checked}
          disabled={!canAct || pending}
          className="mt-0.5 h-4 w-4 accent-eucalyptus"
          onChange={(e) => {
            const v = e.target.checked;
            start(async () => {
              await setChecklistAction(matterId, item.key, v);
              router.refresh();
            });
          }}
        />
        <span className={checked ? "text-ink" : "text-ink/70"}>{item.label}</span>
      </label>
    </li>
  );
}

function FlagCard({
  flag,
  matterId,
  canAct,
  isSenior,
}: {
  flag: FlagRow;
  matterId: string;
  canAct: boolean;
  isSenior: boolean;
}) {
  const [mode, setMode] = useState<null | "resolve" | "escalate">(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const st = STATE_LABEL[flag.state] ?? STATE_LABEL.open;
  const canResolve = isSenior || (flag.severity !== "high" && flag.severity !== "blocker");

  function act(state: "acknowledged" | "resolved" | "escalated") {
    setError(null);
    start(async () => {
      const r = await resolveFlagAction(matterId, flag.id, state, note);
      if (!r.ok) setError(r.error);
      else {
        setMode(null);
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <Card className={cn("p-4", flag.state === "resolved" && "opacity-75")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={SEVERITY_TONE[flag.severity] ?? "sky"} className="uppercase">
          <span className="font-mono text-[9px] opacity-70">{flag.severity}</span> {flag.label}
        </Badge>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", st.cls)}>{st.label}</span>
        <code className="ml-auto font-mono text-[10px] text-ink/35">{flag.id}</code>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-ink/80">{flag.lawyerMessage}</p>
      <p className="mt-1.5 rounded-lg bg-sand px-3 py-1.5 text-xs text-ink/55">
        <span className="font-semibold text-fern">Client sees:</span> &ldquo;{flag.clientMessage}&rdquo;
      </p>

      {flag.note && (
        <p className="mt-2 border-l-2 border-eucalyptus/40 pl-3 text-xs text-ink/70">
          <span className="font-semibold">{flag.byName}</span> · {formatDateTime(flag.at)}
          <br />
          {flag.note}
        </p>
      )}

      {error && <p role="alert" className="mt-2 text-xs font-semibold text-danger">{error}</p>}

      {canAct && flag.state !== "resolved" && (
        <>
          {!mode ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {flag.state !== "acknowledged" && (
                <Button size="sm" variant="outline" loading={pending} onClick={() => act("acknowledged")}>
                  <Check className="h-3.5 w-3.5" aria-hidden /> Acknowledge
                </Button>
              )}
              <Button size="sm" variant={canResolve ? "primary" : "ghost"} disabled={!canResolve} title={canResolve ? undefined : "Senior Lawyer only"} onClick={() => setMode("resolve")}>
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Resolve with note
              </Button>
              {!isSenior && (
                <Button size="sm" variant="ghost" onClick={() => setMode("escalate")}>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> Escalate
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <label htmlFor={`note-${flag.id}`} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-fern">
                {mode === "resolve" ? "File note (required)" : "Note for the Senior Lawyer"}
              </label>
              <Textarea id={`note-${flag.id}`} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[80px]" maxLength={2000} placeholder={mode === "resolve" ? "e.g. Spoke with client 14 Mar; reasons recorded; advised on family provision exposure." : "Why this needs senior attention…"} />
              <div className="mt-2 flex gap-2">
                <Button size="sm" loading={pending} onClick={() => act(mode === "resolve" ? "resolved" : "escalated")}>
                  {mode === "resolve" ? "Save & resolve" : "Escalate to senior"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode(null)} disabled={pending}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
