"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  addAudit,
  canSeeMatter,
  db,
  getMatter,
  nextMatterRef,
  setStatus,
  snapshotVersion,
  touchMatter,
  uid,
} from "@/lib/store";
import type { Answers, Matter, User } from "@/lib/types";
import { PRICING, getSections, type Section } from "@/lib/config";
import { validateSection, validateAll, type ErrorMap } from "@/lib/validation";
import { computeComplexity, evaluateFlags, money } from "@/lib/engine";
import { makeReferralCode } from "@/lib/seed";
import { priceOrder } from "@/lib/orders";
import { emailShell } from "@/lib/emails";
import type { ActionResult } from "./auth";

async function requireUser(): Promise<User | null> {
  return getSessionUser();
}

function writable(user: User): boolean {
  return user.role !== "observer";
}

function ownMatter(user: User, matter: Matter | undefined): matter is Matter {
  if (!matter) return false;
  if (user.role === "client") return matter.clientId === user.id;
  return canSeeMatter(user, matter);
}

const planSchema = z.string().min(1);

export async function createMatterAction(planId: unknown): Promise<ActionResult<{ matterId: string }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (!writable(user)) return { ok: false, error: "Read-only demo observer cannot make changes." };
  if (user.role !== "client") return { ok: false, error: "Only client accounts can start a will." };
  const plan = planSchema.safeParse(planId);
  if (!plan.success || !PRICING.plans.some((p) => p.id === plan.data)) {
    return { ok: false, error: "Choose a valid plan." };
  }
  const now = new Date().toISOString();
  const matter: Matter = {
    id: uid("m"),
    ref: nextMatterRef(),
    clientId: user.id,
    assignedLawyerId: null,
    status: "draft",
    planId: plan.data,
    answers: { fullName: user.name },
    flags: [],
    pendingSignOff: false,
    signedOffBy: null,
    approvedBy: null,
    clauseOverrides: {},
    payment: null,
    reviewRound: 1,
    flagResolutions: {},
    versions: [],
    complexityScore: 0,
    complexityBand: "straightforward",
    referralCode: makeReferralCode(user.id, user.name.split(" ")[0]),
    referredBy: null,
    approvalChecklist: {},
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
    paidAt: null,
    approvedAt: null,
    issuedAt: null,
  };
  db().matters.unshift(matter);
  db().mail.unshift({
    id: uid("mail"),
    toEmail: user.email,
    toName: user.name,
    subject: "Welcome — your will is waiting",
    kind: "welcome",
    matterId: matter.id,
    createdAt: now,
    html: emailShell(`Welcome, ${user.name.split(" ")[0]}`, `<p>Your online will questionnaire (${matter.ref}) has been started. You can save and resume at any time.</p><p><a href="#" style="color:#1C4634">Continue your questionnaire →</a></p>`),
  });
  addAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "matter.created",
    entityType: "matter",
    entityId: matter.id,
    summary: `Started a new will questionnaire (${matter.ref})`,
  });
  revalidatePath("/app");
  return { ok: true, data: { matterId: matter.id } };
}

export async function saveAnswersAction(
  matterId: string,
  values: Answers
): Promise<ActionResult<{ errors: ErrorMap }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Session expired — sign in again." };
  if (!writable(user)) return { ok: false, error: "Read-only demo observer cannot make changes." };
  const matter = getMatter(matterId);
  if (!ownMatter(user, matter)) return { ok: false, error: "You don't have access to this matter." };
  const editable = matter.status === "draft" || matter.status === "changes_requested";
  if (!editable) return { ok: false, error: "This will is locked while it is with the lawyer." };

  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return { ok: false, error: "Invalid answers payload." };
  }

  const wasSubmitted = matter.status === "changes_requested";
  const before: Answers = { ...matter.answers };
  const clean: Answers = {};
  for (const [k, v] of Object.entries(values)) {
    if (/^\w+$/.test(k)) clean[k] = v as Answers[string];
  }
  matter.answers = { ...matter.answers, ...clean };
  touchMatter(matter);

  if (wasSubmitted) {
    const changed = Object.entries(clean)
      .filter(([k, v]) => JSON.stringify(before[k]) !== JSON.stringify(v))
      .map(([k]) => k);
    if (changed.length > 0) {
      addAudit(
        {
          actorId: user.id,
          actorRole: user.role,
          action: "answer.edited_after_submission",
          entityType: "matter",
          entityId: matter.id,
          summary: `Client edited answer(s) after submission: ${changed.join(", ")}`,
        },
        changed.map((k) => ({ [k]: before[k] })),
        changed.map((k) => ({ [k]: matter.answers[k] }))
      );
    }
  }

  const sections = getSections();
  const visibleErrors: ErrorMap = {};
  for (const s of sections) {
    Object.assign(visibleErrors, validateSection(s, matter.answers));
  }
  revalidatePath(`/app/wizard/${matter.id}`);
  return { ok: true, data: { errors: visibleErrors } };
}

