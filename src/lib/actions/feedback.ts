"use server";

import { getSessionUser } from "@/lib/auth";
import { addAudit, db, uid } from "@/lib/store";
import type { ActionResult } from "./auth";

export interface FeedbackRow extends Record<string, unknown> {
  id: string;
  matterId: string | null;
  questionId: string;
  questionLabel: string;
  rating: "up" | "down";
  comment: string;
  ms: number;
  userName: string;
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __WILLS_FEEDBACK__: FeedbackRow[] | undefined;
}

function store(): FeedbackRow[] {
  if (!globalThis.__WILLS_FEEDBACK__) {
    globalThis.__WILLS_FEEDBACK__ = [
      { id: "fb-1", matterId: "m-mia", questionId: "propertyOwnership", questionLabel: "If you own property, how is it held?", rating: "down", comment: "I had no idea what joint tenants meant until I opened the tooltip.", ms: 74200, userName: "Mia Walker", createdAt: new Date(Date.now() - 26 * 3600e3).toISOString() },
      { id: "fb-2", matterId: "m-mia", questionId: "superNomination", questionLabel: "Have you made a binding death benefit nomination?", rating: "down", comment: "Had to go and look this up with my fund.", ms: 61800, userName: "Mia Walker", createdAt: new Date(Date.now() - 26 * 3600e3).toISOString() },
      { id: "fb-3", matterId: "m-jack", questionId: "appointGuardian", questionLabel: "Do you want to appoint a testamentary guardian?", rating: "up", comment: "Clear, and the help text answered my question before I asked it.", ms: 22400, userName: "Jack Thompson", createdAt: new Date(Date.now() - 8 * 3600e3).toISOString() },
      { id: "fb-4", matterId: "m-jack", questionId: "residueStructure", questionLabel: "How would you like to divide your residuary estate?", rating: "up", comment: "", ms: 31100, userName: "Jack Thompson", createdAt: new Date(Date.now() - 8 * 3600e3).toISOString() },
      { id: "fb-5", matterId: "m-sophie", questionId: "executorIssues", questionLabel: "Does any executor fit one of these?", rating: "down", comment: "Confusing — I wasn't sure if 'none of these' was needed as well.", ms: 48900, userName: "Sophie Miller", createdAt: new Date(Date.now() - 47 * 3600e3).toISOString() },
      { id: "fb-6", matterId: "m-sophie", questionId: "fullName", questionLabel: "Full legal name", rating: "up", comment: "", ms: 14300, userName: "Sophie Miller", createdAt: new Date(Date.now() - 48 * 3600e3).toISOString() },
    ];
  }
  return globalThis.__WILLS_FEEDBACK__;
}

export async function submitFeedbackAction(input: {
  matterId: string | null;
  questionId: string;
  questionLabel: string;
  rating: "up" | "down";
  comment?: string;
  ms: number;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (user?.role === "observer") return { ok: false, error: "Read-only observer." };
  const row: FeedbackRow = {
    id: uid("fb"),
    matterId: input.matterId,
    questionId: String(input.questionId).slice(0, 64),
    questionLabel: String(input.questionLabel).slice(0, 200),
    rating: input.rating === "down" ? "down" : "up",
    comment: (input.comment ?? "").trim().slice(0, 600),
    ms: Math.max(0, Math.min(3_600_000, Math.round(input.ms))),
    userName: user?.name ?? "Anonymous tester",
    createdAt: new Date().toISOString(),
  };
  store().unshift(row);
  addAudit({
    actorId: user?.id ?? "anonymous",
    actorRole: user?.role ?? "client",
    action: "feedback.submitted",
    entityType: "question",
    entityId: row.questionId,
    summary: `Question feedback ${row.rating === "up" ? "👍" : "👎"} on "${row.questionLabel}"${row.comment ? ` — ${row.comment.slice(0, 80)}` : ""}`,
  });
  return { ok: true };
}

export async function listFeedbackAction(): Promise<FeedbackRow[]> {
  return store();
}

/** Drop-off funnel: how many seeded matters reached each step. */
export async function funnelAction(): Promise<{ step: string; reached: number }[]> {
  const matters = db().matters;
  const steps = [
    ["Started questionnaire", () => true],
    ["Reached executors", (a: Record<string, unknown>) => Boolean(a.executors)],
    ["Reached division", (a: Record<string, unknown>) => Boolean(a.residueStructure)],
    ["Completed declarations", (a: Record<string, unknown>) => a.declarationTruth === true],
    ["Paid", () => false],
    ["Issued", () => false],
  ] as const;
  return [
    ...steps.slice(0, 4).map(([label, test]) => ({
      step: label,
      reached: matters.filter((m) => test(m.answers as Record<string, unknown>)).length,
    })),
    { step: "Paid", reached: matters.filter((m) => m.payment).length },
    { step: "Issued", reached: matters.filter((m) => m.status === "issued").length },
  ];
}
