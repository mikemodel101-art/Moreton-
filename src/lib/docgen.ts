import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  NumberFormat,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from "docx";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import type { WillDocument } from "./clauseEngine";

const MOSS = "1F3352";
const MUTED = "5E6E7E";
const RED = "A63A3A";

/* ------------------------------------------------------------------ */
/* DOCX                                                                */
/* ------------------------------------------------------------------ */

function witnessBlock(label: string): Table {
  const rowsFor = ["Full name", "Address", "Occupation", "Signature", "Date"];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            shading: { fill: "F1F0EB" },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
          }),
        ],
      }),
      ...rowsFor.map(
        (r) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: r, size: 18, color: MUTED })] })],
              }),
              new TableCell({
                width: { size: 72, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ text: "" })],
              }),
            ],
          })
      ),
    ],
  });
}

export async function buildDocxBuffer(doc: WillDocument): Promise<Buffer> {
  const isDraft = Boolean(doc.watermark);
  const initials = doc.clientName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .join(".")
    .toUpperCase();

  /* ---------- Cover page ---------- */
  const cover: Paragraph[] = [
    new Paragraph({ text: "", spacing: { after: 1200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "LAST WILL AND TESTAMENT", bold: true, size: 44, font: "Georgia", color: MOSS })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: doc.clientName, size: 32, font: "Georgia" })],
      spacing: { after: 800 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Matter ${doc.ref}  ·  Version ${doc.version}`, size: 22, color: MUTED })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Generated ${new Date(doc.generatedAt).toLocaleString("en-AU")}`, size: 20, color: MUTED })],
      spacing: { after: 600 },
    }),
  ];

  if (isDraft) {
    cover.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { fill: "FFF3F3" },
        children: [new TextRun({ text: doc.watermark!, bold: true, size: 28, color: RED })],
        spacing: { before: 200, after: 200 },
      })
    );
  }

  // Dummy QR code to the matter, drawn as a simple module grid
  cover.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: qrAsciiBlock(doc.ref), font: "Courier New", size: 10 })],
      spacing: { before: 300, after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Scan for matter ${doc.ref} (dummy QR)`, size: 16, color: MUTED })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Moreton & Grey · PROTOTYPE — placeholder wording, firm to approve", size: 16, color: RED, italics: true })],
      spacing: { before: 600 },
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  /* ---------- Body ---------- */
  const body: (Paragraph | Table)[] = [];
  let sectionNo = 0;

  for (const section of doc.sections) {
    const visible = section.clauses.filter((c) => c.texts.length > 0 && !c.disabled);
    if (visible.length === 0) continue;
    if (section.categoryId === "attestation") continue; // rendered separately, kept with signatures

    sectionNo += 1;
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `${sectionNo}.  ${section.categoryTitle.toUpperCase()}`, bold: true, size: 24, color: MOSS })],
        spacing: { before: 320, after: 160 },
      })
    );

    for (const clause of visible) {
      for (const text of clause.texts) {
        body.push(
          new Paragraph({
            numbering: { reference: "will-clauses", level: 0 },
            children: [new TextRun({ text, size: 22 })],
            spacing: { after: 160 },
          })
        );
      }
    }
  }

  /* ---------- Testimonium + attestation (same page) ---------- */
  const attestation = doc.sections.find((s) => s.categoryId === "attestation");
  const attestationText =
    attestation?.clauses.flatMap((c) => c.texts).join(" ") ??
    "SIGNED by the will-maker in our presence, both of us being present at the same time.";

  body.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "EXECUTION", bold: true, size: 24, color: MOSS })],
      spacing: { after: 160 },
    }),
    new Paragraph({ children: [new TextRun({ text: attestationText, size: 22 })], spacing: { after: 320 } }),
    new Paragraph({
      children: [new TextRun({ text: `DATED this ______ day of ____________________ 20____`, size: 22 })],
      spacing: { after: 320 },
    })
  );

  body.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "CBCBC0" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBCBC0" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "CBCBC0" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "CBCBC0" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E3E2DA" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E3E2DA" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: "F1F0EB" },
              children: [new Paragraph({ children: [new TextRun({ text: "WILL-MAKER", bold: true, size: 20 })] })],
            }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: doc.clientName, size: 20 })] })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Signature", size: 18, color: MUTED })] })] }),
            new TableCell({ children: [new Paragraph({ text: "" }), new Paragraph({ text: "" })] }),
          ],
        }),
      ],
    })
  );

  body.push(new Paragraph({ text: "", spacing: { after: 200 } }));
  body.push(witnessBlock("WITNESS 1"));
  body.push(new Paragraph({ text: "", spacing: { after: 200 } }));
  body.push(witnessBlock("WITNESS 2"));
  body.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Both witnesses must be present at the same time and must not be a beneficiary, or the spouse of a beneficiary (ss 10–11, Succession Act 1981 (Qld)).",
          size: 16,
          italics: true,
          color: MUTED,
        }),
      ],
      spacing: { before: 200 },
    })
  );

  /* ---------- Header / footer ---------- */
  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: isDraft ? doc.watermark! : `${doc.clientName} — Last Will and Testament`,
            bold: isDraft,
            size: 18,
            color: isDraft ? RED : MUTED,
          }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: "right", position: 9026 }],
        children: [
          new TextRun({ text: `Will-maker's initials: ${initials} ________`, size: 16, color: MUTED }),
          new TextRun({ text: "\t", size: 16 }),
          new TextRun({ text: "Page ", size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED }),
          new TextRun({ text: " of ", size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED }),
        ],
      }),
    ],
  });

  const document = new Document({
    creator: "Moreton Wills Online (prototype)",
    title: doc.title,
    description: `Matter ${doc.ref} version ${doc.version}`,
    numbering: {
      config: [
        {
          reference: "will-clauses",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 560, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, color: MOSS, font: "Georgia" },
          paragraph: { spacing: { before: 320, after: 160 } },
        },
      ],
    },
    sections: [
      { properties: {}, children: cover },
      { properties: { page: { pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } }, headers: { default: header }, footers: { default: footer }, children: body },
    ],
  });

  return Packer.toBuffer(document);
}