export async function submitForPaymentAction(
  matterId: string
): Promise<ActionResult<{ errors?: ErrorMap; firstSectionId?: string | null }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Session expired — sign in again." };
  if (!writable(user)) return { ok: false, error: "Read-only demo observer cannot make changes." };
  const matter = getMatter(matterId);
  if (!ownMatter(user, matter)) return { ok: false, error: "You don't have access to this matter." };
  if (matter.status !== "draft") return { ok: false, error: "This will has already been submitted." };

  const { errors, firstSectionId } = validateAll(getSections() as Section[], matter.answers);
  if (Object.keys(errors).length > 0) {
    return { ok: false, error: "Some answers still need attention before payment.", data: { errors, firstSectionId } };
  }
  // Blocker flags stop the online path entirely — offer a consultation instead.
  const complexity = computeComplexity(evaluateFlags(matter.answers));
  if (complexity.blocked) {
    return {
      ok: false,
      error: "BLOCKED",
      data: { errors: {}, firstSectionId: null },
    };
  }
  setStatus(matter, "awaiting_payment", user, "Completed questionnaire and proceeded to payment");
  matter.submittedAt = new Date().toISOString();
  matter.flags = evaluateFlags(matter.answers);
  revalidatePath("/app");
  return { ok: true, data: {} };
}

export async function updatePlanAction(matterId: string, planId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Session expired." };
  if (!writable(user)) return { ok: false, error: "Read-only demo observer cannot make changes." };
  const matter = getMatter(matterId);
  if (!ownMatter(user, matter)) return { ok: false, error: "No access." };
  if (matter.status !== "draft" && matter.status !== "awaiting_payment") {
    return { ok: false, error: "Plan cannot be changed after payment." };
  }
  if (!PRICING.plans.some((p) => p.id === planId)) return { ok: false, error: "Unknown plan." };
  const before = matter.planId;
  matter.planId = planId;
  touchMatter(matter);
  addAudit(
    {
      actorId: user.id,
      actorRole: user.role,
      action: "matter.plan_changed",
      entityType: "matter",
      entityId: matter.id,
      summary: `Plan changed to ${planId}`,
    },
    before,
    planId
  );
  revalidatePath("/app");
  return { ok: true };
}

export async function checkPromoAction(
  code: string,
  planId: string,
  addOnIds: string[] = []
): Promise<ActionResult<{ discount: number; total: number; description: string; kind: string }>> {
  const plan = db().plans.find((p) => p.id === planId);
  if (!plan) return { ok: false, error: "Unknown plan." };
  const c = code.trim().toUpperCase();
  if (!c) return { ok: false, error: "Enter a code." };

  // Referral codes (e.g. HARPER-4F9K) give the new client a fixed discount
  const refOwner = Object.entries(db().referralCredits).find(([, v]) => v.code.toUpperCase() === c);
  if (refOwner) {
    const value = PRICING.referral.discountForNewClient;
    const o = priceOrder(planId, addOnIds, value);
    return {
      ok: true,
      data: { discount: o.discount, total: o.total, description: `Referral code — ${money(value)} off`, kind: "referral" },
    };
  }

  const promo = db().promos.find((p) => p.code.toUpperCase() === c);
  if (!promo) return { ok: false, error: `"${c}" isn't a code we recognise. Check the spelling?` };
  if (!promo.active) return { ok: false, error: `"${c}" has expired and can no longer be used.` };
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { ok: false, error: `"${c}" expired on ${new Date(promo.expiresAt).toLocaleDateString("en-AU")}.` };
  }
  if (promo.maxUses != null && promo.uses >= promo.maxUses) {
    return { ok: false, error: `"${c}" has reached its usage limit.` };
  }
  if (promo.appliesTo && !promo.appliesTo.includes(planId)) {
    const names = promo.appliesTo.map((id) => db().plans.find((p) => p.id === id)?.name ?? id).join(", ");
    return { ok: false, error: `"${c}" only applies to: ${names}.` };
  }

  const subtotal = priceOrder(planId, addOnIds, 0).subtotal;
  const raw = promo.kind === "percent" ? Math.round(subtotal * (promo.value / 100)) : promo.value;
  const o = priceOrder(planId, addOnIds, raw);
  const description =
    promo.kind === "percent" ? `${promo.value}% off your order` : `${money(promo.value)} off your order`;
  return { ok: true, data: { discount: o.discount, total: o.total, description, kind: "promo" } };
}

