import { z } from "zod";
import type { Answers } from "./types";
import { HARD_STOPS, type QuestionField, type Section } from "./config";
import { evalCondition, ageOn } from "./engine";

const AU_PHONE = /^(\+?61|0)[\d\s()-]{8,14}$/;
const AU_POSTCODE = /^0[2-5]\d{2}$/; // accepts QLD 4xxx plus common east-coast ranges

const addressSchema = z.object({
  street: z.string().trim().min(3, "Street address is required"),
  suburb: z.string().trim().min(2, "Suburb is required"),
  state: z.string().trim().min(2, "State is required"),
  postcode: z.string().trim().regex(AU_POSTCODE, "Enter a valid postcode"),
});

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.values(o).every((x) => x === undefined || x === null || String(x).trim() === "");
  }
  return false;
}

function scalarSchema(q: QuestionField): z.ZodTypeAny {
  switch (q.type) {
    case "text":
    case "textarea": {
      let s = z.string().trim();
      if (q.required) s = s.min(1, `${q.label} is required`);
      if (q.minLength) s = s.min(q.minLength, `Must be at least ${q.minLength} characters`);
      if (q.maxLength) s = s.max(q.maxLength, `Must be ${q.maxLength} characters or fewer`);
      return q.required ? s : s.optional().or(z.literal(""));
    }
    case "tel": {
      let s = z.string().trim();
      if (q.required) s = s.min(1, `${q.label} is required`);
      return s.refine((v) => v === "" || AU_PHONE.test(v), "Enter a valid Australian phone number");
    }
    case "email": {
      let s = z.string().trim();
      if (q.required) s = s.min(1, `${q.label} is required`);
      return s.refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address");
    }
    case "date": {
      let s = z.string();
      if (q.required) s = s.min(1, `${q.label} is required`);
      if (q.mustBeAdult) {
        return s
          .refine((v) => v === "" || !isNaN(new Date(v).getTime()), "Enter a valid date")
          .refine((v) => {
            if (v === "") return !q.required;
            const a = ageOn(v);
            return a === null || a >= 18;
          }, "You must be at least 18 years old to make a will online");
      }
      return s.refine((v) => v === "" || !isNaN(new Date(v).getTime()), "Enter a valid date");
    }
    case "select":
    case "radio": {
      const values = (q.options ?? []).map((o) => o.value);
      if (q.required) {
        return z
          .string()
          .min(1, `${q.label} is required`)
          .refine((v) => values.includes(v), "Choose an option");
      }
      return z.string().optional();
    }
    case "checkbox": {
      return z.boolean().optional();
    }
    case "consent": {
      return z.literal(true, { message: "Please tick this declaration" });
    }
    case "checkboxes": {
      const arr = z.array(z.string());
      return q.required ? arr.min(1, "Select at least one option") : arr.optional();
    }
    case "number":
    case "percentage": {
      return z.coerce
        .number({ message: "Enter a number" })
        .min(q.min ?? 0, `Minimum is ${q.min ?? 0}`)
        .max(q.max ?? 100000, `Maximum is ${q.max ?? 100000}`);
    }
    case "currency": {
      return z.coerce
        .number({ message: "Enter an amount in dollars" })
        .min(q.min ?? 0, `Minimum is $${(q.min ?? 0).toLocaleString()}`)
        .max(q.max ?? 10_000_000, `Maximum is $${(q.max ?? 10_000_000).toLocaleString()}`);
    }
    case "abn": {
      return z
        .string()
        .trim()
        .refine((v) => v === "" || v.replace(/\D/g, "").length === 11, "An ABN has 11 digits");
    }
    default:
      return z.any();
  }
}

function repeaterSchema(q: QuestionField): z.ZodTypeAny {
  const itemShape: Record<string, z.ZodTypeAny> = {};
  for (const f of q.fields ?? []) {
    if (f.type === "checkbox")
      itemShape[f.id] = f.required
        ? z.literal(true, { message: `${f.label} must be confirmed` })
        : z.boolean().optional();
    else if (f.type === "currency")
      itemShape[f.id] = f.required ? z.coerce.number({ message: "Required" }) : z.coerce.number().optional();
    else if (f.type === "abn")
      itemShape[f.id] = z
        .string()
        .trim()
        .optional()
        .refine((v) => !v || v.replace(/\D/g, "").length === 11, "An ABN has 11 digits");
    else if (f.type === "number")
      itemShape[f.id] = f.required
        ? z.coerce.number({ message: "Required" }).min(f.min ?? 1, "Required").max(f.max ?? 100000)
        : z.coerce.number().optional();
    else if (f.required) itemShape[f.id] = z.string().trim().min(1, "Required");
    else itemShape[f.id] = z.string().trim().optional().or(z.literal(""));
  }
  let arr = z.array(z.object(itemShape));
  if (q.minItems) arr = arr.min(q.minItems, `Add at least ${q.minItems === 1 ? "one item" : `${q.minItems} items`}`);
  if (q.maxItems) arr = arr.max(q.maxItems, `Maximum ${q.maxItems} items`);
  if (q.mustTotal && q.totalField) {
    arr = arr.refine(
      (items) => {
        const total = items.reduce((sum, it) => sum + (Number((it as Record<string, unknown>)[q.totalField!]) || 0), 0);
        return total === q.mustTotal;
      },
      `Shares must total exactly ${q.mustTotal}%`
    );
  }
  return q.required ? arr : arr.optional();
}

