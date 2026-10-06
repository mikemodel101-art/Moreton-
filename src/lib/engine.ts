import type { Answers, FlagEval, Address } from "./types";
import flagsConfig from "../../config/flags.json";

/* ------------------------------------------------------------------ */
/* Derived facts — computed from raw answers, usable in conditions     */
/* ------------------------------------------------------------------ */

export function ageOn(dob: unknown, at: Date = new Date()): number | null {
  if (typeof dob !== "string" || !dob) return null;
  const d = new Date(dob + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  let age = at.getFullYear() - d.getFullYear();
  const m = at.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < d.getDate())) age--;
  return age;
}

export interface Derived {
  age: number | null;
  hasMinorChildren: boolean;
  childCount: number;
  blendedFamily: boolean;
  partneredNow: boolean;
  childDisability: boolean;
  excludedChild: boolean;
  hasUnsure: boolean;
  unsureQuestions: string[];
  executorCount: number;
  hasPropertyGift: boolean;
  hasDigitalGift: boolean;
  hasConditionalGift: boolean;
  cashGiftsTotal: number;
  cashGiftsHeavy: boolean;
  estateMidpoint: number;
  giftCount: number;
  hasGiftOver: boolean;
  helperIsBeneficiary: boolean;
  unsureOnStructural: boolean;
  sharesInvalid: boolean;
  executorAlsoExcluded: boolean;
  hasInconsistency: boolean;
}

/** Questions where "I'm not sure" materially changes the drafting. */
const STRUCTURAL_QUESTIONS = [
  "propertyOwnership",
  "superNomination",
  "vulnerableBeneficiary",
  "executorIsBeneficiary",
  "prepaidFuneral",
];

/** Indicative midpoints used only for proportionality warnings. */
export const ESTATE_MIDPOINTS: Record<string, number> = {
  under_500k: 250_000,
  "500k_1m": 750_000,
  "1m_2m": 1_500_000,
  "2m_5m": 3_500_000,
  over_5m: 7_000_000,
};

export function computeDerived(answers: Answers, at?: Date): Derived {
  const children = Array.isArray(answers.children)
    ? (answers.children as Array<Record<string, unknown>>)
    : [];
  const ages = children.map((c) => ageOn(c?.dob, at)).filter((a): a is number => a !== null);
  const hasMinorChildren = ages.some((a) => a < 18);
  const blendedFamily =
    (answers.maritalStatus === "married" || answers.maritalStatus === "defacto") &&
    children.some((c) => c?.previousRelationship === true);
  const unsureQuestions = Object.entries(answers)
    .filter(([, v]) => v === "unsure")
    .map(([k]) => k);

  const gifts = Array.isArray(answers.gifts) ? (answers.gifts as Array<Record<string, unknown>>) : [];
  const executors = Array.isArray(answers.executors) ? (answers.executors as Array<Record<string, unknown>>) : [];
  const cashGiftsTotal = gifts
    .filter((g) => g?.type === "cash")
    .reduce((sum, g) => sum + (Number(g?.value) || 0), 0);
  const estateMidpoint = ESTATE_MIDPOINTS[String(answers.estateValue ?? "")] ?? 0;

  const residueBens = Array.isArray(answers.residueBeneficiaries)
    ? (answers.residueBeneficiaries as Array<Record<string, unknown>>)
    : [];
  const shareTotal = residueBens.reduce((s, b) => s + (Number(b?.share) || 0), 0);
  const excludedText = String(answers.excludedNames ?? "").toLowerCase();
  const helperName = String(answers.helperName ?? "").trim().toLowerCase();
  const beneficiaryNames = [
    ...residueBens.map((b) => String(b?.name ?? "")),
    ...gifts.map((g) => String(g?.recipientName ?? "")),
    String(answers.residuePrimary ?? ""),
  ]
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);

  const base = {
    executorCount: executors.length,
    giftCount: gifts.length,
    hasGiftOver: gifts.some((g) => g?.fallback === "named" && String(g?.fallbackName ?? "").trim() !== ""),
    helperIsBeneficiary:
      answers.hasHelper === "yes" &&
      (answers.helperIsBeneficiary === "yes" ||
        (helperName !== "" && beneficiaryNames.some((n) => n.includes(helperName) || helperName.includes(n)))),
    unsureOnStructural: STRUCTURAL_QUESTIONS.some((q) => answers[q] === "unsure"),
    sharesInvalid: residueBens.length > 0 && shareTotal !== 100,
    executorAlsoExcluded:
      excludedText !== "" &&
      executors.some((e) => {
        const n = String(e?.name ?? "").trim().toLowerCase();
        return n !== "" && excludedText.includes(n);
      }),
    hasPropertyGift: gifts.some((g) => g?.type === "property"),
    hasDigitalGift: gifts.some((g) => g?.type === "digital"),
    hasConditionalGift: gifts.some((g) => String(g?.condition ?? "").trim() !== ""),
    cashGiftsTotal,
    estateMidpoint,
    cashGiftsHeavy: estateMidpoint > 0 && cashGiftsTotal > estateMidpoint * 0.25,
    age: ageOn(answers.dob, at),
    hasMinorChildren,
    childCount: children.length,
    blendedFamily,
    partneredNow: answers.maritalStatus === "married" || answers.maritalStatus === "defacto",
    childDisability: children.some((c) => c?.hasDisability === true),
    excludedChild: children.some((c) => c?.includeInWill === false),
    hasUnsure: unsureQuestions.length > 0,
    unsureQuestions,
  };

  // hasInconsistency is derived from the consistency checks themselves, which in
  // turn evaluate against `derived` — compute with a safe placeholder first.
  const withFlagDefault: Derived = { ...base, hasInconsistency: false };
  const inconsistent = rawConsistencyHits(answers, withFlagDefault) > 0;
  return { ...base, hasInconsistency: inconsistent };
}

