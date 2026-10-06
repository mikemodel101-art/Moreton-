import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { addAudit, canSeeMatter, getMatter, clientOf, db } from "@/lib/store";
import { buildWillDocument, willFilename } from "@/lib/clauseEngine";
import { buildDocxBuffer, buildPdfBuffer } from "@/lib/docgen";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ matterId: string; format: string }> }
) {
  const { matterId, format } = await ctx.params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(user, matter)) {
    return NextResponse.json({ error: "Matter not found" }, { status: 404 });
  }
  if (user.role === "client" && matter.status !== "issued") {
    return NextResponse.json({ error: "Your will is available once it has been issued." }, { status: 403 });
  }
  const exportable = ["in_review", "changes_requested", "approved", "issued"].includes(matter.status);
  if (!exportable) {
    return NextResponse.json({ error: "A document can be generated once the questionnaire is complete and paid." }, { status: 409 });
  }
  if (format !== "docx" && format !== "pdf") {
    return NextResponse.json({ error: "Format must be docx or pdf" }, { status: 400 });
  }

  const client = clientOf(matter)!;
  const doc = buildWillDocument(matter, client, db().clauses);
  const safeName = willFilename(doc, format as "docx" | "pdf").replace(/\.(docx|pdf)$/, "");

  addAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "export.generated",
    entityType: "matter",
    entityId: matter.id,
    summary: `${format.toUpperCase()} export of ${matter.ref} downloaded by ${user.name}${matter.status !== "issued" ? " (DRAFT watermark)" : ""}`,
  });

  if (format === "docx") {
    const buffer = await buildDocxBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}.docx"`,
      },
    });
  }

  const bytes = await buildPdfBuffer(doc);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}
