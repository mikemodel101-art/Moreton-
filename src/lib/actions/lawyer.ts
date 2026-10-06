"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  addAudit,
  canSeeMatter,
  db,
  getMatter,
  getUser,
  highFlagsUnresolved,
  setStatus,
  snapshotVersion,
  touchMatter,
  uid,
  unresolvedFlags,
} from "@/lib/store";
import type { User } from "@/lib/types";
import { emailShell } from "@/lib/emails";
import { APPROVAL_CHECKLIST } from "@/lib/review";
import type { ActionResult } from "./auth";

async function requireReviewer(): Promise<User | { error: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in first." };
  if (user.role === "observer") return { error: "Read-only demo observer cannot make changes." };
  if (user.role !== "lawyer" && user.role !== "senior_lawyer") {
    return { error: "Only reviewing lawyers can perform this action. (Admin manages the platform and cannot approve wills.)" };
  }
  return user;
}

function refresh(matterId: string) {
  revalidatePath(`/lawyer/matters/${matterId}`);
  revalidatePath("/lawyer");
}

export async function assignToMeAction(matterId: string): Promise<ActionResult> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  const matter = getMatter(matterId);
  if (!matter) return { ok: false, error: "Matter not found." };
  if (matter.assignedLawyerId) return { ok: false, error: "This matter is already assigned." };
  matter.assignedLawyerId = r.id;
  touchMatter(matter);
  addAudit({
    actorId: r.id,
    actorRole: r.role,
    action: "matter.assigned",
    entityType: "matter",
    entityId: matter.id,
    summary: `${r.name} took matter ${matter.ref}`,
  });
  refresh(matterId);
  return { ok: true };
}

export async function reassignMatterAction(matterId: string, lawyerId: string): Promise<ActionResult> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  if (r.role !== "senior_lawyer") return { ok: false, error: "Only the Senior Lawyer can reassign matters." };
  const matter = getMatter(matterId);
  if (!matter) return { ok: false, error: "Matter not found." };
  const target = getUser(lawyerId);
  if (!target || (target.role !== "lawyer" && target.role !== "senior_lawyer")) {
    return { ok: false, error: "Choose a valid lawyer." };
  }
  const before = matter.assignedLawyerId;
  matter.assignedLawyerId = target.id;
  touchMatter(matter);
  addAudit(
    {
      actorId: r.id,
      actorRole: r.role,
      action: "matter.reassigned",
      entityType: "matter",
      entityId: matter.id,
      summary: `${matter.ref} reassigned to ${target.name}`,
    },
    before,
    target.id
  );
  refresh(matterId);
  return { ok: true };
}

export async function addNoteAction(matterId: string, body: string): Promise<ActionResult> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(r, matter)) return { ok: false, error: "Matter not found." };
  const text = (body ?? "").trim();
  if (text.length < 2) return { ok: false, error: "Note is too short." };
  if (text.length > 4000) return { ok: false, error: "Keep notes under 4000 characters." };
  db().notes.push({ id: uid("n"), matterId, authorId: r.id, body: text, createdAt: new Date().toISOString() });
  addAudit({
    actorId: r.id,
    actorRole: r.role,
    action: "note.added",
    entityType: "matter",
    entityId: matter.id,
    summary: `Internal note added to ${matter.ref}`,
  });
  refresh(matterId);
  return { ok: true };
}

const changesSchema = z.string().trim().min(10, "Explain what the client needs to change (min 10 characters)").max(2000);

export async function requestChangesAction(matterId: string, body: string): Promise<ActionResult> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(r, matter)) return { ok: false, error: "Matter not found." };
  if (matter.status !== "in_review") return { ok: false, error: "Changes can only be requested while a matter is in review." };
  const parsed = changesSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message" };

  setStatus(matter, "changes_requested", r, `Requested changes on ${matter.ref}: ${parsed.data.slice(0, 140)}`);
  db().messages.push({ id: uid("msg"), matterId, fromId: r.id, body: parsed.data, internal: false, createdAt: new Date().toISOString() });
  const client = getUser(matter.clientId)!;
  db().mail.unshift({
    id: uid("mail"),
    toEmail: client.email,
    toName: client.name,
    subject: "Action needed — a change to your will answers",
    kind: "changes_requested",
    matterId,
    createdAt: new Date().toISOString(),
    html: emailShell(
      "A quick change is needed",
      `<p>Hi ${client.name.split(" ")[0]} — ${r.name} has reviewed your will and needs a clarification:</p><blockquote style="border-left:3px solid #B08D2E;margin:12px 0;padding:4px 12px;color:#444">${parsed.data.replace(/</g, "&lt;")}</blockquote><p><a href="#" style="color:#1C4634">Log in to update your answers →</a></p>`
    ),
  });
  refresh(matterId);
  return { ok: true };
}