/** Count consistency hits without recursing back into computeDerived(). */
function rawConsistencyHits(answers: Answers, derived: Derived): number {
  const checks = (flagsConfig.consistencyChecks ?? []) as unknown as { when: unknown }[];
  return checks.filter((c) => evalCondition(c.when, answers, derived)).length;
}

/* ------------------------------------------------------------------ */
/* Mini json-logic evaluator                                           */
/* Supports: ==, !=, in, >, <, >=, <=, and, or, not, truthy            */
/* { var: "x" } resolves against answers, then derived facts           */
/* ------------------------------------------------------------------ */

function resolveVar(path: string, answers: Answers, derived: Derived): unknown {
  const clean = path.replace(/^(answers|derived)\./, "");
  if (path.startsWith("derived.")) return (derived as unknown as Record<string, unknown>)[clean];
  if (path.startsWith("answers.")) return answers[clean];
  if (clean in answers) return answers[clean];
  return (derived as unknown as Record<string, unknown>)[clean];
}

export function evalCondition(cond: unknown, answers: Answers, derived?: Derived): boolean {
  const d = derived ?? computeDerived(answers);
  if (cond === null || cond === undefined) return true;
  if (typeof cond === "boolean") return cond;
  if (typeof cond !== "object" || Array.isArray(cond)) return Boolean(cond);

  const obj = cond as Record<string, unknown>;
  const key = Object.keys(obj)[0];
  const val = obj[key];

  const arg = (v: unknown): unknown => {
    if (v && typeof v === "object" && !Array.isArray(v) && "var" in (v as Record<string, unknown>)) {
      return resolveVar(String((v as Record<string, unknown>).var), answers, d);
    }
    return v;
  };

  switch (key) {
    case "==":
      return arg((val as unknown[])[0]) === arg((val as unknown[])[1]);
    case "!=":
      return arg((val as unknown[])[0]) !== arg((val as unknown[])[1]);
    case ">":
      return Number(arg((val as unknown[])[0])) > Number(arg((val as unknown[])[1]));
    case "<":
      return Number(arg((val as unknown[])[0])) < Number(arg((val as unknown[])[1]));
    case ">=":
      return Number(arg((val as unknown[])[0])) >= Number(arg((val as unknown[])[1]));
    case "<=":
      return Number(arg((val as unknown[])[0])) <= Number(arg((val as unknown[])[1]));
    case "in": {
      const [needle, hay] = val as [unknown, unknown];
      const n = arg(needle);
      const h = arg(hay);
      if (Array.isArray(h)) return h.includes(n);
      if (typeof h === "string") return h.includes(String(n));
      return false;
    }
    case "truthy": {
      const v = Array.isArray(val) ? arg(val[0]) : arg(val);
      if (Array.isArray(v)) return v.length > 0;
      return Boolean(v);
    }
    case "and":
      return (val as unknown[]).every((c) => evalCondition(c, answers, d));
    case "or":
      return (val as unknown[]).some((c) => evalCondition(c, answers, d));
    case "not":
    case "!":
      return !evalCondition(Array.isArray(val) ? val[0] : val, answers, d);
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* Triage flags                                                        */
/* ------------------------------------------------------------------ */

interface TriageRule {
  id: string;
  label: string;
  severity: Severity;
  category: string;
  trigger: unknown;
  clientMessage: string;
  lawyerMessage: string;
  routing: "lawyer" | "senior-lawyer";
  blocksAutoApproval: boolean;
}

export type Severity = "info" | "medium" | "high" | "blocker";

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  info: (flagsConfig.severityModel?.info?.weight as number) ?? 1,
  medium: (flagsConfig.severityModel?.medium?.weight as number) ?? 3,
  high: (flagsConfig.severityModel?.high?.weight as number) ?? 7,
  blocker: (flagsConfig.severityModel?.blocker?.weight as number) ?? 20,
};

export function evaluateFlags(answers: Answers): FlagEval[] {
  const derived = computeDerived(answers);
  const rules = (flagsConfig.triageRules ?? []) as unknown as TriageRule[];
  return rules
    .filter((r) => evalCondition(r.trigger, answers, derived))
    .map((r) => ({
      id: r.id,
      label: r.label,
      severity: r.severity,
      category: r.category,
      clientMessage: r.clientMessage,
      lawyerMessage: r.lawyerMessage,
      routing: r.routing,
      blocksAutoApproval: r.blocksAutoApproval,
      weight: SEVERITY_WEIGHT[r.severity] ?? 1,
      requiresSeniorSignOff: r.routing === "senior-lawyer",
    }));
}

/* ------------------------------------------------------------------ */
/* Complexity score + routing band                                     */
/* ------------------------------------------------------------------ */

export interface ComplexityResult {
  score: number;
  band: "straightforward" | "needs_attention" | "complex";
  label: string;
  routing: "lawyer" | "senior-lawyer";
  sla: number;
  blocked: boolean;
  blockers: FlagEval[];
  bySeverity: Record<Severity, number>;
}

interface Band {
  id: ComplexityResult["band"];
  label: string;
  maxScore: number;
  routing: "lawyer" | "senior-lawyer";
  sla: number;
}

export function computeComplexity(flags: FlagEval[]): ComplexityResult {
  const score = flags.reduce((s, f) => s + (f.weight ?? SEVERITY_WEIGHT[f.severity] ?? 1), 0);
  const bands = (flagsConfig.complexityBands ?? []) as unknown as Band[];
  const band = bands.find((b) => score <= b.maxScore) ?? bands[bands.length - 1];
  const blockers = flags.filter((f) => f.severity === "blocker");
  const seniorFlag = flags.some((f) => f.routing === "senior-lawyer" || f.severity === "high");
  const bySeverity = { info: 0, medium: 0, high: 0, blocker: 0 } as Record<Severity, number>;
  for (const f of flags) bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
  return {
    score,
    band: band?.id ?? "straightforward",
    label: seniorFlag && band?.id !== "complex" ? "Complex" : (band?.label ?? "Straightforward"),
    routing: seniorFlag ? "senior-lawyer" : (band?.routing ?? "lawyer"),
    sla: band?.sla ?? 2,
    blocked: blockers.length > 0,
    blockers,
    bySeverity,
  };
}

/* ------------------------------------------------------------------ */
/* Consistency checker                                                 */
/* ------------------------------------------------------------------ */

export interface Inconsistency {
  id: string;
  message: string;
  step: string;
  questionId: string;
}

interface CheckRule {
  id: string;
  message: string;
  when: unknown;
  fix: { step: string; questionId: string };
}

export function checkConsistency(answers: Answers): Inconsistency[] {
  const derived = computeDerived(answers);
  const checks = (flagsConfig.consistencyChecks ?? []) as unknown as CheckRule[];
  return checks
    .filter((c) => evalCondition(c.when, answers, derived))
    .map((c) => ({ id: c.id, message: c.message, step: c.fix.step, questionId: c.fix.questionId }));
}

/* ------------------------------------------------------------------ */
/* Mustache-lite template rendering                                    */
/* Supports {{var}}, {{#var}}...{{/var}} truthy sections, {{{var}}}     */
/* ------------------------------------------------------------------ */

export function addressLine(addr: unknown): string {
  if (!addr || typeof addr !== "object") return "";
  const a = addr as Address;
  return [a.street, a.suburb, a.state, a.postcode].filter(Boolean).join(", ");
}

export function renderTemplate(template: string, ctx: Record<string, unknown>): string {
  let out = template;
  // truthy sections {{#key}}...{{/key}}
  out = out.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (_, key: string, inner: string) => {
    const v = ctx[key];
    if (Array.isArray(v)) return v.length ? inner : "";
    return v ? inner : "";
  });
  out = out.replace(/{{(\w+)}}/g, (_, key: string) => {
    const v = ctx[key];
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return addressLine(v);
    return String(v);
  });
  return out;
}