export async function updateAddOnsAction(matterId: string, addOnIds: string[]): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Session expired." };
  if (!writable(user)) return { ok: false, error: "Read-only demo observer cannot make changes." };
  const matter = getMatter(matterId);
  if (!ownMatter(user, matter)) return { ok: false, error: "No access." };
  const valid = PRICING.addOns.filter((a) => addOnIds.includes(a.id)).map((a) => a.id);
  matter.answers = { ...matter.answers, _addOns: valid };
  touchMatter(matter);
  return { ok: true };
}

const checkoutSchema = z.object({
  matterId: z.string().min(1),
  cardNumber: z.string().optional().default(""),
  expiry: z.string().optional().default(""),
  cvc: z.string().optional().default(""),
  name: z.string().trim().optional().default(""),
  promoCode: z.string().trim().optional().nullable(),
  addOnIds: z.array(z.string()).optional().default([]),
  freeOrder: z.boolean().optional().default(false),
});

export async function completeCheckoutAction(input: unknown): Promise<ActionResult<{ receiptId: string }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Session expired — sign in again." };
  if (!writable(user)) return { ok: false, error: "Read-only demo observer cannot make changes." };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment details" };
  const { matterId, cardNumber, expiry, name, promoCode, addOnIds, freeOrder } = parsed.data;
  const matter = getMatter(matterId);
  if (!ownMatter(user, matter)) return { ok: false, error: "You don't have access to this matter." };
  // Idempotency / double-click protection
  if (matter.payment) return { ok: true, data: { receiptId: matter.payment.id } };
  if (matter.status !== "awaiting_payment") return { ok: false, error: "This matter is not awaiting payment." };

  // Resolve the discount first — a 100% code skips the card entirely
  const plan = db().plans.find((p) => p.id === matter.planId)!;
  let discount = 0;
  let promoUsed: string | null = null;
  let referralUsed: string | null = null;
  let referrerId: string | null = null;

  if (promoCode) {
    const c = promoCode.trim().toUpperCase();
    const refEntry = Object.entries(db().referralCredits).find(([, v]) => v.code.toUpperCase() === c);
    if (refEntry) {
      if (refEntry[0] === user.id) return { ok: false, error: "You can't use your own referral code." };
      discount = PRICING.referral.discountForNewClient;
      referralUsed = c;
      referrerId = refEntry[0];
    } else {
      const check = await checkPromoAction(c, matter.planId, addOnIds);
      if (!check.ok) return { ok: false, error: check.error };
      discount = check.data?.discount ?? 0;
      promoUsed = c;
    }
  }

  const order = priceOrder(matter.planId, addOnIds, discount);
  const isFree = order.total === 0;

  // Card only required when money actually changes hands
  const digits = cardNumber.replace(/\D/g, "");
  if (!isFree && !freeOrder) {
    if (digits === "4000000000000002") {
      return { ok: false, error: "Your card was declined. No charge was made (Stripe test mode). Try 4242 4242 4242 4242." };
    }
    if (digits !== "4242424242424242") {
      return { ok: false, error: "Stripe test mode only accepts 4242 4242 4242 4242 (success) or 4000 0000 0000 0002 (decline)." };
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return { ok: false, error: "Expiry must be MM/YY." };
    const [mm, yy] = expiry.split("/").map(Number);
    const nowYY = new Date().getFullYear() % 100;
    const nowMM = new Date().getMonth() + 1;
    if (yy < nowYY || (yy === nowYY && mm < nowMM)) return { ok: false, error: "This card has expired." };
    if (name.trim().length < 2) return { ok: false, error: "Name on card is required." };
  }

  if (promoUsed) {
    const promo = db().promos.find((p) => p.code.toUpperCase() === promoUsed);
    if (promo) promo.uses += 1;
  }
  if (referrerId) {
    const credit = db().referralCredits[referrerId];
    credit.converted += 1;
    credit.credit += PRICING.referral.creditForReferrer;
    matter.referredBy = referralUsed;
    const referrer = db().users.find((u) => u.id === referrerId);
    if (referrer) {
      db().mail.unshift({
        id: uid("mail"),
        toEmail: referrer.email,
        toName: referrer.name,
        subject: `You've earned ${money(PRICING.referral.creditForReferrer)} in referral credit`,
        kind: "referral_credit",
        createdAt: new Date().toISOString(),
        html: emailShell("Thanks for the referral", `<p>Someone used your code <strong>${referralUsed}</strong>. We've added <strong>${money(PRICING.referral.creditForReferrer)}</strong> of credit to your account.</p>`),
      });
    }
  }

  const total = order.total;
  const now = new Date().toISOString();
  const invoiceNo = `INV-${matter.ref.replace("MW-", "")}`;

  matter.payment = {
    id: (isFree ? "free_" : "pi_test_") + uid("pi").slice(3),
    planId: plan.id,
    planName: plan.name,
    base: order.base,
    addOnIds: order.addOns.map((a) => a.id),
    addOnTotal: order.addOnTotal,
    discount: order.discount,
    total,
    gst: order.gst,
    promoCode: promoUsed,
    referralCode: referralUsed,
    last4: isFree ? "0000" : digits.slice(-4),
    paidAt: now,
    invoiceNo,
    refundedAt: null,
  };
  if (!matter.referralCode) matter.referralCode = makeReferralCode(user.id, user.name.split(" ")[0]);
  if (!db().referralCredits[user.id]) {
    db().referralCredits[user.id] = { code: matter.referralCode, invited: 0, converted: 0, credit: 0 };
  }
  matter.paidAt = now;
  matter.flags = evaluateFlags(matter.answers);
  setStatus(matter, "in_review", user, "Payment completed — matter entered lawyer review queue");
  addAudit(
    {
      actorId: user.id,
      actorRole: user.role,
      action: "payment.completed",
      entityType: "payment",
      entityId: matter.payment.id,
      summary: `Paid ${money(total)} (${plan.name}${promoUsed ? `, ${promoUsed}` : ""}) — Stripe test mode, card ${digits.slice(-4)}, name "${name}"`,
    },
    undefined,
    { total, promo: promoUsed }
  );

  const flagNote = matter.flags.length
    ? `<p style="font-size:12px;color:#5C8374">Triage flags raised for your lawyer: ${matter.flags.map((f) => f.label).join(", ")}.</p>`
    : "";
  db().mail.unshift({
    id: uid("mail"),
    toEmail: user.email,
    toName: user.name,
    subject: `Receipt — ${plan.name} (${money(total)})`,
    kind: "receipt",
    matterId: matter.id,
    createdAt: now,
    html: emailShell(
      "Payment received",
      `<p>Thanks ${user.name.split(" ")[0]} — we've received <strong>${money(total)}</strong> for the ${plan.name}${promoUsed ? ` (${promoUsed} applied, saving ${money(discount)})` : ""}, card ending ${digits.slice(-4)}.</p><p>Your will (${matter.ref}) is now in the lawyer review queue. Turnaround is usually 2–3 business days.</p>${flagNote}<p style="font-size:12px;color:#5C8374">Stripe test mode — no card was charged.</p>`
    ),
  });
  const staffTarget = matter.assignedLawyerId
    ? db().users.find((u) => u.id === matter.assignedLawyerId)
    : db().users.find((u) => u.role === "senior_lawyer");
  if (staffTarget) {
    db().mail.unshift({
      id: uid("mail"),
      toEmail: staffTarget.email,
      toName: staffTarget.name,
      subject: `New matter for review: ${matter.ref} (${user.name})`,
      kind: "internal_new_matter",
      matterId: matter.id,
      createdAt: now,
      html: emailShell(
        "Matter ready for review",
        `<p>${matter.ref} — ${user.name} has paid for the ${plan.name} and is ready for review.</p>${flagNote}<p><a href="#" style="color:#1C4634">Open in the review console →</a></p>`
      ),
    });
  }
  revalidatePath("/app");
  return { ok: true, data: { receiptId: matter.payment.id } };
}

