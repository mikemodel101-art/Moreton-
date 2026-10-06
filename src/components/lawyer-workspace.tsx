"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCheck,
  CircleAlert,
  Download,
  FilePen,
  Gavel,
  Lock,
  MessagesSquare,
  NotebookPen,
  RotateCcw,
  ScrollText,
  Send,
  StampIcon,
  TriangleAlert,
} from "lucide-react";
import {
  addNoteAction,
  approveMatterAction,
  issueMatterAction,
  rejectMatterAction,
  requestChangesAction,
  setClauseOverrideAction,
  signOffMatterAction,
} from "@/lib/actions/lawyer";
import { sendClientMessageAction } from "@/lib/actions/client";
import { formatDateTime, money, timeAgo } from "@/lib/engine";
import { Avatar, Badge, Button, Card, FlagChip, StatusPill, Textarea, cn } from "@/components/ui";
import { DiffViewer, RichTextEditor, Term } from "@/components/design-system";
import { FlagsPane, type FlagRow } from "@/components/flags-pane";
import { GitCompareArrows, Lightbulb, History as HistoryIcon, TriangleAlert as TriangleIcon } from "lucide-react";
import type { FlagEval, MatterStatus, Role } from "@/lib/types";

/* ------------------------------- types ------------------------------- */

interface Viewer {
  id: string;
  role: Role;
  name: string;
  canAct: boolean;
  isSenior: boolean;
  isObserver: boolean;
  isAdmin: boolean;
}

interface MatterLite {
  id: string;
  ref: string;
  status: MatterStatus;
  reviewRound: number;
  planName: string;
  createdAt: string;
  submittedAt: string | null;
  paidAt: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
  pendingSignOff: boolean;
  needsSignOff: boolean;
  signedOffByName: string | null;
  approvedByName: string | null;
  payment: { total: number; promoCode: string | null; last4: string; paidAt: string } | null;
}

interface ClauseRow {
  id: string;
  title: string;
  category: string;
  optional: boolean;
  matches: boolean;
  disabled: boolean;
  overrideText: string | null;
  rendered: string[];
  bankText: string;
  provenance: string[];
}

export interface WorkspaceProps {
  viewer: Viewer;
  matter: MatterLite;
  client: { name: string; email: string; color: string };
  lawyer: { name: string; id: string } | null;
  flags: FlagEval[];
  answerGroups: { id: string; title: string; items: { id: string; label: string; display: string; rows: { label: string; value: string }[] }[] }[];
  clauses: ClauseRow[];
  notes: { id: string; body: string; createdAt: string; author: { name: string; color: string } }[];
  messages: { id: string; body: string; internal: boolean; createdAt: string; mine: boolean; authorName: string; authorColor: string; authorRole: string }[];
  audit: { id: string; at: string; action: string; summary: string; actor: string; actorRole: Role }[];
  exportable: boolean;
  flagRows: FlagRow[];
  complexity: { score: number; label: string; routing: string; sla: number; blocked: boolean };
  checklist: Record<string, boolean>;
  checklistItems: { key: string; label: string }[];
  versions: { id: string; n: number; createdAt: string; byName: string; reason: string; changed: string[] }[];
}