export async function approveMatterAction(matterId: string): Promise<ActionResult<{ needsSignOff?: boolean }>> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(r, matter)) return { ok: false, error: "Matter not found." };
  if (matter.status !== "in_review") return { ok: false, error: "Only matters in review can be approved." };

  // Gate 1: every blocking flag must be acknowledged or resolved
  const outstanding = unresolvedFlags(matter);
  if (outstanding.length > 0) {
    return {
      ok: false,
      error: `${outstanding.length} flag${outstanding.length > 1 ? "s" : ""} still need acknowledging or resolving: ${outstanding.map((f) => f.label).join(", ")}.`,
    };
  }
  // Gate 2: high/blocker flags need an explicit resolution, not just an acknowledgement
  const unresolvedHigh = highFlagsUnresolved(matter);
  if (unresolvedHigh.length > 0 && r.role !== "senior_lawyer") {
    return {
      ok: false,
      error: `High-severity flags must be resolved by the Senior Lawyer before approval: ${unresolvedHigh.map((f) => f.label).join(", ")}.`,
    };
  }
  // Gate 3: approval checklist complete
  const missing = APPROVAL_CHECKLIST.filter((c) => !matter.approvalChecklist[c.key]);
  if (missing.length > 0) {
    return { ok: false, error: `Complete the approval checklist first — outstanding: ${missing.map((m) => m.label).join("; ")}.` };
  }

  const needsSignOff = matter.flags.some((f) => f.requiresSeniorSignOff) && !matter.signedOffBy;

  if (needsSignOff && r.role !== "senior_lawyer") {
    matter.pendingSignOff = true;
    touchMatter(matter);
    addAudit({
      actorId: r.id,
      actorRole: r.role,
      action: "signoff.requested",
      entityType: "matter",
      entityId: matter.id,
      summary: `Approval of ${matter.ref} requires Senior Lawyer sign-off (flags: ${matter.flags.filter((f) => f.requiresSeniorSignOff).map((f) => f.label).join(", ")})`,
    });
    const senior = db().users.find((u) => u.role === "senior_lawyer");
    const client = getUser(matter.clientId)!;
    if (senior) {
      db().mail.unshift({
        id: uid("mail"),
        toEmail: senior.email,
        toName: senior.name,
        subject: `Sign-off requested: ${matter.ref} (${client.name})`,
        kind: "internal_signoff",
        matterId,
        createdAt: new Date().toISOString(),
        html: emailShell("Senior sign-off requested", `<p>${r.name} recommends approving ${matter.ref} (${client.name}). Triage flags require your sign-off: <strong>${matter.flags.filter((f) => f.requiresSeniorSignOff).map((f) => f.label).join(", ")}</strong>.</p><p><a href="#" style="color:#1C4634">Review in the console →</a></p>`),
      });
    }
    refresh(matterId);
    return { ok: true, data: { needsSignOff: true } };
  }

  if (needsSignOff && r.role === "senior_lawyer") {
    matter.signedOffBy = r.id;
    addAudit({
      actorId: r.id,
      actorRole: r.role,
      action: "signoff.granted",
      entityType: "matter",
      entityId: matter.id,
      summary: `Senior Lawyer sign-off granted by ${r.name} on ${matter.ref}`,
    });
  }
  matter.pendingSignOff = false;
  matter.approvedBy = r.id;
  matter.approvedAt = new Date().toISOString();
  snapshotVersion(matter, r.id, `Approved by ${r.name}`);
  setStatus(matter, "approved", r, `Will ${matter.ref} approved — ready for issue`);
  const client = getUser(matter.clientId)!;
  db().mail.unshift({
    id: uid("mail"),
    toEmail: client.email,
    toName: client.name,
    subject: "Your will has been approved",
    kind: "approved",
    matterId,
    createdAt: new Date().toISOString(),
    html: emailShell("Your will is approved", `<p>Good news, ${client.name.split(" ")[0]} — ${r.name} has approved your will. It will now be prepared for formal issue and you'll receive signing instructions shortly.</p>`),
  });
  refresh(matterId);
  return { ok: true, data: { needsSignOff: false } };
}

