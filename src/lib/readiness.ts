import type { Answers } from "./types";
import type { Section } from "./config";
import { questionPath } from "./steps";
import { computeDerived, ESTATE_MIDPOINTS } from "./engine";

export interface NextAction {
  label: string;
  detail: string;
  step: string;
  questionId: string;
  points: number;
}

export interface Readiness {
  score: number;
  answered: number;
  total: number;
  nextActions: NextAction[];
  band: "just started" | "getting there" | "nearly done" | "ready";
}

/**
 * Readiness is 70% "questions answered" plus 30% "quality boosters" —
 * the things that make a will genuinely robust rather than merely complete.
 */
export function computeReadiness(sections: Section[], answers: Answers): Readiness {
  const path = questionPath(sections, answers);
  const isAnswered = (id: string) => {
    const v = answers[id];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  };
  const answered = path.filter((p) => isAnswered(p.question.id)).length;
  const total = Math.max(1, path.length);
  const completion = answered / total;

  const d = computeDerived(answers);
  const boosters: { ok: boolean; action: NextAction }[] = [
    {
      ok: answers.wantBackupExecutor === "yes" || (Array.isArray(answers.executors) && answers.executors.length > 1),
      action: {
        label: "Add a backup executor",
        detail: "If your only executor can't act, your family needs a court application. A substitute avoids that.",
        step: "executors",
        questionId: "wantBackupExecutor",
        points: 8,
      },
    },
    {
      ok: Boolean(String(answers.ultimateBeneficiary ?? "").trim()),
      action: {
        label: "Name an ultimate backup beneficiary",
        detail: "If everyone named dies before you, this stops your estate passing under government intestacy rules.",
        step: "divide",
        questionId: "ultimateBeneficiary",
        points: 7,
      },
    },
    {
      ok: !d.hasMinorChildren || answers.appointGuardian === "yes",
      action: {
        label: "Nominate a guardian for your children",
        detail: "You have children under 18 — naming a guardian puts your wishes on the record.",
        step: "guardians",
        questionId: "appointGuardian",
        points: 8,
      },
    },
    {
      ok: answers.spokenToExecutors === "yes",
      action: {
        label: "Tell your executor you've named them",
        detail: "Executors can refuse after you die, which causes months of delay. A quick conversation prevents it.",
        step: "executors",
        questionId: "spokenToExecutors",
        points: 3,
      },
    },
    {
      ok: answers.residueStructure !== "all_partner" || Boolean(String(answers.residueSecondary ?? "").trim()),
      action: {
        label: "Add a backup for your residue",
        detail: "Everything goes to one person — say who inherits if they die before you.",
        step: "divide",
        questionId: "residueSecondary",
        points: 6,
      },
    },
    {
      ok: answers.funeralWish !== undefined && answers.funeralWish !== "",
      action: {
        label: "Record your funeral wishes",
        detail: "Funerals happen before the will is read. Writing this down spares your family a hard decision.",
        step: "funeral",
        questionId: "funeralWish",
        points: 4,
      },
    },
    {
      ok: !d.unsureOnStructural,
      action: {
        label: "Resolve your 'not sure' answers",
        detail: "A lawyer can help, but settling these now makes your will stronger and faster to review.",
        step: "divide",
        questionId: "propertyOwnership",
        points: 4,
      },
    },
  ];

  const boosterTotal = boosters.reduce((s, b) => s + b.action.points, 0);
  const boosterEarned = boosters.filter((b) => b.ok).reduce((s, b) => s + b.action.points, 0);
  const score = Math.round(completion * 70 + (boosterEarned / boosterTotal) * 30);

  const nextActions: NextAction[] = [];
  const firstUnanswered = path.find((p) => !isAnswered(p.question.id));
  if (firstUnanswered) {
    nextActions.push({
      label: `Answer: ${firstUnanswered.question.label}`,
      detail: `${total - answered} question${total - answered === 1 ? "" : "s"} left in ${firstUnanswered.section.title}.`,
      step: firstUnanswered.section.id,
      questionId: firstUnanswered.question.id,
      points: Math.round((1 / total) * 70),
    });
  }
  nextActions.push(...boosters.filter((b) => !b.ok).map((b) => b.action));

  const band: Readiness["band"] = score >= 100 ? "ready" : score >= 75 ? "nearly done" : score >= 35 ? "getting there" : "just started";
  return { score: Math.min(100, score), answered, total, nextActions: nextActions.slice(0, 4), band };
}

/* ------------------------------------------------------------------ */
/* Estate snapshot — who gets what, live                               */
/* ------------------------------------------------------------------ */

export interface SnapshotSlice {
  label: string;
  sub: string;
  value: number;
  kind: "gift" | "residue";
}

