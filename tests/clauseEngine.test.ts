import { describe, expect, it, beforeEach } from "vitest";
import { db, resetDB, getMatter, getUser } from "../src/lib/store";
import { buildWillDocument } from "../src/lib/clauseEngine";

function docOf(matterId: string) {
  const m = getMatter(matterId)!;
  const client = getUser(m.clientId)!;
  return buildWillDocument(m, client, db().clauses);
}

function allText(matterId: string): string {
  return docOf(matterId).sections
    .flatMap((s) => s.clauses)
    .flatMap((c) => c.texts)
    .join("\n");
}

describe("clause engine", () => {
  beforeEach(() => resetDB());

  it("rendered documents interpolate client variables", () => {
    const text = allText("m-harper");
    expect(text).toContain("Harper Joy Davis");
    expect(text).toContain("31 Flame Tree Crescent, Kenmore Hills, QLD, 4069");
    expect(text).toContain("Frank Albert Davis");
  });

  it("repeat clauses render once per item with per-item conditions", () => {
    const text = allText("m-harper");
    expect(text).toContain("diamond brooch to Iris Hartley");
    expect(text).toContain("on condition that she has turned 21");
    expect(text).toContain("$10,000 to Cancer Council Queensland");
  });

  it("conditional clauses follow answers (pets, minors trust, guardianship)", () => {
    const harper = allText("m-harper");
    expect(harper).toContain("Matilda");
    expect(harper).not.toContain("testamentary guardian");

    const jack = allText("m-jack");
    expect(jack).toContain("HOLD that beneficiary's share on trust"); // minors trust
    expect(jack).toContain("Sarah Maree Cole"); // guardian
  });

  it("lawyer overrides remove or rewrite clauses", () => {
    const m = getMatter("m-harper")!;
    m.clauseOverrides["DECL_REVOKE_ALL"] = { enabled: false };
    expect(allText("m-harper")).not.toContain("I REVOKE all former wills");
    m.clauseOverrides["DECL_REVOKE_ALL"] = { enabled: true, text: "CUSTOM REVOCATION for {{fullName}}." };
    expect(allText("m-harper")).toContain("CUSTOM REVOCATION for Harper Joy Davis.");
  });

  it("draft matters carry a watermark; issued matters do not", () => {
    expect(docOf("m-harper").watermark).toBeNull();
    expect(docOf("m-mia").watermark).toContain("DRAFT");
  });

  it("renders the v8 executor repeater and survivorship rules", () => {
    const text = allText("m-harper");
    expect(text).toContain("I APPOINT Frank Albert Davis");
    expect(text).toMatch(/to be the executors? and trustees? of this my Will/);
    expect(text).toContain("I APPOINT Simon Albert Davis (child) as substitute executor");
    expect(text).toContain("those children shall take, in equal shares");
  });

  it("renders typed gifts with fallbacks and charity ABNs", () => {
    const text = allText("m-harper");
    expect(text).toContain("my diamond brooch to Iris Hartley");
    expect(text).toContain("on condition that she has turned 21");
    const lucas = allText("m-lucas");
    expect(lucas).toContain("50% of my residuary estate to Rebecca Jane Foster");
  });

  it("renders funeral, first-contact and prepaid wishes", () => {
    const text = allText("m-harper");
    expect(text).toContain("my body be buried at Quiet service, native flowers only.");
    expect(text).toContain("be among the first people notified of my death");
  });

  it("flagged matters are identifiable for senior sign-off", () => {
    const oliver = getMatter("m-oliver")!;
    expect(oliver.flags.some((f) => f.requiresSeniorSignOff)).toBe(true);
    const harper = getMatter("m-harper")!;
    expect(harper.flags.every((f) => !f.requiresSeniorSignOff)).toBe(true);
  });
});