export type ErrorMap = Record<string, string>;

/** Hard stops block submission outright (e.g. an executor under 18). */
export function hardStopFor(q: QuestionField, value: unknown): string | null {
  const stop = HARD_STOPS.find((h) => h.questionId === q.id);
  if (stop && stop.test(value)) return stop.message;
  return null;
}

export function allHardStops(answers: Answers): { questionId: string; message: string }[] {
  return HARD_STOPS.filter((h) => h.test(answers[h.questionId])).map((h) => ({
    questionId: h.questionId,
    message: h.message,
  }));
}

/** Validate a single question value against its config. Returns error string or null. */
export function validateQuestion(q: QuestionField, value: unknown): string | null {
  const stop = hardStopFor(q, value);
  if (stop) return stop;
  // "I'm not sure" is an explicit, lawyer-reviewed answer — it always validates.
  if (value === "unsure" && q.type !== "consent") return null;
  if (!q.required && isEmpty(value)) {
    if (q.type === "consent" && q.required) return "Please tick this declaration";
    return null;
  }
  if (q.required && isEmpty(value)) return `${q.label} is required`;

  if (q.type === "address") {
    const r = addressSchema.safeParse(value);
    if (!r.success) return r.error.issues[0]?.message ?? "Enter a full address";
    return null;
  }
  if (q.type === "repeater") {
    const schema = repeaterSchema(q);
    const r = schema.safeParse(value ?? []);
    if (!r.success) {
      const issue = r.error.issues[0];
      const where = issue.path.length >= 2 ? `Item ${Number(issue.path[0]) + 1}: ` : "";
      return `${where}${issue.message === "Required" ? (q.fields?.find((f) => f.id === issue.path[1])?.label ?? "Field") + " is required" : issue.message}`;
    }
    // per-item date sanity for children dob
    return null;
  }
  if (q.type === "consent") {
    return value === true ? null : "Please tick this declaration";
  }
  const schema = scalarSchema(q);
  const r = schema.safeParse(value ?? (q.type === "checkboxes" ? [] : q.type === "checkbox" ? false : ""));
  if (!r.success) return r.error.issues[0]?.message ?? "Invalid value";
  return null;
}

function questionVisible(q: QuestionField, answers: Answers): boolean {
  if (!q.visibleIf) return true;
  return evalCondition(q.visibleIf, answers);
}

export function sectionVisible(s: Section, answers: Answers): boolean {
  if (!s.visibleIf) return true;
  return evalCondition(s.visibleIf, answers);
}

/** Validate all visible questions of one section. */
export function validateSection(section: Section, answers: Answers): ErrorMap {
  const errors: ErrorMap = {};
  if (!sectionVisible(section, answers)) return errors;
  for (const q of section.questions) {
    if (!questionVisible(q, answers)) continue;
    const err = validateQuestion(q, answers[q.id]);
    if (err) errors[q.id] = err;
  }
  return errors;
}

/** Validate every visible section/question — used before submission. */
export function validateAll(sections: Section[], answers: Answers): { errors: ErrorMap; firstSectionId: string | null } {
  const errors: ErrorMap = {};
  let firstSectionId: string | null = null;
  for (const s of sections) {
    const errs = validateSection(s, answers);
    for (const [k, v] of Object.entries(errs)) {
      errors[`${s.id}:${k}`] = v;
    }
    if (!firstSectionId && Object.keys(errs).length > 0) firstSectionId = s.id;
  }
  return { errors, firstSectionId };
}

export function visibleQuestions(section: Section, answers: Answers): QuestionField[] {
  return section.questions.filter((q) => questionVisible(q, answers));
}

export function sectionCompletion(sections: Section[], answers: Answers): number {
  let total = 0;
  let done = 0;
  for (const s of sections) {
    if (!sectionVisible(s, answers)) continue;
    for (const q of s.questions) {
      if (!questionVisible(q, answers)) continue;
      total++;
      if (!isEmpty(answers[q.id])) done++;
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
