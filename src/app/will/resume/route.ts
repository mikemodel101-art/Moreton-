import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getActiveMatter } from "@/lib/store";
import { getSections } from "@/lib/config";
import { firstUnansweredPath } from "@/lib/steps";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/will", req.url));
  const matter = getActiveMatter(user, req.nextUrl.searchParams.get("m"));
  if (!matter) return NextResponse.redirect(new URL("/start", req.url));
  const next = firstUnansweredPath(getSections(), matter.answers);
  const url = next
    ? `/will/${next.section.id}/${next.question.id}?m=${matter.id}`
    : `/will?m=${matter.id}`;
  return NextResponse.redirect(new URL(url, req.url));
}
