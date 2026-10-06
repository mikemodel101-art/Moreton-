import { buildSeedDB, type DB } from "./seed";
import type { AuditEntry, Matter, Role, User, MatterStatus } from "./types";
import { computeComplexity, evaluateFlags } from "./engine";

declare global {
  // eslint-disable-next-line no-var
  var __WILLS_DB__: DB | undefined;
}

export function db(): DB {
  if (!globalThis.__WILLS_DB__) {
    globalThis.__WILLS_DB__ = buildSeedDB();
  }
  return globalThis.__WILLS_DB__;
}

export function resetDB(): void {
  globalThis.__WILLS_DB__ = buildSeedDB();
}

let counter = 1000;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

export function getUser(id: string): User | undefined {
  return db().users.find((u) => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return db().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getMatter(id: string): Matter | undefined {
  return db().matters.find((m) => m.id === id);
}

export function clientOf(matter: Matter): User | undefined {
  return getUser(matter.clientId);
}

export function lawyerOf(matter: Matter): User | undefined {
  return matter.assignedLawyerId ? getUser(matter.assignedLawyerId) : undefined;
}

export function isStaff(role: Role): boolean {
  return role === "lawyer" || role === "senior_lawyer" || role === "admin";
}

export function canSeeMatter(user: User, matter: Matter): boolean {
  if (user.role === "observer") return true;
  if (user.role === "client") return matter.clientId === user.id;
  if (user.role === "admin") return true;
  if (user.role === "senior_lawyer") return true;
  return matter.assignedLawyerId === user.id;
}

/** Matters visible in the lawyer work queue */
export function mattersForLawyer(user: User): Matter[] {
  const all = [...db().matters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (user.role === "observer") return all;
  if (user.role === "senior_lawyer" || user.role === "admin") return all;
  return all.filter((m) => m.assignedLawyerId === user.id || m.assignedLawyerId === null);
}

export function addAudit(
  entry: Omit<AuditEntry, "id" | "at">,
  before?: unknown,
  after?: unknown
): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: uid("a"),
    at: new Date().toISOString(),
    ...(before !== undefined ? { before } : {}),
    ...(after !== undefined ? { after } : {}),
  };
  db().audit.unshift(full);
  return full;
}

export function touchMatter(m: Matter): void {
  m.updatedAt = new Date().toISOString();
  m.flags = evaluateFlags(m.answers);
  const c = computeComplexity(m.flags);
  m.complexityScore = c.score;
  m.complexityBand = c.band;
}

/** Flags that still stand in the way of approval. */
export function unresolvedFlags(m: Matter): Matter["flags"] {
  return m.flags.filter((f) => {
    if (!f.blocksAutoApproval) return false;
    const state = m.flagResolutions[f.id]?.state;
    return state !== "resolved" && state !== "acknowledged";
  });
}

export function highFlagsUnresolved(m: Matter): Matter["flags"] {
  return m.flags.filter(
    (f) => (f.severity === "high" || f.severity === "blocker") && m.flagResolutions[f.id]?.state !== "resolved"
  );
}

export function snapshotVersion(m: Matter, byUserId: string, reason: string): void {
  m.versions.push({
    id: uid("v"),
    n: m.versions.length + 1,
    createdAt: new Date().toISOString(),
    byUserId,
    reason,
    answers: JSON.parse(JSON.stringify(m.answers)),
    clauseTexts: [],
  });
}

export function setStatus(
  m: Matter,
  status: MatterStatus,
  actor: User,
  summary: string
): void {
  const before = m.status;
  m.status = status;
  touchMatter(m);
  addAudit(
    {
      actorId: actor.id,
      actorRole: actor.role,
      action: "matter.status",
      entityType: "matter",
      entityId: m.id,
      summary,
    },
    before,
    status
  );
}

/** The matter the focused journey (/will, /checkout, /status…) should show. */
export function getActiveMatter(user: User, mParam?: string | null): Matter | null {
  if (mParam) {
    const m = getMatter(mParam);
    return m && canSeeMatter(user, m) ? m : null;
  }
  const candidates = db()
    .matters.filter((m) => canSeeMatter(user, m))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (user.role === "observer") return candidates[0] ?? null;
  const inProgress = candidates.find((m) =>
    ["draft", "changes_requested", "awaiting_payment", "in_review", "approved"].includes(m.status)
  );
  return inProgress ?? candidates[0] ?? null;
}

export function nextMatterRef(): string {
  const nums = db()
    .matters.map((m) => parseInt(m.ref.replace("MW-2026-", ""), 10))
    .filter((n) => !isNaN(n));
  const next = (Math.max(...nums) + 1).toString().padStart(4, "0");
  return `MW-2026-${next}`;
}