/** Tiny deterministic "QR" block — visual placeholder only. */
function qrAsciiBlock(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rows: string[] = [];
  for (let y = 0; y < 9; y++) {
    let row = "";
    for (let x = 0; x < 9; x++) {
      const corner = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
      const on = corner ? (x === 1 && y === 1) || x === 0 || y === 0 || x === 2 || y === 2 : ((h >> ((x * 3 + y) % 30)) & 1) === 1;
      row += on ? "██" : "  ";
    }
    rows.push(row);
  }
  return rows.join("\n");
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

function wrapText(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildPdfBuffer(doc: WillDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const W = 595.28, H = 841.89, M = 64;
  const maxWidth = W - M * 2;
  const isDraft = Boolean(doc.watermark);
  const ink = rgb(0.08, 0.11, 0.15);
  const moss = rgb(0.12, 0.2, 0.32);
  const muted = rgb(0.37, 0.43, 0.49);
  const red = rgb(0.65, 0.23, 0.23);
  const initials = doc.clientName.split(/\s+/).map((p) => p[0]).filter(Boolean).join(".").toUpperCase();

  /* ---------- Cover page ---------- */
  const cover = pdf.addPage([W, H]);
  const centre = (p: typeof cover, t: string, y: number, size: number, f = serif, c = ink) => {
    const w = f.widthOfTextAtSize(t, size);
    p.drawText(t, { x: (W - w) / 2, y, size, font: f, color: c });
  };
  centre(cover, "LAST WILL AND TESTAMENT", H - 220, 24, serifBold, moss);
  centre(cover, doc.clientName, H - 258, 18, serif, ink);
  centre(cover, `Matter ${doc.ref}  ·  Version ${doc.version}`, H - 320, 12, serif, muted);
  centre(cover, `Generated ${new Date(doc.generatedAt).toLocaleString("en-AU")}`, H - 340, 10, serif, muted);
  if (isDraft) {
    cover.drawRectangle({ x: M, y: H - 400, width: maxWidth, height: 34, color: rgb(1, 0.95, 0.95) });
    centre(cover, doc.watermark!, H - 390, 15, serifBold, red);
  }
  // dummy QR: deterministic module grid
  let h = 0;
  for (let i = 0; i < doc.ref.length; i++) h = (h * 31 + doc.ref.charCodeAt(i)) >>> 0;
  const qrSize = 108, mod = qrSize / 9, qx = (W - qrSize) / 2, qy = 300;
  cover.drawRectangle({ x: qx - 6, y: qy - 6, width: qrSize + 12, height: qrSize + 12, color: rgb(1, 1, 1), borderColor: rgb(0.8, 0.8, 0.78), borderWidth: 1 });
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const corner = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
      const on = corner ? x === 0 || y === 0 || x === 2 || y === 2 || (x === 1 && y === 1) : ((h >> ((x * 3 + y) % 30)) & 1) === 1;
      if (on) cover.drawRectangle({ x: qx + x * mod, y: qy + (8 - y) * mod, width: mod, height: mod, color: ink });
    }
  }
  centre(cover, `Scan for matter ${doc.ref} (dummy QR)`, qy - 22, 9, serif, muted);
  centre(cover, "Moreton & Grey · PROTOTYPE — placeholder wording, firm to approve", 120, 9, serifItalic, red);

  /* ---------- Body ---------- */
  const pages: ReturnType<typeof pdf.addPage>[] = [];
  let page = pdf.addPage([W, H]);
  pages.push(page);
  let y = H - M - 20;

  const newPage = () => {
    page = pdf.addPage([W, H]);
    pages.push(page);
    y = H - M - 20;
  };
  const ensure = (need: number) => {
    if (y - need < M + 36) newPage();
  };
  const draw = (text: string, size: number, font = serif, color = ink, gap = 6, indent = 0) => {
    for (const line of wrapText(text, font, size, maxWidth - indent)) {
      ensure(size + gap);
      page.drawText(line, { x: M + indent, y: y - size, size, font, color });
      y -= size + gap * 0.4;
    }
    y -= gap;
  };

  let sectionNo = 0;
  let clauseNo = 0;
  for (const section of doc.sections) {
    const visible = section.clauses.filter((c) => c.texts.length > 0 && !c.disabled);
    if (visible.length === 0 || section.categoryId === "attestation") continue;
    sectionNo += 1;
    ensure(46);
    draw(`${sectionNo}.  ${section.categoryTitle.toUpperCase()}`, 12, serifBold, moss, 9);
    for (const clause of visible) {
      for (const text of clause.texts) {
        clauseNo += 1;
        const num = `${clauseNo}.`;
        ensure(24);
        page.drawText(num, { x: M, y: y - 11, size: 11, font: serifBold, color: ink });
        draw(text, 11, serif, ink, 7, 30);
      }
    }
  }

  /* ---------- Execution page ---------- */
  newPage();
  const attestation = doc.sections.find((s) => s.categoryId === "attestation");
  draw("EXECUTION", 12, serifBold, moss, 10);
  draw(
    attestation?.clauses.flatMap((c) => c.texts).join(" ") ??
      "SIGNED by the will-maker in our presence, both of us being present at the same time.",
    11, serif, ink, 12
  );
  draw("DATED this ______ day of ____________________ 20____", 11, serif, ink, 18);

  const field = (label: string) => {
    ensure(30);
    page.drawText(label, { x: M, y: y - 10, size: 9, font: serif, color: muted });
    page.drawLine({ start: { x: M + 110, y: y - 12 }, end: { x: W - M, y: y - 12 }, thickness: 0.7, color: rgb(0.72, 0.72, 0.68) });
    y -= 30;
  };
  const block = (title: string, fields: string[]) => {
    ensure(40 + fields.length * 30);
    page.drawRectangle({ x: M, y: y - 16, width: maxWidth, height: 20, color: rgb(0.95, 0.94, 0.92) });
    page.drawText(title, { x: M + 8, y: y - 11, size: 10, font: serifBold, color: ink });
    y -= 34;
    fields.forEach(field);
    y -= 6;
  };

  block("WILL-MAKER", ["Full name", "Signature", "Date"]);
  block("WITNESS 1", ["Full name", "Address", "Occupation", "Signature", "Date"]);
  block("WITNESS 2", ["Full name", "Address", "Occupation", "Signature", "Date"]);
  draw(
    "Both witnesses must be present at the same time and must not be a beneficiary, or the spouse of a beneficiary (ss 10–11, Succession Act 1981 (Qld)).",
    8.5, serifItalic, muted, 4
  );

  /* ---------- Headers, footers, watermark ---------- */
  const total = pages.length;
  pages.forEach((p, i) => {
    if (isDraft) {
      p.drawText(doc.watermark!, { x: M, y: H - 40, size: 10, font: serifBold, color: red });
      // diagonal locked watermark, removed on approval
      p.drawText("DRAFT", { x: 120, y: 330, size: 110, font: serifBold, color: rgb(0.86, 0.82, 0.82), opacity: 0.35, rotate: degrees(38) });
    } else {
      p.drawText(`${doc.clientName} — Last Will and Testament`, { x: M, y: H - 40, size: 9, font: serif, color: muted });
    }
    p.drawText(`Will-maker's initials: ${initials} ________`, { x: M, y: 38, size: 8.5, font: serif, color: muted });
    const label = `Page ${i + 1} of ${total}`;
    const w = serif.widthOfTextAtSize(label, 8.5);
    p.drawText(label, { x: W - M - w, y: 38, size: 8.5, font: serif, color: muted });
  });

  return pdf.save();
}