export function estateSnapshot(answers: Answers): { slices: SnapshotSlice[]; estimate: number; giftTotal: number; residuePool: number } {
  const estimate = ESTATE_MIDPOINTS[String(answers.estateValue ?? "")] ?? 0;
  const gifts = Array.isArray(answers.gifts) ? (answers.gifts as Array<Record<string, unknown>>) : [];
  const slices: SnapshotSlice[] = [];
  let giftTotal = 0;

  for (const g of gifts) {
    const v = Number(g?.value) || 0;
    if (v <= 0) continue;
    giftTotal += v;
    slices.push({
      label: String(g?.recipientName ?? "Unnamed"),
      sub: `Gift — ${String(g?.description ?? "")}`.slice(0, 48),
      value: v,
      kind: "gift",
    });
  }

  const petAmount = answers.petMoney === "yes" ? Number(answers.petAmount) || 0 : 0;
  if (petAmount > 0) {
    giftTotal += petAmount;
    slices.push({ label: "Pet care fund", sub: "Gift — care of animals", value: petAmount, kind: "gift" });
  }

  const residuePool = Math.max(0, estimate - giftTotal);
  const structure = String(answers.residueStructure ?? "");

  if (structure === "all_partner") {
    slices.push({ label: String(answers.residuePrimary ?? "My partner"), sub: "Residuary estate — 100%", value: residuePool, kind: "residue" });
  } else if (structure === "split_children") {
    const kids = Array.isArray(answers.children) ? (answers.children as Array<Record<string, unknown>>).filter((c) => c?.includeInWill !== false) : [];
    const each = kids.length ? residuePool / kids.length : residuePool;
    for (const k of kids) {
      slices.push({ label: String(k?.name ?? "Child"), sub: `Residuary estate — ${(100 / Math.max(1, kids.length)).toFixed(0)}%`, value: each, kind: "residue" });
    }
    if (kids.length === 0) slices.push({ label: "My children", sub: "Residuary estate — equally", value: residuePool, kind: "residue" });
  } else {
    const bens = Array.isArray(answers.residueBeneficiaries) ? (answers.residueBeneficiaries as Array<Record<string, unknown>>) : [];
    for (const b of bens) {
      const share = Number(b?.share) || 0;
      if (share <= 0) continue;
      slices.push({
        label: String(b?.name ?? "Unnamed"),
        sub: `Residuary estate — ${share}%`,
        value: (residuePool * share) / 100,
        kind: "residue",
      });
    }
  }

  return { slices, estimate, giftTotal, residuePool };
}

/* ------------------------------------------------------------------ */
/* Smart nudges — contextual, one-per-question suggestions             */
/* ------------------------------------------------------------------ */

export interface Nudge {
  id: string;
  text: string;
  cta?: { label: string; step: string; questionId: string };
}

export function smartNudges(answers: Answers): Nudge[] {
  const out: Nudge[] = [];
  const d = computeDerived(answers);
  const execs = Array.isArray(answers.executors) ? (answers.executors as Array<Record<string, unknown>>) : [];

  if (execs.length === 1 && execs[0]?.relationship === "spouse" && answers.wantBackupExecutor !== "yes") {
    out.push({
      id: "sole-partner-exec",
      text: "You've named your partner as your only executor. Many couples die in the same accident — would you like a backup?",
      cta: { label: "Add a substitute executor", step: "executors", questionId: "wantBackupExecutor" },
    });
  }
  if (d.hasMinorChildren && answers.trustChoice === "at_18") {
    out.push({
      id: "trust-age",
      text: "Your children would inherit everything at 18. Most parents choose 21 or 25 — it's a common change at this point.",
      cta: { label: "Review the trust age", step: "guardians", questionId: "trustChoice" },
    });
  }
  if (answers.residueStructure === "all_partner" && !String(answers.residueSecondary ?? "").trim()) {
    out.push({
      id: "no-residue-backup",
      text: "Everything goes to one person with no backup named. If they die first, this part of your will could fail.",
      cta: { label: "Name a backup", step: "divide", questionId: "residueSecondary" },
    });
  }
  if (answers.superNomination === "no" || answers.superNomination === "unsure") {
    out.push({
      id: "super",
      text: "Superannuation often doesn't follow your will. It's worth checking your fund's nomination — your lawyer will remind you.",
    });
  }
  if (d.hasMinorChildren && answers.appointGuardian === "no") {
    out.push({
      id: "no-guardian",
      text: "You have children under 18 but haven't nominated a guardian. Without one, a court decides with no guidance from you.",
      cta: { label: "Nominate a guardian", step: "guardians", questionId: "appointGuardian" },
    });
  }
  if (d.cashGiftsHeavy) {
    out.push({
      id: "gifts-heavy",
      text: "Your fixed cash gifts are a large share of your estate. If its value drops, the gifts are paid first and the residue shrinks.",
      cta: { label: "Review your gifts", step: "gifts", questionId: "gifts" },
    });
  }
  return out;
}
