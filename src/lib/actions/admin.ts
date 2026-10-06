"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { addAudit, db } from "@/lib/store";
import type { Role, User } from "@/lib/types";
import type { ActionResult } from "./auth";
import questionsConfig from "../../../config/questions.json";

const ROLES: Role[] = ["client", "lawyer", "senior_lawyer", "admin", "observer"];

async function requireAdmin(): Promise<User | { error: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in." };
  if (user.role === "observer") return { error: "Read-only demo observer cannot make changes." };
  if (user.role !== "admin") return { error: "Only the Admin can change system configuration." };
  return user;
}

export async function updateUserRoleAction(userId: string, role: Role): Promise<ActionResult> {
  const r = await requireAdmin();
  if ("error" in r) return { ok: false, error: r.error };
  if (!ROLES.includes(role)) return { ok: false, error: "Unknown role." };
  const target = db().users.find((u) => u.id === userId);
  if (!target) return { ok: false, error: "User not found." };
  if (target.id === r.id) return { ok: false, error: "You cannot change your own role." };
  const before = target.role;
  target.role = role;
  addAudit(
    {
      actorId: r.id,
      actorRole: r.role,
      action: "user.role_changed",
      entityType: "user",
      entityId: target.id,
      summary: `Role of ${target.name} changed from ${before} to ${role}`,
    },
    before,
    role
  );
  revalidatePath("/admin/users");
  return { ok: true };
}

const promoSchema = z.object({
  code: z.string().trim().min(3, "Code must be at least 3 characters").max(24).regex(/^[A-Z0-9_-]+$/i, "Letters, numbers, dashes only"),
  kind: z.enum(["percent", "fixed"]),
  value: z.coerce.number().positive("Value must be positive").max(10000),
  referrer: z.string().trim().max(80).optional().nullable(),
  note: z.string().trim().max(200).optional(),
  active: z.boolean().optional(),
});

export async function upsertPromoAction(input: unknown): Promise<ActionResult> {
  const r = await requireAdmin();
  if ("error" in r) return { ok: false, error: r.error };
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid promo" };
  const { code, kind, value, referrer, note, active } = parsed.data;
  if (kind === "percent" && value > 100) return { ok: false, error: "Percent discounts cannot exceed 100." };
  const upper = code.toUpperCase();
  const existing = db().promos.find((p) => p.code.toUpperCase() === upper);
  if (existing) {
    const before = { ...existing };
    existing.kind = kind;
    existing.value = value;
    existing.referrer = referrer || null;
    existing.note = note ?? existing.note;
    if (active !== undefined) existing.active = active;
    addAudit(
      { actorId: r.id, actorRole: r.role, action: "promo.updated", entityType: "promo", entityId: upper, summary: `Promo ${upper} updated (${kind} ${value})` },
      before,
      existing
    );
  } else {
    db().promos.push({ code: upper, kind, value, active: active ?? true, referrer: referrer || null, note: note ?? "", uses: 0 });
    addAudit({
      actorId: r.id,
      actorRole: r.role,
      action: "promo.created",
      entityType: "promo",
      entityId: upper,
      summary: `Promo ${upper} created (${kind} ${value})${referrer ? ` for ${referrer}` : ""}`,
    });
  }
  revalidatePath("/admin/promos");
  return { ok: true };
}

export async function togglePromoAction(code: string): Promise<ActionResult> {
  const r = await requireAdmin();
  if ("error" in r) return { ok: false, error: r.error };
  const promo = db().promos.find((p) => p.code.toUpperCase() === code.toUpperCase());
  if (!promo) return { ok: false, error: "Promo not found." };
  promo.active = !promo.active;
  addAudit({
    actorId: r.id,
    actorRole: r.role,
    action: promo.active ? "promo.activated" : "promo.deactivated",
    entityType: "promo",
    entityId: promo.code,
    summary: `Promo ${promo.code} ${promo.active ? "activated" : "deactivated"}`,
  });
  revalidatePath("/admin/promos");
  return { ok: true };
}

export async function updatePlanPriceAction(planId: string, price: number): Promise<ActionResult> {
  const r = await requireAdmin();
  if ("error" in r) return { ok: false, error: r.error };
  const plan = db().plans.find((p) => p.id === planId);
  if (!plan) return { ok: false, error: "Plan not found." };
  const val = Math.round(Number(price));
  if (!Number.isFinite(val) || val < 0 || val > 5000) return { ok: false, error: "Enter a price between $0 and $5,000." };
  const before = plan.price;
  plan.price = val;
  addAudit(
    { actorId: r.id, actorRole: r.role, action: "plan.price_changed", entityType: "plan", entityId: plan.id, summary: `${plan.name} price changed to $${val}` },
    before,
    val
  );
  revalidatePath("/admin/pricing");
  return { ok: true };
}

function bumpVersion(v: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v ?? "");
  if (!m) return "0.9.1-draft";
  return `${m[1]}.${Number(m[2]) + 1}.0-draft`;
}