export async function resubmitMatterAction(matterId: string): Promise<ActionResult<{ errors?: ErrorMap }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Session expired." };
  if (!writable(user)) return { ok: false, error: "Read-only demo observer cannot make changes." };
  const matter = getMatter(matterId);
  if (!ownMatter(user, matter)) return { ok: false, error: "No access." };
  if (matter.status !== "changes_requested") return { ok: false, error: "This matter is not awaiting your changes." };

  const { errors, firstSectionId } = validateAll(getSections() as Section[], matter.answers);
  if (Object.keys(errors).length > 0) {
    return { ok: false, error: "Some answers still need attention.", data: { errors } };
  }
  matter.reviewRound += 1;
  snapshotVersion(matter, user.id, `Client resubmission — round ${matter.reviewRound}`);
  setStatus(matter, "in_review", user, `Client resubmitted answers (review round ${matter.reviewRound})`);
  const lawyer = matter.assignedLawyerId ? db().users.find((u) => u.id === matter.assignedLawyerId) : null;
  if (lawyer) {
    db().mail.unshift({
      id: uid("mail"),
      toEmail: lawyer.email,
      toName: lawyer.name,
      subject: `${matter.ref} resubmitted by client`,
      kind: "internal_resubmitted",
      matterId: matter.id,
      createdAt: new Date().toISOString(),
      html: emailShell("Client resubmitted", `<p>${user.name} has updated their answers for ${matter.ref}. Round ${matter.reviewRound} of review is ready.</p>`),
    });
  }
  revalidatePath("/app");
  revalidatePath(`/app/status/${matter.id}`);
  void firstSectionId;
  return { ok: true, data: {} };
}

