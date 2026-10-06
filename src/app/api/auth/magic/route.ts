import { NextRequest, NextResponse } from "next/server";
import { createSession, decodeSession } from "@/lib/auth";
import { getUser } from "@/lib/store";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const payload = decodeSession(token ?? undefined);
  if (!payload || !getUser(payload.userId)) {
    return NextResponse.redirect(new URL("/login?error=magic", req.url));
  }
  await createSession(payload.userId);
  return NextResponse.redirect(new URL("/app", req.url));
}