/** Clause bank editing is open to Admin and Senior Lawyer (§10.1). */
async function requireClauseEditor(): Promise<User | { error: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in." };
  if (user.role === "observer") return { error: "Read-only demo observer cannot make changes." };
  if (user.role !== "admin" && user.role !== "senior_lawyer") {
    return { error: "Only the Admin or Senior Lawyer can edit the clause bank." };
  }
  return user;
}

export async function updateClauseTextAction(
  clauseId: string,
  text: string,
  variantId = "standard"
): Promise<ActionResult> {
  const r = await requireClauseEditor();
  if ("error" in r) return { ok: false, error: r.error };
  const clause = db().clauses.find((c) => c.id === clauseId);
  if (!clause) return { ok: false, error: "Clause not found." };
  const variant = clause.variants.find((v) => v.id === variantId) ?? clause.variants[0];
  if (!variant) return { ok: false, error: "That clause has no editable variant." };
  const clean = (text ?? "").trim();
  if (clean.length < 10) return { ok: false, error: "Clause text is too short." };
  if (clean.length > 5000) return { ok: false, error: "Clause text is too long." };
  const before = { text: variant.text, version: clause.version };
  variant.text = clean;
  clause.version = bumpVersion(clause.version);
  clause.status = "DRAFT: firm to approve";
  clause.approvedBy = null;
  clause.approvedOn = null;
  addAudit(
    {
      actorId: r.id,
      actorRole: r.role,
      action: "clausebank.updated",
      entityType: "clause",
      entityId: clause.id,
      summary: `Clause "${clause.title}" variant "${variant.id}" edited → v${clause.version} (approval reset)`,
    },
    before,
    { text: clean, version: clause.version }
  );
  revalidatePath("/admin/clauses");
  return { ok: true };
}

export async function approveClauseAction(clauseId: string): Promise<ActionResult> {
  const r = await requireClauseEditor();
  if ("error" in r) return { ok: false, error: r.error };
  if (r.role !== "senior_lawyer") {
    return { ok: false, error: "Only the Senior Lawyer (supervising principal) can approve clause wording." };
  }
  const clause = db().clauses.find((c) => c.id === clauseId);
  if (!clause) return { ok: false, error: "Clause not found." };
  if (clause.approvedBy) return { ok: false, error: "This clause is already approved at this version." };
  const before = { status: clause.status, version: clause.version };
  clause.version = (clause.version ?? "0.9.0").replace("-draft", "");
  clause.status = "Approved for use";
  clause.approvedBy = r.name;
  clause.approvedOn = new Date().toISOString().slice(0, 10);
  addAudit(
    {
      actorId: r.id,
      actorRole: r.role,
      action: "clausebank.approved",
      entityType: "clause",
      entityId: clause.id,
      summary: `Clause "${clause.title}" approved by ${r.name} at v${clause.version}`,
    },
    before,
    { status: clause.status, version: clause.version, approvedBy: clause.approvedBy }
  );
  revalidatePath("/admin/clauses");
  return { ok: true };
}

export async function toggleClauseOptionalAction(clauseId: string): Promise<ActionResult> {
  const r = await requireAdmin();
  if ("error" in r) return { ok: false, error: r.error };
  const clause = db().clauses.find((c) => c.id === clauseId);
  if (!clause) return { ok: false, error: "Clause not found." };
  clause.optional = !clause.optional;
  addAudit({
    actorId: r.id,
    actorRole: r.role,
    action: "clausebank.toggled",
    entityType: "clause",
    entityId: clause.id,
    summary: `Clause "${clause.title}" marked ${clause.optional ? "optional" : "mandatory"}`,
  });
  revalidatePath("/admin/clauses");
  return { ok: true };
}

export async function updateQuestionsJsonAction(json: string): Promise<ActionResult<{ sections: number; questions: number }>> {
  const r = await requireAdmin();
  if ("error" in r) return { ok: false, error: r.error };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
  const schema = z.object({
    version: z.number(),
    sections: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          intro: z.string().optional(),
          visibleIf: z.unknown().optional(),
          questions: z
            .array(
              z.object({
                id: z.string().min(1),
                type: z.enum(["text", "textarea", "date", "select", "radio", "checkbox", "checkboxes", "tel", "email", "number", "address", "repeater", "consent"]),
                label: z.string().min(1),
              })
              .passthrough()
            )
            .min(1),
        })
      )
      .min(1),
  });
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: `Invalid structure: ${result.error.issues[0]?.path.join(".")} — ${result.error.issues[0]?.message}` };
  }
  const before = db().questions.sections.length;
  db().questions = parsed as typeof questionsConfig;
  const qCount = result.data.sections.reduce((n, s) => n + s.questions.length, 0);
  addAudit(
    { actorId: r.id, actorRole: r.role, action: "questions.updated", entityType: "config", entityId: "questions", summary: `Question bank replaced: ${result.data.sections.length} sections, ${qCount} questions` },
    `${before} sections`,
    `${result.data.sections.length} sections`
  );
  revalidatePath("/admin/questions");
  revalidatePath("/app");
  return { ok: true, data: { sections: result.data.sections.length, questions: qCount } };
}
