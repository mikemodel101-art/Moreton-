import type { Answers } from "./types";
import { getSections, type QuestionField } from "./config";
import { answerDisplay } from "./format";
import { computeDerived } from "./engine";

/** Walk a condition object and collect every { var: "x" } path it references. */
export function collectVars(cond: unknown, out: Set<string> = new Set()): Set<string> {
  if (!cond || typeof cond !== "object") return out;
  if (Array.isArray(cond)) {
    cond.forEach((c) => collectVars(c, out));
    return out;
  }
  for (const [k, v] of Object.entries(cond as Record<string, unknown>)) {
    if (k === "var" && typeof v === "string") out.add(v.replace(/^answers\./, ""));
    else collectVars(v, out);
  }
  return out;
}

const DERIVED_REASONS: Record<string, (d: ReturnType<typeof computeDerived>) => string | null> = {
  hasMinorChildren: (d) => (d.hasMinorChildren ? "you have children under 18" : null),
  blendedFamily: (d) => (d.blendedFamily ? "you have a partner and a child from a previous relationship" : null),
  age: (d) => (d.age !== null && d.age > 84 ? `you are ${d.age}` : null),
  childCount: (d) => (d.childCount > 0 ? `you listed ${d.childCount} ${d.childCount === 1 ? "child" : "children"}` : null),
  partneredNow: (d) => (d.partneredNow ? "you're partnered" : null),
};

/**
 * Human-readable reasons a clause was selected: "Included because you said…"
 * Used by tooltips in the document preview and lawyer workspace.
 */
export function clauseProvenance(when: unknown, answers: Answers): string[] {
  if (when === null || when === undefined) return ["Standard clause — included in every will"];
  const derived = computeDerived(answers);
  const reasons: string[] = [];
  for (const varId of collectVars(when)) {
    if (DERIVED_REASONS[varId]) {
      const r = DERIVED_REASONS[varId](derived);
      if (r) reasons.push(`because ${r}`);
      continue;
    }
    const meta = findQuestion(varId);
    if (!meta) continue;
    const display = answerDisplay(meta, answers[varId]);
    if (display && display !== "—") reasons.push(`because you said “${meta.label} — ${display}”`);
  }
  return reasons.length ? reasons : ["Matched your answers"];
}

let questionIndex: Map<string, QuestionField> | null = null;
function findQuestion(id: string): QuestionField | null {
  if (!questionIndex) {
    questionIndex = new Map();
    for (const s of getSections()) for (const q of s.questions) questionIndex.set(q.id, q);
  }
  return questionIndex.get(id) ?? null;
}