const leadSchema = z.object({
  name: z.string().trim().min(2, "Your name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(6, "A contact number helps us reach you"),
  reason: z.string().trim().max(600).optional().default(""),
  preferredTime: z.string().trim().max(120).optional().default(""),
  matterId: z.string().optional().nullable(),
});

export async function bookConsultationAction(input: unknown): Promise<ActionResult<{ leadId: string }>> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form" };
  const user = await getSessionUser();
  if (user?.role === "observer") return { ok: false, error: "Read-only demo observer cannot make changes." };
  const d = parsed.data;
  const lead = {
    id: uid("lead"),
    name: d.name,
    email: d.email,
    phone: d.phone,
    reason: d.reason || "Requested a consultation",
    preferredTime: d.preferredTime || "Any time",
    matterId: d.matterId ?? null,
    createdAt: new Date().toISOString(),
    status: "new" as const,
  };
  db().leads.unshift(lead);
  addAudit({
    actorId: user?.id ?? "anonymous",
    actorRole: user?.role ?? "client",
    action: "lead.created",
    entityType: "lead",
    entityId: lead.id,
    summary: `Consultation request from ${d.name} — ${lead.reason}`,
  });
  db().mail.unshift({
    id: uid("mail"),
    toEmail: d.email,
    toName: d.name,
    subject: "We'll call you — consultation request received",
    kind: "lead_confirm",
    createdAt: new Date().toISOString(),
    html: emailShell(
      "Thanks — we'll be in touch",
      `<p>Hi ${d.name.split(" ")[0]}, we've received your request for a consultation and someone from our wills team will call you (${d.preferredTime || "at a time that suits"}).</p><p>Nothing you've entered so far is lost — it's saved against your matter.</p>`
    ),
  });
  const senior = db().users.find((u) => u.role === "senior_lawyer");
  if (senior) {
    db().mail.unshift({
      id: uid("mail"),
      toEmail: senior.email,
      toName: senior.name,
      subject: `New consultation lead: ${d.name}`,
      kind: "internal_lead",
      createdAt: new Date().toISOString(),
      html: emailShell("New lead", `<p><strong>${d.name}</strong> (${d.email}, ${d.phone})</p><p>Reason: ${lead.reason}</p><p>Preferred time: ${lead.preferredTime}</p>`),
    });
  }
  revalidatePath("/admin/leads");
  return { ok: true, data: { leadId: lead.id } };
}

