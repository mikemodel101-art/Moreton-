"use client";

import { Badge, Avatar } from "@/components/ui";
import { DataTable } from "@/components/design-system";

export interface AuditRow extends Record<string, unknown> {
  id: string;
  at: string;
  atLabel: string;
  actorName: string;
  actorColor: string;
  actorRole: string;
  action: string;
  summary: string;
  ba: string | null;
}

const ACTION_TONE: Record<string, Parameters<typeof Badge>[0]["tone"]> = {
  "auth.login": "neutral",
  "auth.persona_switch": "neutral",
  "matter.created": "sky",
  "matter.status": "sky",
  "matter.assigned": "sky",
  "matter.reassigned": "sky",
  "matter.approved": "green",
  "matter.issued": "green",
  "payment.completed": "gold",
  "changes.requested": "clay",
  "signoff.requested": "clay",
  "signoff.granted": "green",
  "answer.edited_after_submission": "red",
  "clause.override": "red",
  "clausebank.updated": "gold",
  "clausebank.toggled": "gold",
  "user.role_changed": "red",
  "promo.created": "gold",
  "promo.updated": "gold",
  "promo.activated": "gold",
  "promo.deactivated": "gold",
  "plan.price_changed": "gold",
  "questions.updated": "gold",
  "export.generated": "sky",
  "message.sent": "neutral",
  "note.added": "neutral",
  "demo.reset": "clay",
};

export function AuditLogView({ rows }: { rows: AuditRow[] }) {
  return (
    <DataTable<AuditRow>
      caption="Audit log of every state change in the prototype"
      rows={rows}
      pageSize={12}
      searchPlaceholder="Search actor, action, summary…"
      columns={[
        { key: "atLabel", label: "Time", sortable: true, sortValue: (r) => r.at },
        {
          key: "actorName",
          label: "Actor",
          sortable: true,
          render: (r) => (
            <span className="flex items-center gap-2">
              <Avatar name={r.actorName} color={r.actorColor} size="sm" />
              <span>
                <span className="block text-xs font-semibold">{r.actorName}</span>
                <span className="block text-[10px] uppercase tracking-wide text-ink/45">{r.actorRole.replace("_", " ")}</span>
              </span>
            </span>
          ),
        },
        {
          key: "action",
          label: "Action",
          sortable: true,
          render: (r) => <Badge tone={ACTION_TONE[r.action] ?? "neutral"}>{r.action}</Badge>,
        },
        { key: "summary", label: "Summary", render: (r) => <span className="block max-w-[360px] text-xs leading-relaxed">{r.summary}</span> },
        {
          key: "ba",
          label: "Before → After",
          render: (r) =>
            r.ba ? (
              <code className="block max-w-[240px] whitespace-pre-wrap break-all rounded bg-ink/6 px-2 py-1 font-mono text-[10px] leading-relaxed text-ink/70">
                {r.ba}
              </code>
            ) : (
              <span className="text-xs text-ink/35">—</span>
            ),
        },
      ]}
    />
  );
}