/* ------------------------------------------------------------------ */
/* Signing guide — standalone 1-page PDF                               */
/* ------------------------------------------------------------------ */

export async function buildSigningGuidePdf(clientName: string, ref: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const W = 595.28, M = 56;
  const ink = rgb(0.08, 0.11, 0.15), moss = rgb(0.12, 0.2, 0.32), muted = rgb(0.37, 0.43, 0.49), red = rgb(0.65, 0.23, 0.23);
  let y = 780;

  const line = (t: string, size = 10.5, f = serif, c = ink, gap = 6, indent = 0) => {
    for (const l of wrapText(t, f, size, W - M * 2 - indent)) {
      page.drawText(l, { x: M + indent, y: y - size, size, font: f, color: c });
      y -= size + gap * 0.45;
    }
    y -= gap;
  };

  line("HOW TO SIGN YOUR WILL", 19, bold, moss, 4);
  line(`Queensland · ${clientName} · Matter ${ref}`, 10, serif, muted, 14);

  const steps = [
    ["Print it single-sided on A4", "Don't staple, re-order or alter the pages in any way."],
    ["Get two adult witnesses", "Both must be 18 or older. Neither may be a beneficiary, or the spouse or partner of a beneficiary — a gift to a witness is void (s 11)."],
    ["Everyone in the room at once", "Both witnesses must physically watch you sign. Not one after the other."],
    ["Sign the last page in blue or black pen", "Use your normal signature, the one on your ID."],
    ["Initial every other page", "You and both witnesses initial the bottom of each page, in the space provided."],
    ["Witnesses then sign", "Each witness signs and fills in their name, address and occupation while you watch."],
    ["Fill in the date", "The actual date everyone signs. Never backdate or pre-date."],
    ["Store the original safely", "A scan is a backup, not a will. Tell your executor exactly where it is."],
  ];
  steps.forEach((s, i) => {
    page.drawCircle({ x: M + 8, y: y - 6, size: 9, color: moss });
    const n = String(i + 1);
    const nw = bold.widthOfTextAtSize(n, 9);
    page.drawText(n, { x: M + 8 - nw / 2, y: y - 9, size: 9, font: bold, color: rgb(1, 1, 1) });
    line(s[0], 11, bold, ink, 2, 28);
    line(s[1], 9.5, serif, muted, 10, 28);
  });

  y -= 4;
  page.drawRectangle({ x: M, y: y - 56, width: W - M * 2, height: 56, color: rgb(1, 0.97, 0.88) });
  y -= 16;
  line("Common mistakes that invalidate a will", 10, bold, ink, 3, 10);
  line("Witnesses signing separately · a beneficiary witnessing · white-out or crossing-out · removing staples to scan.", 9, serif, ink, 8, 10);

  y -= 18;
  line("Legal basis: ss 10–11, Succession Act 1981 (Qld).", 8.5, serif, muted, 4);
  line("PROTOTYPE DOCUMENT — this checklist is placeholder guidance and is to be verified by the firm before use. Not legal advice.", 8.5, italic, red, 4);

  return pdf.save();
}