const SERVICE_TEXT: Record<string, string> = {
  religious: ", following a religious service",
  secular: ", following a secular or celebrant-led service",
  private: ", following a small private service",
  none: ", with no formal service",
  family_decide: "",
};

const TRUST_AGE: Record<string, string> = {
  trust_21: "twenty-one (21)",
  trust_25: "twenty-five (25)",
  trust_30: "thirty (30)",
};

export function buildClauseContext(answers: Answers): Record<string, unknown> {
  const ctx: Record<string, unknown> = { ...answers };
  ctx.addressLine = addressLine(answers.address);
  ctx.guardianAddress = addressLine(answers.guardianAddress);

  // Funeral & wishes fragments
  ctx.funeralLocationText = answers.funeralLocation ? ` at ${String(answers.funeralLocation)}` : "";
  ctx.serviceTypeText = SERVICE_TEXT[String(answers.serviceType ?? "")] ?? "";
  ctx.funeralMusicText = answers.funeralMusic ? ` the music "${String(answers.funeralMusic)}"` : "";
  ctx.funeralReadingsText = answers.funeralReadings
    ? `${answers.funeralMusic ? " and" : ""} the readings or speakers: ${String(answers.funeralReadings)}`
    : "";
  ctx.prepaidPolicyText = answers.prepaidPolicy ? ` (policy ${String(answers.prepaidPolicy)})` : "";

  // Trusts & pets
  ctx.trustAgeText = TRUST_AGE[String(answers.trustChoice ?? "")] ?? "eighteen (18)";
  ctx.petAmountText = answers.petAmount ? money(Number(answers.petAmount)) : "";

  // {{executorList}} — "A, B and C" with relationship + address
  const execs = Array.isArray(answers.executors) ? (answers.executors as Array<Record<string, unknown>>) : [];
  const execParts = execs
    .map((e) => {
      const n = String(e?.name ?? "").trim();
      if (!n) return "";
      const addr = String(e?.address ?? "").trim();
      return addr ? `${n} of ${addr}` : n;
    })
    .filter(Boolean);
  ctx.executorList =
    execParts.length <= 1
      ? execParts[0] ?? ""
      : `${execParts.slice(0, -1).join(", ")} and ${execParts[execParts.length - 1]}`;
  ctx.executorNames = execs.map((e) => String(e?.name ?? "")).filter(Boolean).join(", ");

  // Per-item defaults (overridden inside repeat loops)
  ctx.giftConditionText = "";
  ctx.giftFallbackText = "";
  ctx.abnText = "";
  return ctx;
}

/** Per-item template fragments for repeating clauses. */
export function decorateRepeatItem(
  clauseId: string,
  item: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...item };
  if (clauseId === "GIFT_SPECIFIC" || clauseId === "specific_gifts") {
    out.giftConditionText = item.condition ? `, on condition that ${String(item.condition)}` : "";
    out.giftFallbackText =
      item.fallback === "named" && item.fallbackName
        ? `, or if they cannot receive it, to ${String(item.fallbackName)}`
        : "";
  }
  if (clauseId === "RES_NAMED" || clauseId === "residue_named") {
    out.abnText = item.kind === "charity" && item.abn ? ` (ABN ${String(item.abn)})` : "";
  }
  return out;
}

export function money(cents: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
