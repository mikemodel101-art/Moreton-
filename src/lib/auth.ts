import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getUser, getUserByEmail } from "./store";
import type { SessionPayload, User } from "./types";

const COOKIE = "wills_session";
const SECRET = process.env.SESSION_SECRET || "prototype-demo-secret-not-real";

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function encodeSession(payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${json}.${sign(json)}`;
}

export function decodeSession(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const [json, sig] = value.split(".");
  if (!json || !sig) return null;
  const expected = sign(json);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(json, "base64url").toString()) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const payload = decodeSession(store.get(COOKIE)?.value);
  if (!payload) return null;
  return getUser(payload.userId) ?? null;
}

export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encodeSession({ userId, at: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export function verifyCredentials(email: string, password: string): User | null {
  const user = getUserByEmail(email.trim());
  if (!user) return null;
  if (user.password !== password) return null;
  return user;
}

export function homeForRole(user: User): string {
  switch (user.role) {
    case "client":
      return "/app";
    case "lawyer":
    case "senior_lawyer":
      return "/lawyer";
    case "admin":
      return "/admin";
    case "observer":
      return "/app";
  }
}
