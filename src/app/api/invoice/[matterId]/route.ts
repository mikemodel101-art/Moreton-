import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSessionUser } from "@/lib/auth";
import { canSeeMatter, clientOf, db, getMatter, addAudit } from "@/lib/store";
import { PRICING } from "@/lib/config";
import { money } from "@/lib/engine";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ matterId: string }> }) {
  const { matterId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(user, matter)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!matter.payment) return NextResponse.json({ error: "No payment recorded for this matter." }, { status: 409 });

  const client = clientOf(matter)!;
  const p = matter.payment;
  const inv = PRICING.taxInvoice;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const ink = rgb(0.08, 0.11, 0.15);
  const muted = rgb(0.37, 0.43, 0.49);
  let y = 780;

  const text = (s: string, size = 10, f = serif, color = ink, x = 56) => {
    page.drawText(s, { x, y, size, font: f, color });
    y -= size + 6;
  };
  const right = (s: string, size = 10, f = serif, color = ink) => {
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: 539 - w, y, size, font: f, color });
  };

  text("TAX INVOICE", 20, bold, rgb(0.12, 0.2, 0.32));
  y -= 4;
  text(inv.entity, 11, bold);
  text(`ABN ${inv.abn}`, 9, serif, muted);
  text(inv.address, 9, serif, muted);
  y -= 14;

  text(`Invoice number: ${p.invoiceNo ?? "INV-" + matter.ref}`, 10, bold);
  text(`Matter: ${matter.ref}`);
  text(`Issued: ${new Date(p.paidAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`);
  text(`Bill to: ${client.name}, ${client.email}`);
  y -= 10;

  page.drawLine({ start: { x: 56, y }, end: { x: 539, y }, thickness: 1, color: rgb(0.85, 0.84, 0.8) });
  y -= 18;
  text("Description", 10, bold);
  y += 16;
  right("Amount (AUD)", 10, bold);
  y -= 12;
  page.drawLine({ start: { x: 56, y: y + 6 }, end: { x: 539, y: y + 6 }, thickness: 0.6, color: rgb(0.85, 0.84, 0.8) });
  y -= 6;

  const line = (label: string, amount: number, strong = false) => {
    page.drawText(label, { x: 56, y, size: 10, font: strong ? bold : serif, color: ink });
    right(money(amount), 10, strong ? bold : serif);
    y -= 18;
  };

  line(p.planName, p.base);
  for (const id of p.addOnIds ?? []) {
    const a = PRICING.addOns.find((x) => x.id === id);
    if (a) line(`Add-on — ${a.name}`, a.price);
  }
  if (p.discount > 0) line(`Discount${p.promoCode ? ` (${p.promoCode})` : p.referralCode ? ` (referral ${p.referralCode})` : ""}`, -p.discount);

  y -= 4;
  page.drawLine({ start: { x: 330, y: y + 8 }, end: { x: 539, y: y + 8 }, thickness: 0.8, color: rgb(0.85, 0.84, 0.8) });
  line("Total (GST inclusive)", p.total, true);
  line("Includes GST", p.gst ?? Math.round((p.total / 11) * 100) / 100);

  y -= 16;
  text(`Payment method: Stripe test mode, card ending ${p.last4}`, 9, serif, muted);
  text(`Payment reference: ${p.id}`, 9, serif, muted);
  if (p.refundedAt) text(`REFUNDED ${new Date(p.refundedAt).toLocaleDateString("en-AU")}`, 10, bold, rgb(0.65, 0.23, 0.23));
  y -= 10;
  text(inv.note, 8.5, serif, muted);
  text("PROTOTYPE DOCUMENT — dummy ABN and fictional entity. Not a valid tax invoice.", 8.5, bold, rgb(0.65, 0.23, 0.23));

  addAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "invoice.downloaded",
    entityType: "payment",
    entityId: p.id,
    summary: `Tax invoice ${p.invoiceNo} downloaded by ${user.name}`,
  });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${p.invoiceNo ?? matter.ref}-tax-invoice.pdf"`,
    },
  });
}
