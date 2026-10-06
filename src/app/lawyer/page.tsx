import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Briefcase, CircleAlert, Hourglass, Inbox, LayoutGrid, List, StampIcon } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { db, mattersForLawyer, clientOf, lawyerOf } from "@/lib/store";
import { formatDate, timeAgo } from "@/lib/engine";
import { Avatar, Badge, Card, FlagChip, StatusPill, cn } from "@/components/ui";
import { TakeMatterButton, ReassignSelect } from "@/components/lawyer-actions";
import { LawyerBoard } from "@/components/lawyer-board";
import { CountUp, Stagger, StaggerItem } from "@/components/design-system";
import type { Matter } from "@/lib/types";

export const metadata: Metadata = { title: "Review queue" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "in_review", label: "In review" },
  { id: "awaiting_client", label: "Awaiting client" },
  { id: "ready", label: "Ready to approve" },
  { id: "approved", label: "Approved" },
  { id: "mine", label: "Mine" },
  { id: "complex", label: "Complex" },
  { id: "sla", label: "SLA risk" },
] as const;

/** Business-day age of a matter since it entered review. */
function daysWaiting(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default async function LawyerQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; v?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["lawyer", "senior_lawyer", "admin", "observer"].includes(user.role)) redirect("/app");
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.id === sp.f) ? sp.f! : user.role === "lawyer" ? "mine" : "all";
  const view = sp.v === "kanban" ? "kanban" : "list";

  const all = mattersForLawyer(user);
  const lawyers = db().users.filter((u) => u.role === "lawyer" || u.role === "senior_lawyer");

  const readyToApprove = (m: Matter) =>
    m.status === "in_review" &&
    m.flags.filter((f) => f.blocksAutoApproval).every((f) => {
      const s = m.flagResolutions[f.id]?.state;
      return s === "resolved" || s === "acknowledged";
    });

  const filtered = all.filter((m) => {
    switch (filter) {
      case "new":
        return m.status === "in_review" && m.assignedLawyerId === null;
      case "in_review":
        return m.status === "in_review";
      case "awaiting_client":
        return m.status === "changes_requested";
      case "ready":
        return readyToApprove(m);
      case "approved":
        return m.status === "approved" || m.status === "issued";
      case "mine":
        return m.assignedLawyerId === user.id;
      case "complex":
        return m.complexityBand === "complex" || m.flags.some((f) => f.severity === "high" || f.severity === "blocker");
      case "sla":
        return m.status === "in_review" && daysWaiting(m.paidAt) > 2;
      default:
        return true;
    }
  });

  const inReviewMatters = all.filter((m) => m.status === "in_review");
  const avgWait =
    inReviewMatters.length > 0
      ? Math.round((inReviewMatters.reduce((s, m) => s + daysWaiting(m.paidAt), 0) / inReviewMatters.length) * 10) / 10
      : 0;
  const stats = {
    waiting: inReviewMatters.length,
    avgDays: avgWait,
    complex: all.filter((m) => m.complexityBand === "complex").length,
    sla: inReviewMatters.filter((m) => daysWaiting(m.paidAt) > 2).length,
  };

  return (
    <ConsoleShell
      title="Lawyer review console"
      subtitle="Triage, review and issue online wills"
      currentPath="/lawyer"
      allowedRoles={["lawyer", "senior_lawyer", "admin", "observer"]}
      nav={[
        { href: "/lawyer", label: "Review queue", exact: true, icon: <Briefcase className="h-4 w-4" aria-hidden /> },
        ...(["senior_lawyer", "admin", "observer"].includes(user.role)
          ? [{ href: "/lawyer/audit", label: "Audit log", icon: <StampIcon className="h-4 w-4" aria-hidden /> }]
          : []),
      ]}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Matters waiting", value: stats.waiting, suffix: "", icon: Hourglass, tone: "text-eucalyptus bg-eucalyptus/10" },
          { label: "Avg days in review", value: stats.avgDays, suffix: "d", icon: Inbox, tone: "text-[#7A5C14] bg-gold/15" },
          { label: "Complex matters", value: stats.complex, suffix: "", icon: CircleAlert, tone: "text-clay bg-clay/10" },
          { label: "SLA breach (>2d)", value: stats.sla, suffix: "", icon: Briefcase, tone: stats.sla > 0 ? "text-danger bg-danger/10" : "text-ink/60 bg-ink/8" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`} aria-hidden>
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-2xl font-semibold text-ink">
                <CountUp value={s.value} suffix={s.suffix} />
              </p>
              <p className="text-xs font-semibold text-ink/55">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter chips + view toggle */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter matters">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={`/lawyer?f=${f.id}&v=${view}`}
              role="tab"
              aria-selected={filter === f.id}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.id ? "bg-eucalyptus text-paper" : "border border-ink/15 bg-paper text-ink/65 hover:bg-sand"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex rounded-full border border-ink/15 bg-paper p-1 text-xs font-semibold" role="tablist" aria-label="View">
          <Link href={`/lawyer?f=${filter}&v=list`} role="tab" aria-selected={view === "list"} className={cn("flex items-center gap-1.5 rounded-full px-3.5 py-1.5", view === "list" ? "bg-ink text-paper" : "text-ink/60")}>
            <List className="h-3.5 w-3.5" aria-hidden /> List
          </Link>
          <Link href={`/lawyer?f=${filter}&v=kanban`} role="tab" aria-selected={view === "kanban"} className={cn("flex items-center gap-1.5 rounded-full px-3.5 py-1.5", view === "kanban" ? "bg-ink text-paper" : "text-ink/60")}>
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden /> Board
          </Link>
        </div>
      </div>

      {/* Queue */}
      {view === "kanban" ? (
        <div className="mt-4">
          <LawyerBoard
            canAct={user.role === "lawyer" || user.role === "senior_lawyer"}
            isSenior={user.role === "senior_lawyer"}
            columns={[
              {
                id: "unassigned",
                title: "Unassigned",
                items: all
                  .filter((m) => m.assignedLawyerId === null && ["in_review", "changes_requested"].includes(m.status))
                  .map((m) => boardItem(m)),
              },
              {
                id: "review",
                title: "In review",
                items: all.filter((m) => m.status === "in_review" && m.assignedLawyerId !== null && !m.pendingSignOff).map((m) => boardItem(m)),
              },
              {
                id: "signoff",
                title: "Await sign-off",
                items: all.filter((m) => m.pendingSignOff || (m.flags.some((f) => f.requiresSeniorSignOff) && !m.signedOffBy && m.status === "in_review")).map((m) => boardItem(m)),
              },
              {
                id: "changes",
                title: "With client",
                items: all.filter((m) => m.status === "changes_requested" && m.assignedLawyerId !== null).map((m) => boardItem(m)),
              },
              {
                id: "approved",
                title: "Approved",
                items: all.filter((m) => m.status === "approved").map((m) => boardItem(m)),
              },
              {
                id: "issued",
                title: "Issued",
                items: all.filter((m) => m.status === "issued").map((m) => boardItem(m)),
              },
            ]}
          />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="mt-4 p-10 text-center text-sm text-ink/55">
          Nothing in this view. Switch filters above to see more matters.
        </Card>
      ) : (
        <Stagger className="mt-4 space-y-3" >
          {filtered.map((m) => (
            <StaggerItem key={m.id}>
              <MatterRow matter={m} viewerRole={user.role} viewerId={user.id} lawyers={lawyers.map((l) => ({ id: l.id, name: l.name }))} observer={user.role === "observer"} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </ConsoleShell>
  );
}

function boardItem(m: Matter) {
  const client = clientOf(m);
  return {
    id: `kb-${m.id}`,
    title: `${m.ref} · ${client?.name.split(" ")[0]} ${client?.name.split(" ").slice(-1)}`,
    sub: `${db().plans.find((p) => p.id === m.planId)?.name ?? ""} · ${timeAgo(m.updatedAt)}`,
    meta: (
      <span className="flex flex-wrap gap-1">
        {m.flags.slice(0, 2).map((f) => (
          <FlagChip key={f.id} flag={f} />
        ))}
      </span>
    ),
  };
}

function MatterRow({
  matter,
  viewerRole,
  viewerId,
  lawyers,
  observer,
}: {
  matter: Matter;
  viewerRole: string;
  viewerId: string;
  lawyers: { id: string; name: string }[];
  observer: boolean;
}) {
  const client = clientOf(matter);
  const lawyer = lawyerOf(matter);
  const needsSignoff = matter.flags.some((f) => f.requiresSeniorSignOff) && !matter.signedOffBy;

  return (
    <div>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {client && <Avatar name={client.name} color={client.color} size="lg" />}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/lawyer/matters/${matter.id}`} className="font-display text-lg font-semibold text-ink hover:text-eucalyptus hover:underline">
                  {client?.name}
                </Link>
                <StatusPill status={matter.status} />
                {matter.pendingSignOff && <Badge tone="red">awaiting senior sign-off</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-ink/55">
                {matter.ref} · {db().plans.find((p) => p.id === matter.planId)?.name} · round {matter.reviewRound} · updated {timeAgo(matter.updatedAt)}
                {matter.paidAt && ` · paid ${formatDate(matter.paidAt)}`}
              </p>
              {matter.flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {matter.flags.map((f) => (
                    <FlagChip key={f.id} flag={f} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href={`/lawyer/matters/${matter.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-eucalyptus px-4 py-2 text-xs font-bold text-paper hover:bg-moss"
            >
              Open review <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            {lawyer ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink/55">Assigned to {lawyer.id === viewerId ? "you" : lawyer.name}</span>
                {viewerRole === "senior_lawyer" && !observer && (
                  <ReassignSelect matterId={matter.id} lawyers={lawyers} currentId={lawyer.id} />
                )}
              </div>
            ) : (
              !observer && ["in_review", "changes_requested"].includes(matter.status) && (
                <TakeMatterButton matterId={matter.id} />
              )
            )}
          </div>
        </div>
        {needsSignoff && (
          <p className="mt-3 rounded-xl bg-clay/10 px-3.5 py-2 text-xs font-semibold text-clay">
            Flags require Senior Lawyer sign-off before this will can be issued.
          </p>
        )}
      </Card>
    </div>
  );
}
