"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, encodeSession, homeForRole, verifyCredentials } from "@/lib/auth";
import { db, getUser, getUserByEmail, resetDB, addAudit } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";
import { FLAGS } from "@/lib/config";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; data?: T };

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

/** Simple in-memory rate limiter: 5 failures per email per 60s. */
const attempts = new Map<string, { n: number; until: number }>();

export async function loginAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const key = parsed.data.email.toLowerCase();
  const rec = attempts.get(key);
  if (rec && rec.n >= 5 && Date.now() < rec.until) {
    const wait = Math.ceil((rec.until - Date.now()) / 1000);
    return { ok: false, error: `Too many attempts. Try again in ${wait} seconds.` };
  }
  const user = verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    const next = rec && Date.now() < rec.until ? rec.n + 1 : 1;
    attempts.set(key, { n: next, until: Date.now() + 60_000 });
    return { ok: false, error: "Those details don't match a demo account. Try a persona below, or use demo1234." };
  }
  attempts.delete(key);
  await createSession(user.id);
  addAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    summary: `${user.name} signed in`,
  });
  return { ok: true, data: { redirectTo: homeForRole(user) } };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function switchPersonaAction(userId: string): Promise<ActionResult<{ redirectTo: string }>> {
  if (!FLAGS.demoPersonaSwitcher) return { ok: false, error: "Persona switcher is disabled." };
  const user = getUser(userId);
  if (!user) return { ok: false, error: "Unknown persona" };
  const current = await getSessionUser();
  await createSession(user.id);
  addAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.persona_switch",
    entityType: "user",
    entityId: user.id,
    summary: `Demo persona switched${current ? ` from ${current.name}` : ""} to ${user.name}`,
  });
  return { ok: true, data: { redirectTo: homeForRole(user) } };
}

export async function resetDemoAction(): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "senior_lawyer")) {
    return { ok: false, error: "Only Admin or Senior Lawyer can reset the demo." };
  }
  const name = user.name;
  const role = user.role;
  const id = user.id;
  resetDB();
  addAudit({
    actorId: id,
    actorRole: role,
    action: "demo.reset",
    entityType: "system",
    entityId: "demo",
    summary: `Demo data reset by ${name} — all dummy records restored to seed.`,
  });
  return { ok: true };
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export async function registerAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  const { name, email, password } = parsed.data;
  if (getUserByEmail(email)) return { ok: false, error: "An account with this email already exists — sign in instead (demo1234 works on every seed account)." };
  const user = {
    id: `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
    email,
    password,
    role: "client" as const,
    color: "#1F3352",
  };
  db().users.push(user);
  addAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "auth.registered",
    entityType: "user",
    entityId: user.id,
    summary: `New client account registered: ${name} (dummy data)`,
  });
  await createSession(user.id);
  return { ok: true, data: { redirectTo: "/start" } };
}

export async function sendMagicLinkAction(email: unknown): Promise<ActionResult> {
  const parsed = z.string().trim().email().safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const user = getUserByEmail(parsed.data);
  if (!user) return { ok: false, error: "No account uses that email. Every seeded persona is on the sign-in page." };
  const token = encodeSession({ userId: user.id, at: Date.now() });
  db().mail.unshift({
    id: `mail-${Date.now().toString(36)}`,
    toEmail: user.email,
    toName: user.name,
    subject: "Your magic sign-in link",
    kind: "magic_link",
    createdAt: new Date().toISOString(),
    html: `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;border:1px solid #E5DECC;border-radius:12px;overflow:hidden"><div style="background:#1F3352;color:#FCFAF5;padding:18px 24px"><strong style="font-size:18px">Moreton &amp; Grey</strong><div style="font-size:12px;opacity:.8">Moreton Wills Online — Queensland</div></div><div style="padding:22px 24px;font-family:Helvetica,Arial,sans-serif;color:#141C26;font-size:14px;line-height:1.6"><h2 style="font-family:Georgia,serif;margin:0 0 12px;font-size:20px;color:#1F3352">Sign in without a password</h2><p>Click below to sign in instantly. This link expires when the demo restarts.</p><p style="margin:18px 0"><a href="/api/auth/magic?token=${encodeURIComponent(token)}" style="background:#1F3352;color:#FCFAF5;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Sign in as ${user.name}</a></p><p style="margin-top:22px;color:#5E6E7E;font-size:12px">PROTOTYPE preview — no real email was sent.</p></div></div>`,
  });
  return { ok: true };
}

export async function listPersonas() {
  return db().users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, title: u.title, color: u.color }));
}
