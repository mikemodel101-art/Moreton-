import { NextRequest, NextResponse } from "next/server";

/**
 * Coarse route gating (full verification happens server-side in layouts/actions).
 * /app: any signed-in role | /lawyer: staff + observer | /admin: admin + observer | /mail: any
 */
const PROTECTED = [
  "/app",
  "/lawyer",
  "/admin",
  "/mail",
  "/start",
  "/will",
  "/checkout",
  "/status",
  "/messages",
  "/signing-guide",
  "/extras",
  "/referrals",
];

const LAWYER_ROLES = new Set(["lawyer", "senior_lawyer", "admin", "observer"]);
const ADMIN_ROLES = new Set(["admin", "observer"]);

function payloadRole(req: NextRequest): string | null {
  const raw = req.cookies.get("wills_session")?.value;
  if (!raw) return null;
  const [json] = raw.split(".");
  if (!json) return null;
  try {
    const decoded = JSON.parse(Buffer.from(json, "base64url").toString());
    return decoded?.userId ? "signed-in" : null;
  } catch {
    return null;
  }
}

function userIdAndRole(req: NextRequest): { userId: string; roleHint: string } | null {
  // Role enforcement needs the user record; middleware only checks presence of a
  // well-formed session. Fine-grained RBAC is enforced in layouts + server actions.
  const raw = req.cookies.get("wills_session")?.value;
  if (!raw) return null;
  const [json] = raw.split(".");
  try {
    const decoded = JSON.parse(Buffer.from(json, "base64url").toString());
    if (decoded?.userId) return { userId: decoded.userId, roleHint: "" };
    return null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!needsAuth) return NextResponse.next();

  const session = userIdAndRole(req);
  if (!session || !payloadRole(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/lawyer/:path*",
    "/admin/:path*",
    "/mail/:path*",
    "/start/:path*",
    "/will/:path*",
    "/checkout/:path*",
    "/status/:path*",
    "/messages/:path*",
    "/signing-guide/:path*",
    "/extras/:path*",
    "/referrals/:path*",
  ],
};