export async function deleteMyTestDataAction(): Promise<ActionResult<{ removed: number }>> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Session expired." };
  if (!writable(user)) return { ok: false, error: "Read-only demo observer cannot make changes." };

  const d = db();
  const mine = d.matters.filter((m) => m.clientId === user.id);
  const ids = new Set(mine.map((m) => m.id));

  d.matters = d.matters.filter((m) => m.clientId !== user.id);
  d.messages = d.messages.filter((m) => !ids.has(m.matterId));
  d.notes = d.notes.filter((n) => !ids.has(n.matterId));
  d.mail = d.mail.filter((m) => m.toEmail !== user.email);
  d.leads = d.leads.filter((l) => !l.matterId || !ids.has(l.matterId));
  delete d.referralCredits[user.id];

  addAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "data.deleted",
    entityType: "user",
    entityId: user.id,
    summary: `${user.name} deleted their test data — ${mine.length} matter(s) and associated messages, notes and email previews removed`,
  });
  revalidatePath("/app");
  revalidatePath("/privacy-controls");
  return { ok: true, data: { removed: mine.length } };
}

export async function sendResumeLinkAction(matterId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Session expired." };
  if (!writable(user)) return { ok: false, error: "Read-only demo observer cannot make changes." };
  const matter = getMatter(matterId);
  if (!ownMatter(user, matter)) return { ok: false, error: "No access." };
  db().mail.unshift({
    id: uid("mail"),
    toEmail: user.email,
    toName: user.name,
    subject: "Pick up your will where you left off",
    kind: "resume_link",
    matterId: matter.id,
    createdAt: new Date().toISOString(),
    html: emailShell(
      "Your will is waiting",
      `<p>Hi ${user.name.split(" ")[0]} — here's your resume link for <strong>${matter.ref}</strong>. Your answers are saved, so any device works.</p><p style="margin:16px 0"><a href="/will/resume?m=${matter.id}" style="background:#1F3352;color:#FCFAF5;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Resume my questionnaire</a></p><p style="font-size:12px;color:#5E6E7E">Prototype preview — the route is live, try it.</p>`
    ),
  });
  return { ok: true };
}

export async function sendClientMessageAction(
  matterId: string,
  body: string,
  internal = false
): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Session expired." };
  if (!writable(user)) return { ok: false, error: "Read-only demo observer cannot make changes." };
  const matter = getMatter(matterId);
  if (!ownMatter(user, matter)) return { ok: false, error: "No access." };
  const text = (body ?? "").trim();
  if (text.length < 2) return { ok: false, error: "Message is too short." };
  if (text.length > 2000) return { ok: false, error: "Keep messages under 2000 characters." };
  const staff = user.role === "lawyer" || user.role === "senior_lawyer";
  const isInternal = internal && staff;
  db().messages.push({
    id: uid("msg"),
    matterId: matter.id,
    fromId: user.id,
    body: text,
    internal: isInternal,
    createdAt: new Date().toISOString(),
  });
  touchMatter(matter);
  addAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "message.sent",
    entityType: "matter",
    entityId: matter.id,
    summary: `${user.role === "client" ? "Client" : "Lawyer"} sent a message on ${matter.ref}`,
  });
  const target = isInternal
    ? null
    : user.role === "client"
      ? (matter.assignedLawyerId ? db().users.find((u) => u.id === matter.assignedLawyerId) : null)
      : db().users.find((u) => u.id === matter.clientId);
  if (target) {
    db().mail.unshift({
      id: uid("mail"),
      toEmail: target.email,
      toName: target.name,
      subject: `New message on ${matter.ref}`,
      kind: "message",
      matterId: matter.id,
      createdAt: new Date().toISOString(),
      html: emailShell(`New message from ${user.name}`, `<blockquote style="border-left:3px solid #B08D2E;margin:12px 0;padding:4px 12px;color:#444">${text.replace(/</g, "&lt;")}</blockquote><p><a href="#" style="color:#1C4634">Reply in the portal →</a></p>`),
    });
  }
  revalidatePath(`/app/messages/${matter.id}`);
  revalidatePath(`/lawyer/matters/${matter.id}`);
  return { ok: true };
}
