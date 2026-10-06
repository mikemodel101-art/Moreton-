import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getActiveMatter, clientOf, addAudit } from "@/lib/store";
import { buildSigningGuidePdf } from "@/lib/docgen";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const matter = getActiveMatter(user, req.nextUrl.searchParams.get("m"));
  const client = matter ? clientOf(matter) : null;
  const name = (matter?.answers.fullName as string) || client?.name || user.name;
  const ref = matter?.ref ?? "—";

  const bytes = await buildSigningGuidePdf(name, ref);
  if (matter) {
    addAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "export.signing_guide",
      entityType: "matter",
      entityId: matter.id,
      summary: `Signing guide PDF downloaded by ${user.name}`,
    });
  }
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Signing-Guide-QLD-${ref}.pdf"`,
    },
  });
}
