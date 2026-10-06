import type { QuestionField } from "./config";
import type { Answers, AnswerValue } from "./types";
import { addressLine } from "./engine";

export function optionLabel(q: QuestionField, value: unknown): string {
  const opt = (q.options ?? []).find((o) => o.value === value);
  return opt?.label ?? String(value ?? "");
}

/** Human-readable rendering of a stored answer, for review screens & lawyer console. */
export function answerDisplay(q: QuestionField, value: AnswerValue | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  if (value === "unsure") return "Not sure — lawyer to advise";
  switch (q.type) {
    case "checkbox":
    case "consent":
      return value === true ? "Yes" : "No";
    case "radio":
    case "select":
      return optionLabel(q, value);
    case "checkboxes":
      if (!Array.isArray(value) || value.length === 0) return "—";
      return (value as string[]).map((v) => optionLabel(q, v)).join("; ");
    case "address": {
      const line = addressLine(value);
      return line || "—";
    }
    case "repeater":
      return String((value as unknown[]).length) + " item(s)";
    case "date": {
      const d = new Date(String(value));
      return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    }
    case "number":
      return String(value);
    default:
      return String(value);
  }
}

export function repeaterRows(q: QuestionField, value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value) || !q.fields) return [];
  return (value as Array<Record<string, unknown>>).map((item) => {
    const parts = (q.fields ?? []).map((f) => {
      const v = item[f.id];
      if (f.type === "checkbox") return v ? f.label : "";
      if (f.type === "select") return (f.options ?? []).find((o) => o.value === v)?.label ?? "";
      if (f.type === "date" && typeof v === "string" && v) {
        return new Date(v).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
      }
      if (f.id === "share" && v !== undefined && v !== "") return `${v}%`;
      return v ? String(v) : "";
    });
    const filtered = parts.filter(Boolean);
    return { label: filtered[0] ?? "", value: filtered.slice(1).join(" · ") };
  });
}

export const STATUS_NEXT_ACTION: Record<string, { href: (id: string) => string; label: string }> = {
  draft: { href: (id) => `/will?m=${id}`, label: "Continue questionnaire" },
  awaiting_payment: { href: (id) => `/checkout?m=${id}`, label: "Pay securely" },
  in_review: { href: (id) => `/status?m=${id}`, label: "Track review" },
  changes_requested: { href: (id) => `/will?m=${id}`, label: "Update answers" },
  approved: { href: (id) => `/status?m=${id}`, label: "See next steps" },
  issued: { href: (id) => `/app/documents/${id}`, label: "Download will" },
};

export function dash(str: string | undefined | null): string {
  return str && str.trim() ? str : "—";
}

export function answersFingerprint(a: Answers): string {
  return JSON.stringify(a);
}
