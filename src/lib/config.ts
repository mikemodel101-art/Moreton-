import brand from "../../config/brand.json";
import flags from "../../config/flags.json";
import pricing from "../../config/pricing.json";
import clausesConfig from "../../config/clauses.json";
import questionsConfig from "../../config/questions.json";

export const BRAND = brand;
export const FLAGS = flags;
export const PRICING = pricing;
export const CLAUSES_CONFIG = clausesConfig;
export const QUESTIONS_CONFIG = questionsConfig;

/* ------- questionnaire config types ------- */

export interface Option {
  value: string;
  label: string;
}

export type QuestionType =
  | "text"
  | "textarea"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "checkboxes"
  | "tel"
  | "email"
  | "number"
  | "currency"
  | "percentage"
  | "abn"
  | "address"
  | "repeater"
  | "consent";

export interface QuestionField {
  id: string;
  type: QuestionType;
  label: string;
  required?: boolean;
  options?: Option[];
  placeholder?: string;
  help?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  mustBeAdult?: boolean;
  visibleIf?: unknown;
  fields?: QuestionField[];
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  mustTotal?: number;
  totalField?: string;
  why?: string;
  itemDefaults?: Record<string, unknown>;
}

/** Answers that must block submission entirely (hard stops, not flags). */
export interface HardStop {
  questionId: string;
  message: string;
  test: (value: unknown) => boolean;
}

export const HARD_STOPS: HardStop[] = [
  {
    questionId: "executorIssues",
    message:
      "An executor under 18 cannot legally act. Please choose someone 18 or older before continuing — your lawyer can suggest options if you're stuck.",
    test: (v) => Array.isArray(v) && (v as string[]).includes("under18"),
  },
];

export interface Section {
  id: string;
  title: string;
  intro?: string;
  description?: string;
  icon?: string;
  minutes?: number;
  skippable?: boolean;
  /** The yes/no question whose "no" means the whole step is skipped. */
  skipField?: string;
  explainer?: string;
  visibleIf?: unknown;
  questions: QuestionField[];
}

export function getSections(): Section[] {
  return questionsConfig.sections as unknown as Section[];
}
