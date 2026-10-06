import type { Answers, FlagEval } from "./types";
import type { Section, QuestionField } from "./config";
import { sectionVisible, visibleQuestions, validateQuestion } from "./validation";
import { computeDerived } from "./engine";
import {
  Coins,
  KeyRound,
  PawPrint,
  Scale,
  ScrollText,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";

export type StepStatus = "complete" | "in_progress" | "not_started" | "needs_attention" | "skipped" | "not_needed";

export const STEP_ICONS: Record<string, LucideIcon> = {
  user: User,
  shield: ShieldCheck,
  paw: PawPrint,
  key: KeyRound,
  coins: Coins,
  scale: Scale,
  scroll: ScrollText,
};

/** Flags that mark a step as needing the lawyer's attention. */
const FLAG_TO_SECTION: Record<string, string> = {
  minor_children: "guardians",
  blended_family: "about",
  large_estate: "divide",
  excluded_dependent: "divide",
  excluded_child: "about",
  child_disability: "about",
  interstate_or_overseas: "about",
  existing_overseas_will: "about",
  structures_complex: "about",
  foreign_assets: "divide",
  recent_relationship: "about",
  proceedings_incomplete: "about",
  capacity_age: "about",
  guardian_conflict: "guardians",
  testamentary_trust: "guardians",
  pet_care_large: "pets",
  digital_assets: "gifts",
  client_unsure: "about",
  executor_under18: "executors",
  executor_overseas: "executors",
  executor_bankrupt: "executors",
  professional_executor: "executors",
  executors_not_told: "executors",
  vulnerable_beneficiary: "divide",
  custom_survivorship: "divide",
  tenants_in_common: "divide",
  gift_of_property: "gifts",
  gift_of_crypto: "gifts",
  conditional_gift: "gifts",
  cash_gifts_large: "gifts",
  organ_donation_noted: "funeral",
};

function answered(q: QuestionField, v: unknown): boolean {
  if (v === "unsure") return true;
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (q.type === "consent") return v === true;
  if (q.type === "address" && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return Object.values(o).some((x) => String(x ?? "").trim() !== "");
  }
  return true;
}

export interface StepInfo {
  status: StepStatus;
  answered: number;
  total: number;
  firstUnanswered: QuestionField | null;
  invalid: string[];
}

function skipAnswer(section: Section, answers: Answers): unknown {
  const field = section.skipField ?? `has${section.id[0].toUpperCase()}${section.id.slice(1)}`;
  return answers[field];
}

export function stepInfo(section: Section, answers: Answers, flags: FlagEval[]): StepInfo {
  if (!sectionVisible(section, answers)) {
    return { status: "not_needed", answered: 0, total: 0, firstUnanswered: null, invalid: [] };
  }
  if (section.skippable && skipAnswer(section, answers) === "no") {
    return { status: "skipped", answered: 1, total: 1, firstUnanswered: null, invalid: [] };
  }
  const qs = visibleQuestions(section, answers);
  const done = qs.filter((q) => answered(q, answers[q.id]));
  const invalid = qs.filter((q) => answered(q, answers[q.id]) && validateQuestion(q, answers[q.id]) !== null).map((q) => q.id);
  const flagged = flags.some((f) => FLAG_TO_SECTION[f.id] === section.id);
  const firstUnanswered = qs.find((q) => !answered(q, answers[q.id])) ?? null;

  let status: StepStatus;
  if (invalid.length > 0 || (flagged && done.length > 0)) status = "needs_attention";
  else if (done.length === 0) status = "not_started";
  else if (firstUnanswered) status = "in_progress";
  else status = "complete";
  return { status, answered: done.length, total: qs.length, firstUnanswered, invalid };
}

/** The visible (real-path) sequence of questions across all sections. */
export interface PathItem {
  section: Section;
  sectionIndex: number;
  question: QuestionField;
  indexInSection: number;
}

export function questionPath(sections: Section[], answers: Answers): PathItem[] {
  const out: PathItem[] = [];
  const visible = sections.filter((s) => sectionVisible(s, answers));
  visible.forEach((section, sectionIndex) => {
    visibleQuestions(section, answers).forEach((question, indexInSection) => {
      out.push({ section, sectionIndex, question, indexInSection });
    });
  });
  return out;
}

export function firstUnansweredPath(sections: Section[], answers: Answers): PathItem | null {
  const path = questionPath(sections, answers);
  return path.find((p) => !answered(p.question, answers[p.question.id])) ?? path[path.length - 1] ?? null;
}