export async function signOffMatterAction(matterId: string): Promise<ActionResult> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  if (r.role !== "senior_lawyer") return { ok: false, error: "Only the Senior Lawyer can sign off flagged matters." };
  const matter = getMatter(matterId);
  if (!matter) return { ok: false, error: "Matter not found." };
  if (!matter.flags.some((f) => f.requiresSeniorSignOff)) return { ok: false, error: "This matter does not require sign-off." };
  if (matter.signedOffBy) return { ok: false, error: "Already signed off." };
  matter.signedOffBy = r.id;
  addAudit({
    actorId: r.id,
    actorRole: r.role,
    action: "signoff.granted",
    entityType: "matter",
    entityId: matter.id,
    summary: `Senior Lawyer sign-off granted by ${r.name} on ${matter.ref}`,
  });
  if (matter.pendingSignOff && matter.status === "in_review") {
    matter.pendingSignOff = false;
    matter.approvedBy = r.id;
    matter.approvedAt = new Date().toISOString();
    setStatus(matter, "approved", r, `Will ${matter.ref} approved with senior sign-off`);
    const client = getUser(matter.clientId)!;
    db().mail.unshift({
      id: uid("mail"),
      toEmail: client.email,
      toName: client.name,
      subject: "Your will has been approved",
      kind: "approved",
      matterId,
      createdAt: new Date().toISOString(),
      html: emailShell("Your will is approved", `<p>Good news, ${client.name.split(" ")[0]} — your will passed senior review and has been approved. Issue will follow shortly.</p>`),
    });
  } else {
    touchMatter(matter);
  }
  refresh(matterId);
  return { ok: true };
}

export async function rejectMatterAction(matterId: string, reason: string): Promise<ActionResult> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(r, matter)) return { ok: false, error: "Matter not found." };
  if (matter.status !== "in_review") return { ok: false, error: "Only matters in review can be rejected." };
  const parsed = changesSchema.safeParse(reason);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Give a reason" };
  setStatus(matter, "changes_requested", r, `Matter ${matter.ref} returned to client (not suitable for online service): ${parsed.data.slice(0, 120)}`);
  db().messages.push({ id: uid("msg"), matterId, fromId: r.id, body: `Your will isn't suitable for our online service: ${parsed.data} We'll contact you about an in-person appointment.`, internal: false, createdAt: new Date().toISOString() });
  refresh(matterId);
  return { ok: true };
}

export async function issueMatterAction(matterId: string): Promise<ActionResult> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(r, matter)) return { ok: false, error: "Matter not found." };
  if (matter.status !== "approved") return { ok: false, error: "Only approved wills can be issued." };
  if (matter.flags.some((f) => f.requiresSeniorSignOff) && !matter.signedOffBy) {
    return { ok: false, error: "This matter carries flags that require Senior Lawyer sign-off before issue." };
  }
  matter.issuedAt = new Date().toISOString();
  setStatus(matter, "issued", r, `Will ${matter.ref} issued to client`);
  const client = getUser(matter.clientId)!;
  db().mail.unshift({
    id: uid("mail"),
    toEmail: client.email,
    toName: client.name,
    subject: "Your will is ready to sign",
    kind: "issued",
    matterId,
    createdAt: new Date().toISOString(),
    html: emailShell(
      "Your will has been issued",
      `<p>Dear ${client.name.split(" ")[0]}, your will has been reviewed, approved and issued. Download it from your dashboard.</p><p><strong>Signing checklist:</strong></p><ol><li>Print single-sided.</li><li>Sign each page in blue pen with two adult witnesses present together.</li><li>Witnesses must not be beneficiaries.</li><li>Store the original safely and tell your executor where it is.</li></ol><p style="font-size:12px;color:#5C8374">Signing requirements: s 10 Succession Act 1981 (Qld).</p>`
    ),
  });
  refresh(matterId);
  return { ok: true };
}