const TABS = [
  { id: "answers", label: "Answers", icon: ScrollText },
  { id: "flags", label: "Flags", icon: TriangleIcon },
  { id: "clauses", label: "Clauses", icon: FilePen },
  { id: "notes", label: "Internal notes", icon: NotebookPen },
  { id: "messages", label: "Messages", icon: MessagesSquare },
  { id: "versions", label: "Versions", icon: HistoryIcon },
  { id: "audit", label: "Audit trail", icon: BadgeCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function LawyerWorkspace(props: WorkspaceProps) {
  const { matter, client, viewer, flags } = props;
  const [tab, setTab] = useState<TabId>("answers");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-ink/10 bg-eucalyptus text-paper">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Link href="/lawyer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-paper/70 hover:text-paper">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Review queue
          </Link>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={client.name} color={client.color} size="xl" />
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-3xl font-semibold">{client.name}</h1>
                  <StatusPill status={matter.status} />
                </div>
                <p className="mt-1 text-sm text-paper/65">
                  {matter.ref} · {client.email} · {matter.planName} · review round {matter.reviewRound}
                  {matter.payment && ` · paid ${money(matter.payment.total)} (${matter.payment.promoCode ?? "no promo"}, card ${matter.payment.last4})`}
                </p>
                {flags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {flags.map((f) => (
                      <FlagChip key={f.id} flag={f} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            {props.exportable && (
              <div className="flex gap-2">
                <a href={`/api/export/${matter.id}/pdf`} className="inline-flex items-center gap-2 rounded-full bg-paper/15 px-4 py-2 text-sm font-bold text-paper hover:bg-paper/25">
                  <Download className="h-4 w-4" aria-hidden /> PDF
                </a>
                <a href={`/api/export/${matter.id}/docx`} className="inline-flex items-center gap-2 rounded-full bg-paper/15 px-4 py-2 text-sm font-bold text-paper hover:bg-paper/25">
                  <Download className="h-4 w-4" aria-hidden /> DOCX
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-[1fr_360px]">
        {/* Left: tabs */}
        <div className="min-w-0">
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-ink/10 bg-paper p-1.5 nice-scroll" role="tablist" aria-label="Matter detail">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
                  tab === t.id ? "bg-eucalyptus text-paper" : "text-ink/60 hover:bg-sand"
                )}
              >
                <t.icon className="h-4 w-4" aria-hidden /> {t.label}
                {t.id === "notes" && props.notes.length > 0 && <span className="rounded-full bg-black/15 px-1.5 text-[10px]">{props.notes.length}</span>}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {tab === "answers" && <AnswersTab groups={props.answerGroups} />}
            {tab === "flags" && (
              <FlagsPane
                matterId={matter.id}
                matterRef={matter.ref}
                flags={props.flagRows}
                complexity={props.complexity}
                checklist={props.checklist}
                checklistItems={props.checklistItems}
                canAct={viewer.canAct}
                isSenior={viewer.isSenior}
              />
            )}
            {tab === "clauses" && <ClausesTab {...props} />}
            {tab === "notes" && <NotesTab matterId={matter.id} notes={props.notes} canAct={viewer.canAct} />}
            {tab === "messages" && <MessagesTab matterId={matter.id} messages={props.messages} canAct={viewer.canAct} />}
            {tab === "versions" && <VersionsTab versions={props.versions} />}
            {tab === "audit" && <AuditTab entries={props.audit} />}
          </div>
        </div>

        {/* Right: decision rail */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <DecisionCard {...props} onDone={() => router.refresh()} />
          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-ink">Matter</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Reference", matter.ref],
                ["Assigned", props.lawyer ? (props.lawyer.id === viewer.id ? `${props.lawyer.name} (you)` : props.lawyer.name) : "Unassigned"],
                ["Created", formatDateTime(matter.createdAt)],
                ["Submitted", formatDateTime(matter.submittedAt)],
                ["Paid", matter.paidAt ? formatDateTime(matter.paidAt) : "Not paid"],
                ["Approved", matter.approvedByName ? `${matter.approvedByName} · ${formatDateTime(matter.approvedAt)}` : "—"],
                ["Senior sign-off", matter.signedOffByName ?? (matter.needsSignOff ? "Required" : "Not required")],
                ["Issued", formatDateTime(matter.issuedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-ink/55">{k}</dt>
                  <dd className="text-right font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      </main>
    </div>
  );
}

/* ---------------------------- decision card ---------------------------- */

function DecisionCard({ viewer, matter, onDone }: WorkspaceProps & { onDone: () => void }) {
  const [mode, setMode] = useState<null | "changes" | "reject">(null);
  const [text, setText] = useState("");
  const [confirm, setConfirm] = useState<null | "approve" | "issue" | "signoff">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!viewer.canAct) {
    return (
      <Card className="p-5">
        <p className="flex items-start gap-2 text-sm text-ink/65">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-fern" aria-hidden />
          {viewer.isObserver
            ? "Read-only observer view — decisions are disabled. Switch persona to a lawyer to act."
            : viewer.isAdmin
              ? "Admin manages the platform but cannot approve or issue wills (RBAC)."
              : "This matter is assigned to another lawyer."}
        </p>
      </Card>
    );
  }

  const act = (fn: () => Promise<{ ok: boolean; error?: string; data?: { needsSignOff?: boolean } }>, success?: string) => {
    setNotice(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setNotice(`ERROR:${r.error}`);
      else {
        if (r.data?.needsSignOff) setNotice("Senior sign-off has been requested — Margaret Holloway has been emailed (preview).");
        else setNotice(success ?? "Done.");
        setConfirm(null);
        setMode(null);
        setText("");
        onDone();
      }
    });
  };

  const busy = pending;

  return (
    <Card className="p-5" aria-label="Review decisions">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
        <Gavel className="h-4 w-4 text-eucalyptus" aria-hidden /> Decision
      </h2>

      {matter.needsSignOff && !matter.signedOffByName && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-clay/10 px-3 py-2.5 text-xs font-semibold text-clay">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Flags require Senior Lawyer sign-off{matter.pendingSignOff ? " (requested — see mailbox)" : ""}.
        </p>
      )}
      {notice && (
        <p role="status" className={cn("mt-3 rounded-xl px-3 py-2.5 text-xs font-semibold", notice.startsWith("ERROR:") ? "bg-danger/10 text-danger" : "bg-eucalyptus/10 text-eucalyptus")}>
          {notice.startsWith("ERROR:") ? notice.slice(6) : notice}
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        {matter.status === "in_review" && (
          <>
            {viewer.isSenior && matter.needsSignOff && !matter.signedOffByName ? (
              <ConfirmRow
                label="Sign off & approve"
                tone="green"
                busy={busy}
                confirm={confirm === "signoff"}
                onAsk={() => setConfirm("signoff")}
                onCancel={() => setConfirm(null)}
                onYes={() => act(() => signOffMatterAction(matter.id), "Signed off and approved.")}
                icon={<StampIcon className="h-4 w-4" aria-hidden />}
                confirmText="Senior sign-off on a flagged matter is recorded in the audit log. Proceed?"
              />
            ) : (
              <ConfirmRow
                label="Approve will"
                tone="green"
                busy={busy}
                confirm={confirm === "approve"}
                onAsk={() => setConfirm("approve")}
                onCancel={() => setConfirm(null)}
                onYes={() => act(() => approveMatterAction(matter.id))}
                icon={<CheckCheck className="h-4 w-4" aria-hidden />}
                confirmText={matter.needsSignOff && !viewer.isSenior ? "This will request Senior sign-off rather than approving immediately. Continue?" : "The client will be notified their will is approved. Proceed?"}
              />
            )}
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => { setMode(mode === "changes" ? null : "changes"); setConfirm(null); }}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Request changes
            </Button>
            <Button variant="ghost" className="w-full text-danger hover:bg-danger/10" disabled={busy} onClick={() => { setMode(mode === "reject" ? null : "reject"); setConfirm(null); }}>
              <Ban className="h-4 w-4" aria-hidden /> Reject (not suitable online)
            </Button>
          </>
        )}
        {matter.status === "approved" && (
          <ConfirmRow
            label="Issue will to client"
            tone="green"
            busy={busy || (matter.needsSignOff && !matter.signedOffByName)}
            confirm={confirm === "issue"}
            onAsk={() => setConfirm("issue")}
            onCancel={() => setConfirm(null)}
            onYes={() => act(() => issueMatterAction(matter.id), "Will issued — client notified.")}
            icon={<StampIcon className="h-4 w-4" aria-hidden />}
            confirmText="Issue the final will? Client receives the document and signing checklist."
          />
        )}
        {matter.status === "changes_requested" && (
          <p className="rounded-xl bg-sand px-3.5 py-2.5 text-xs text-ink/60">
            Waiting for the client to update their answers and resubmit.
          </p>
        )}
        {matter.status === "issued" && (
          <p className="flex items-start gap-2 rounded-xl bg-eucalyptus/10 px-3.5 py-2.5 text-xs font-semibold text-eucalyptus">
            <CheckCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Issued. Exports above are the final document.
          </p>
        )}
        {["draft", "awaiting_payment"].includes(matter.status) && (
          <p className="rounded-xl bg-sand px-3.5 py-2.5 text-xs text-ink/60">
            The client hasn&rsquo;t {matter.status === "draft" ? "finished the questionnaire" : "paid"} yet — decisions unlock after payment.
          </p>
        )}
      </div>

      {mode && (
        <div className="mt-4 border-t border-ink/10 pt-4">
          <label htmlFor="decision-text" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-fern">
            {mode === "changes" ? "What must the client change?" : "Why is this not suitable?"}
          </label>
          <Textarea
            id="decision-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "changes" ? "e.g. Please give your sister's full legal name and address…" : "e.g. Testamentary capacity concerns require an in-person assessment…"}
            className="min-h-[110px]"
            maxLength={2000}
          />
          <div className="mt-2.5 flex gap-2">
            <Button
              size="sm"
              variant={mode === "changes" ? "primary" : "danger"}
              loading={busy}
              onClick={() => act(() => (mode === "changes" ? requestChangesAction(matter.id, text) : rejectMatterAction(matter.id, text)))}
            >
              <Send className="h-3.5 w-3.5" aria-hidden /> {mode === "changes" ? "Send request" : "Reject matter"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setMode(null); setText(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ConfirmRow({
  label,
  tone,
  busy,
  confirm,
  onAsk,
  onCancel,
  onYes,
  icon,
  confirmText,
}: {
  label: string;
  tone: "green" | "gold";
  busy: boolean;
  confirm: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onYes: () => void;
  icon: React.ReactNode;
  confirmText: string;
}) {
  if (confirm) {
    return (
      <div className="rounded-2xl border-2 border-gold/50 bg-[#FFFBEC] p-3.5">
        <p className="text-xs font-semibold text-ink/75">{confirmText}</p>
        <div className="mt-2.5 flex gap-2">
          <Button size="sm" variant={tone === "green" ? "primary" : "gold"} onClick={onYes} loading={busy}>
            Yes, {label.toLowerCase()}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
            Back
          </Button>
        </div>
      </div>
    );
  }
  return (
    <Button variant="primary" className="w-full" disabled={busy} onClick={onAsk}>
      {icon} {label}
    </Button>
  );
}

/* -------------------------------- tabs -------------------------------- */

function AnswersTab({ groups }: { groups: WorkspaceProps["answerGroups"] }) {
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.id} className="overflow-hidden">
          <h2 className="border-b border-ink/10 bg-sand/70 px-5 py-3 font-display text-base font-semibold text-ink">{g.title}</h2>
          <dl className="divide-y divide-ink/5">
            {g.items.map((item) => (
              <div key={item.id} className="grid gap-1 px-5 py-3 sm:grid-cols-[240px_1fr] sm:gap-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-fern">{item.label}</dt>
                <dd className="text-sm text-ink">
                  {item.rows.length > 0 ? (
                    <ul className="space-y-1">
                      {item.rows.map((r, i) => (
                        <li key={i}>
                          <span className="font-semibold">{r.label}</span>
                          {r.value && <span className="text-ink/60"> — {r.value}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    item.display
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
    </div>
  );
}

function ClausesTab({ matter, clauses, viewer }: WorkspaceProps) {
  const applicable = clauses.filter((c) => c.matches || c.overrideText);
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-2xl bg-paper px-4 py-3 text-sm text-ink/65 card-shadow">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-fern" aria-hidden />
        Clause selection is generated from the clause bank + this client&rsquo;s answers. Optional clauses
        can be disabled, and any clause text can be overridden for this matter only (audit-logged).
      </p>
      {applicable.map((c) => (
        <ClauseCard key={c.id} clause={c} matterId={matter.id} editable={viewer.canAct && ["in_review", "changes_requested", "approved"].includes(matter.status)} />
      ))}
    </div>
  );
}

function ClauseCard({ clause, matterId, editable }: { clause: ClauseRow; matterId: string; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function call(update: { enabled?: boolean; text?: string | null }) {
    start(async () => {
      await setClauseOverrideAction(matterId, clause.id, update);
      router.refresh();
    });
  }

  return (
    <Card className={cn("p-5 transition-opacity", clause.disabled && "opacity-60")} aria-label={`Clause: ${clause.title}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-ink">{clause.title}</h3>
          {clause.optional ? <Badge tone="neutral">optional</Badge> : <Badge tone="sky">mandatory</Badge>}
          {clause.overrideText && <Badge tone="gold">text overridden</Badge>}
          {clause.disabled && <Badge tone="red">disabled</Badge>}
          <Term label="why included" tip={clause.provenance.join("; ")} />
        </div>
        {editable && (
          <div className="flex items-center gap-2">
            {clause.optional && (
              <button
                type="button"
                disabled={pending}
                onClick={() => call({ enabled: clause.disabled })}
                className={cn("relative h-6 w-11 rounded-full transition-colors", clause.disabled ? "bg-ink/20" : "bg-eucalyptus")}
                role="switch"
                aria-checked={!clause.disabled}
                aria-label={`Include clause ${clause.title}`}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", clause.disabled ? "left-0.5" : "left-[22px]")} />
              </button>
            )}
            {clause.overrideText && (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setShowDiff(!showDiff)}>
                <GitCompareArrows className="h-3.5 w-3.5" aria-hidden /> {showDiff ? "Hide changes" : "View changes"}
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setEditing(!editing); setText(clause.overrideText ?? clause.rendered.join("\n\n")); }}>
              <FilePen className="h-3.5 w-3.5" aria-hidden /> {editing ? "Close editor" : clause.overrideText ? "Edit override" : "Override text"}
            </Button>
          </div>
        )}
      </div>

      {showDiff && clause.overrideText && !editing && (
        <div className="mt-3">
          <DiffViewer before={clause.bankText} after={clause.overrideText} mode="split" />
        </div>
      )}

      {!editing && !showDiff && (
        <div className="mt-3 space-y-2">
          {clause.rendered.length === 0 && !clause.disabled && (
            <p className="text-sm italic text-ink/45">No instance of this clause renders for the current answers.</p>
          )}
          {clause.rendered.map((t, i) => (
            <p key={i} className="rounded-xl bg-sand px-4 py-3 text-sm leading-relaxed text-ink/85">{t}</p>
          ))}
        </div>
      )}
      {editing && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-fern">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Rich-text override — variables still render per client
          </p>
          <RichTextEditor
            value={text}
            onChange={setText}
            variables={["fullName", "executorName", "executorAddress", "residuePrimary", "guardianName", "ultimateBeneficiary"]}
            placeholder="Write the clause exactly as it should appear…"
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button size="sm" loading={pending} onClick={() => { call({ text }); setEditing(false); }}>
              Save override
            </Button>
            {clause.overrideText && (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => { call({ text: null }); setEditing(false); }}>
                Reset to clause bank
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function NotesTab({ matterId, notes, canAct }: { matterId: string; notes: WorkspaceProps["notes"]; canAct: boolean }) {
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-4">
      {canAct && (
        <Card className="p-5">
          <label htmlFor="note" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-fern">
            Add internal note (never visible to the client)
          </label>
          <Textarea id="note" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[90px]" maxLength={4000} placeholder="Review observations, phone call summaries, risk assessment…" />
          {error && <p role="alert" className="mt-2 text-xs font-semibold text-danger">{error}</p>}
          <Button
            size="sm"
            className="mt-2.5"
            loading={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const r = await addNoteAction(matterId, draft);
                if (!r.ok) setError(r.error);
                else { setDraft(""); router.refresh(); }
              });
            }}
          >
            <NotebookPen className="h-3.5 w-3.5" aria-hidden /> Save note
          </Button>
        </Card>
      )}
      {notes.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink/55">No internal notes yet.</Card>
      ) : (
        notes.map((n) => (
          <Card key={n.id} className="p-5">
            <div className="flex items-center gap-2.5">
              <Avatar name={n.author.name} color={n.author.color} size="sm" />
              <p className="text-xs font-semibold text-ink/60">
                {n.author.name} · <time dateTime={n.createdAt}>{formatDateTime(n.createdAt)}</time>
              </p>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink/85">{n.body}</p>
          </Card>
        ))
      )}
    </div>
  );
}

function MessagesTab({ matterId, messages, canAct }: { matterId: string; messages: WorkspaceProps["messages"]; canAct: boolean }) {
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(true);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="max-h-[46vh] space-y-4 overflow-y-auto pr-1 nice-scroll">
          {messages.length === 0 && <p className="py-6 text-center text-sm text-ink/50">No messages on this matter yet.</p>}
          {messages.map((m) => (
            <div key={m.id} className="flex gap-3">
              <Avatar name={m.authorName} color={m.authorColor} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-ink/50">
                  {m.authorName} · {timeAgo(m.createdAt)}
                  {m.internal && <span className="ml-1.5 rounded bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#7A5C14]">internal</span>}
                </p>
                <p className={cn("mt-1 rounded-2xl px-4 py-2.5 text-sm leading-relaxed", m.internal ? "bg-[#FFFBEC] border border-gold/25" : "bg-sand")}>
                  {m.body}
                </p>
              </div>
            </div>
          ))}
        </div>
        {canAct ? (
          <div className="mt-4 border-t border-ink/10 pt-4">
            <label htmlFor="staff-msg" className="sr-only">Message</label>
            <Textarea id="staff-msg" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[80px]" maxLength={2000} placeholder={internal ? "Internal comment (lawyers only)…" : "Message to the client…"} />
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-ink/65">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-4 w-4 accent-eucalyptus" />
                Internal comment (hidden from client &amp; no email)
              </label>
              <Button
                size="sm"
                loading={pending}
                onClick={() => {
                  const body = draft.trim();
                  if (body.length < 2) return;
                  setDraft("");
                  start(async () => {
                    await sendClientMessageAction(matterId, body, internal);
                    router.refresh();
                  });
                }}
              >
                <Send className="h-3.5 w-3.5" aria-hidden /> Send
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 flex items-center gap-2 border-t border-ink/10 pt-4 text-xs text-ink/55">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Sign in as the assigned lawyer to reply.
          </p>
        )}
      </Card>
    </div>
  );
}

function VersionsTab({ versions }: { versions: WorkspaceProps["versions"] }) {
  if (versions.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-ink/55">
        No locked versions yet. A version is captured each time the client resubmits and when the will is
        approved.
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {versions
        .slice()
        .reverse()
        .map((v) => (
          <Card key={v.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-base font-semibold text-ink">Version {v.n}</p>
              <span className="text-xs text-ink/50">{formatDateTime(v.createdAt)} · {v.byName}</span>
            </div>
            <p className="mt-1 text-sm text-ink/65">{v.reason}</p>
            {v.changed.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-fern">Answers changed vs previous</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {v.changed.map((c) => (
                    <code key={c} className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[10px] text-[#7A5C14]">{c}</code>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
    </div>
  );
}

function AuditTab({ entries }: { entries: WorkspaceProps["audit"] }) {
  if (entries.length === 0) return <Card className="p-8 text-center text-sm text-ink/55">No audit entries for this matter yet.</Card>;
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-ink/5">
        {entries.map((e) => (
          <li key={e.id} className="flex items-start gap-3 px-5 py-3.5">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-eucalyptus" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{e.summary}</p>
              <p className="mt-0.5 text-xs text-ink/50">
                <code className="rounded bg-ink/6 px-1 py-0.5 font-mono text-[10px]">{e.action}</code> · {e.actor} ({e.actorRole.replace("_", " ")}) · <time dateTime={e.at}>{formatDateTime(e.at)}</time>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
