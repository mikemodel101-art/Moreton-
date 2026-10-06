import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { canSeeMatter, clientOf, db, getMatter, lawyerOf, getUser } from "@/lib/store";
import { getSections } from "@/lib/config";
import { sectionVisible, visibleQuestions } from "@/lib/validation";
import { answerDisplay, repeaterRows } from "@/lib/format";
import { buildWillDocument, selectVariant } from "@/lib/clauseEngine";
import { computeComplexity, evalCondition } from "@/lib/engine";
import { APPROVAL_CHECKLIST } from "@/lib/review";
import { clauseProvenance } from "@/lib/provenance";
import { LawyerWorkspace } from "@/components/lawyer-workspace";

export const metadata: Metadata = { title: "Matter review" };

export default async function LawyerMatterPage({ params }: { params: Promise<{ matterId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["lawyer", "senior_lawyer", "admin", "observer"].includes(user.role)) redirect("/app");
  const { matterId } = await params;
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(user, matter)) notFound();

  const client = clientOf(matter)!;
  const lawyer = lawyerOf(matter);
  const approver = matter.approvedBy ? getUser(matter.approvedBy) : null;
  const signOff = matter.signedOffBy ? getUser(matter.signedOffBy) : null;

  const sections = getSections();
  const answerGroups = sections
    .filter((s) => sectionVisible(s, matter.answers))
    .map((s) => ({
      id: s.id,
      title: s.title,
      items: visibleQuestions(s, matter.answers).map((q) => ({
        id: q.id,
        label: q.label,
        display: answerDisplay(q, matter.answers[q.id]),
        rows: q.type === "repeater" ? repeaterRows(q, matter.answers[q.id]) : [],
      })),
    }));

  const doc = buildWillDocument(matter, client, db().clauses);
  const rendered = new Map<string, string[]>();
  for (const s of doc.sections) for (const c of s.clauses) rendered.set(c.clauseId, c.texts);

  const clauses = db()
    .clauses.sort((a, b) => a.order - b.order)
    .map((c) => {
      const override = matter.clauseOverrides[c.id];
      const matches = c.include === null || c.include === undefined || evalCondition(c.include, matter.answers);
      const variant = selectVariant(c, matter.answers);
      return {
        id: c.id,
        title: c.title,
        category: c.section,
        optional: c.optional,
        matches,
        disabled: override?.enabled === false,
        overrideText: override?.text ?? null,
        rendered: rendered.get(c.id) ?? [],
        bankText: variant?.text ?? "",
        provenance: clauseProvenance(c.include, matter.answers),
        variantId: variant?.id ?? null,
        version: c.version,
        draft: !c.approvedBy,
        lawyerNotes: c.lawyerNotes,
      };
    });

  const notes = db()
    .notes.filter((n) => n.matterId === matter.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt,
      author: (() => {
        const a = getUser(n.authorId);
        return a ? { name: a.name, color: a.color } : { name: "Unknown", color: "#888" };
      })(),
    }));

  const messages = db()
    .messages.filter((m) => m.matterId === matter.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((m) => {
      const author = getUser(m.fromId);
      return {
        id: m.id,
        body: m.body,
        internal: m.internal,
        createdAt: m.createdAt,
        mine: m.fromId === user.id,
        authorName: author?.name ?? "Unknown",
        authorColor: author?.color ?? "#888",
        authorRole: author?.role ?? "client",
      };
    });

  const audit = db()
    .audit.filter((a) => a.entityId === matter.id || String(a.entityId).startsWith(matter.id + ":"))
    .slice(0, 30)
    .map((a) => ({
      id: a.id,
      at: a.at,
      action: a.action,
      summary: a.summary,
      actorRole: a.actorRole,
      actor: getUser(a.actorId)?.name ?? a.actorId,
    }));

  const complexity = computeComplexity(matter.flags);
  const exportable = ["in_review", "changes_requested", "approved", "issued"].includes(matter.status);
  const needsSignOff = matter.flags.some((f) => f.requiresSeniorSignOff) && !matter.signedOffBy;
  const canAct = (user.role === "lawyer" || user.role === "senior_lawyer") && canSeeMatter(user, matter);

  return (
    <LawyerWorkspace
      viewer={{
        id: user.id,
        role: user.role,
        name: user.name,
        canAct,
        isSenior: user.role === "senior_lawyer",
        isObserver: user.role === "observer",
        isAdmin: user.role === "admin",
      }}
      matter={{
        id: matter.id,
        ref: matter.ref,
        status: matter.status,
        reviewRound: matter.reviewRound,
        planName: db().plans.find((p) => p.id === matter.planId)?.name ?? matter.planId,
        createdAt: matter.createdAt,
        submittedAt: matter.submittedAt,
        paidAt: matter.paidAt,
        approvedAt: matter.approvedAt,
        issuedAt: matter.issuedAt,
        pendingSignOff: matter.pendingSignOff,
        needsSignOff,
        signedOffByName: signOff?.name ?? null,
        approvedByName: approver?.name ?? null,
        payment: matter.payment
          ? { total: matter.payment.total, promoCode: matter.payment.promoCode ?? null, last4: matter.payment.last4, paidAt: matter.payment.paidAt }
          : null,
      }}
      client={{ name: client.name, email: client.email, color: client.color }}
      lawyer={lawyer ? { name: lawyer.name, id: lawyer.id } : null}
      flags={matter.flags}
      flagRows={matter.flags.map((f) => {
        const res = matter.flagResolutions[f.id];
        return {
          ...f,
          state: res?.state ?? "open",
          note: res?.note,
          byName: res ? (getUser(res.byUserId)?.name ?? res.byUserId) : undefined,
          at: res?.at,
        };
      })}
      complexity={{
        score: complexity.score,
        label: complexity.label,
        routing: complexity.routing,
        sla: complexity.sla,
        blocked: complexity.blocked,
      }}
      checklist={matter.approvalChecklist}
      checklistItems={APPROVAL_CHECKLIST}
      versions={matter.versions.map((v, i) => {
        const prev = matter.versions[i - 1]?.answers ?? {};
        const keys = new Set([...Object.keys(prev), ...Object.keys(v.answers)]);
        const changed = [...keys].filter(
          (k) => JSON.stringify((prev as Record<string, unknown>)[k]) !== JSON.stringify((v.answers as Record<string, unknown>)[k])
        );
        return {
          id: v.id,
          n: v.n,
          createdAt: v.createdAt,
          byName: getUser(v.byUserId)?.name ?? v.byUserId,
          reason: v.reason,
          changed: i === 0 ? [] : changed.slice(0, 12),
        };
      })}
      answerGroups={answerGroups}
      clauses={clauses}
      notes={notes}
      messages={messages}
      audit={audit}
      exportable={exportable}
    />
  );
}
