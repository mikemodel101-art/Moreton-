import type { Clause, ClauseCategory, Matter, User } from "./types";
import { buildClauseContext, decorateRepeatItem, evalCondition, renderTemplate } from "./engine";
import clausesConfig from "../../config/clauses.json";

export interface RenderedClause {
  clauseId: string;
  title: string;
  variantId: string | null;
  texts: string[];
  overridden: boolean;
  disabled: boolean;
  draft: boolean;
  version: string;
  lawyerNotes: string;
}

export interface RenderedSection {
  categoryId: string;
  categoryTitle: string;
  clauses: RenderedClause[];
}

export interface WillDocument {
  title: string;
  ref: string;
  clientName: string;
  surname: string;
  status: Matter["status"];
  sections: RenderedSection[];
  generatedAt: string;
  watermark: string | null;
  version: number;
  draftClauses: number;
}

export function getClauseBank(): Clause[] {
  return clausesConfig.clauses as unknown as Clause[];
}

export function getClauseCategories(): ClauseCategory[] {
  return [...(clausesConfig.categories as unknown as ClauseCategory[])].sort((a, b) => a.order - b.order);
}

/** Pick the first variant whose condition matches (null condition = fallback). */
export function selectVariant(clause: Clause, answers: Matter["answers"]) {
  const variants = clause.variants ?? [];
  for (const v of variants) {
    if (v.when === null || v.when === undefined) continue;
    if (evalCondition(v.when, answers)) return v;
  }
  return variants.find((v) => v.when === null || v.when === undefined) ?? variants[0] ?? null;
}

/**
 * Select + render clauses for a matter in the order required by §10.2,
 * applying variant selection and lawyer overrides.
 */
export function buildWillDocument(matter: Matter, client: User, clauses?: Clause[]): WillDocument {
  const allClauses = clauses ?? getClauseBank();
  const categories = getClauseCategories();
  const ctx = buildClauseContext(matter.answers);

  const sections: RenderedSection[] = [];
  let draftClauses = 0;

  for (const cat of categories) {
    const rendered: RenderedClause[] = [];
    const inCat = allClauses.filter((c) => c.section === cat.id).sort((a, b) => a.order - b.order);

    for (const clause of inCat) {
      const override = matter.clauseOverrides[clause.id];
      const disabled = override?.enabled === false;
      const includeMatches = clause.include === null || clause.include === undefined || evalCondition(clause.include, matter.answers);
      if (!includeMatches && !override?.text) continue;

      const variant = selectVariant(clause, matter.answers);
      const baseText = override?.text ?? variant?.text ?? "";
      const texts: string[] = [];

      if (!disabled && baseText) {
        if (clause.repeat) {
          const items = Array.isArray(matter.answers[clause.repeat])
            ? (matter.answers[clause.repeat] as Array<Record<string, unknown>>)
            : [];
          for (const item of items) {
            const t = renderTemplate(baseText, { ...ctx, ...decorateRepeatItem(clause.id, item) }).trim();
            if (t) texts.push(t);
          }
        } else {
          const t = renderTemplate(baseText, ctx).trim();
          if (t) texts.push(t);
        }
      }

      const isDraft = !clause.approvedBy;
      if (texts.length > 0 && isDraft) draftClauses += 1;

      rendered.push({
        clauseId: clause.id,
        title: clause.title,
        variantId: variant?.id ?? null,
        texts,
        overridden: Boolean(override?.text),
        disabled,
        draft: isDraft,
        version: clause.version ?? "0.0.0",
        lawyerNotes: clause.lawyerNotes ?? "",
      });
    }

    if (rendered.some((r) => r.texts.length > 0 || r.disabled)) {
      sections.push({ categoryId: cat.id, categoryTitle: cat.title, clauses: rendered });
    }
  }

  const fullName = (matter.answers.fullName as string) || client.name;
  const parts = fullName.trim().split(/\s+/);

  return {
    title: `Last Will and Testament — ${fullName}`,
    ref: matter.ref,
    clientName: fullName,
    surname: parts[parts.length - 1] || "Client",
    status: matter.status,
    sections,
    generatedAt: new Date().toISOString(),
    watermark: matter.status === "issued" ? null : "DRAFT — NOT YET APPROVED",
    version: Math.max(1, matter.versions.length + (matter.status === "issued" ? 0 : 1)),
    draftClauses,
  };
}

/** Filename pattern: Will_{Surname}_{MatterID}_v{n}.docx */
export function willFilename(doc: WillDocument, ext: "docx" | "pdf"): string {
  const surname = doc.surname.replace(/[^a-z0-9]+/gi, "");
  return `Will_${surname}_${doc.ref}_v${doc.version}.${ext}`;
}