export async function resolveFlagAction(
  matterId: string,
  flagId: string,
  state: "acknowledged" | "resolved" | "escalated",
  note?: string
): Promise<ActionResult> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(r, matter)) return { ok: false, error: "Matter not found." };
  const flag = matter.flags.find((f) => f.id === flagId);
  if (!flag) return { ok: false, error: "That flag is no longer raised on this matter." };
  if (state === "resolved" && (flag.severity === "high" || flag.severity === "blocker") && r.role !== "senior_lawyer") {
    return { ok: false, error: `${flag.severity === "blocker" ? "Blocker" : "High-severity"} flags can only be resolved by the Senior Lawyer. Use Escalate instead.` };
  }
  if (state === "resolved" && !note?.trim()) {
    return { ok: false, error: "Resolving a flag requires a file note." };
  }
  const before = matter.flagResolutions[flagId] ?? null;
  matter.flagResolutions[flagId] = {
    flagId,
    state,
    note: note?.trim().slice(0, 2000),
    byUserId: r.id,
    at: new Date().toISOString(),
  };
  if (state === "escalated") matter.pendingSignOff = true;
  touchMatter(matter);
  addAudit(
    {
      actorId: r.id,
      actorRole: r.role,
      action: `flag.${state}`,
      entityType: "flag",
      entityId: `${matter.id}:${flagId}`,
      summary: `${r.name} ${state} flag "${flag.label}" (${flag.severity}) on ${matter.ref}${note ? ` — ${note.slice(0, 120)}` : ""}`,
    },
    before,
    matter.flagResolutions[flagId]
  );
  if (state === "escalated") {
    const senior = db().users.find((u) => u.role === "senior_lawyer");
    if (senior) {
      db().mail.unshift({
        id: uid("mail"),
        toEmail: senior.email,
        toName: senior.name,
        subject: `Escalated: ${flag.label} on ${matter.ref}`,
        kind: "internal_signoff",
        matterId,
        createdAt: new Date().toISOString(),
        html: emailShell("Flag escalated", `<p>${r.name} escalated <strong>${flag.label}</strong> (${flag.severity}) on ${matter.ref}.</p><p>${flag.lawyerMessage}</p>${note ? `<blockquote style="border-left:3px solid #C29B3C;padding-left:12px">${note.replace(/</g, "&lt;")}</blockquote>` : ""}`),
      });
    }
  }
  refresh(matterId);
  return { ok: true };
}

export async function setChecklistAction(
  matterId: string,
  key: string,
  value: boolean
): Promise<ActionResult> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(r, matter)) return { ok: false, error: "Matter not found." };
  matter.approvalChecklist = { ...matter.approvalChecklist, [key]: value };
  touchMatter(matter);
  addAudit({
    actorId: r.id,
    actorRole: r.role,
    action: "approval.checklist",
    entityType: "matter",
    entityId: matter.id,
    summary: `Approval checklist "${key}" ${value ? "ticked" : "un-ticked"} on ${matter.ref}`,
  });
  refresh(matterId);
  return { ok: true };
}

export async function setClauseOverrideAction(
  matterId: string,
  clauseId: string,
  update: { enabled?: boolean; text?: string | null }
): Promise<ActionResult> {
  const r = await requireReviewer();
  if ("error" in r) return { ok: false, error: r.error };
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(r, matter)) return { ok: false, error: "Matter not found." };
  if (matter.status === "issued" || matter.status === "draft" || matter.status === "awaiting_payment") {
    return { ok: false, error: "Clauses can be adjusted once the matter is in review, and not after issue." };
  }
  const known = db().clauses.find((c) => c.id === clauseId);
  if (!known) return { ok: false, error: "Unknown clause." };
  const before = matter.clauseOverrides[clauseId] ? { ...matter.clauseOverrides[clauseId] } : null;
  const next = { ...(before ?? {}) } as { enabled?: boolean; text?: string };
  if (update.enabled !== undefined) next.enabled = update.enabled;
  if (update.text !== undefined) {
    if (update.text === null || update.text.trim() === "") delete next.text;
    else next.text = update.text.trim().slice(0, 4000);
  }
  if (next.enabled === undefined && next.text === undefined) delete matter.clauseOverrides[clauseId];
  else matter.clauseOverrides[clauseId] = next;
  touchMatter(matter);
  addAudit(
    {
      actorId: r.id,
      actorRole: r.role,
      action: "clause.override",
      entityType: "clause",
      entityId: `${matter.id}:${clauseId}`,
      summary: `${r.name} ${next.enabled === false ? "disabled" : next.text ? "overrode text of" : "adjusted"} clause "${clauseId}" on ${matter.ref}`,
    },
    before,
    next
  );
  refresh(matterId);
  revalidatePath(`/app/documents/${matterId}`);
  return { ok: true };
}
