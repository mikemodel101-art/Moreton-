import { describe, expect, it } from "vitest";
import { buildWillDocument, getClauseBank, willFilename } from "../src/lib/clauseEngine";
import { evaluateFlags, computeComplexity } from "../src/lib/engine";
import type { Answers, Matter, User } from "../src/lib/types";

const CLIENT: User = { id: "u-fx", name: "Fixture Client", email: "fx@example.com", password: "x", role: "client", color: "#000" };

function matter(answers: Answers, status: Matter["status"] = "in_review"): Matter {
  const now = new Date("2026-01-15T00:00:00Z").toISOString();
  return {
    id: "m-fx", ref: "MW-2026-9001", clientId: "u-fx", assignedLawyerId: null, status,
    planId: "standard", answers, flags: evaluateFlags(answers), pendingSignOff: false,
    signedOffBy: null, approvedBy: null, clauseOverrides: {}, payment: null, reviewRound: 1,
    flagResolutions: {}, versions: [], complexityScore: 0, complexityBand: "straightforward",
    referralCode: null, referredBy: null, approvalChecklist: {},
    createdAt: now, updatedAt: now, submittedAt: now, paidAt: now, approvedAt: null, issuedAt: null,
  };
}

const BASE: Answers = {
  fullName: "Fixture Client", dob: "1980-06-01", occupation: "Engineer",
  address: { street: "1 Test Street", suburb: "Brisbane", state: "QLD", postcode: "4000" },
  livesInQLD: "yes", existingWill: "no", maritalStatus: "single", hasChildren: "no", hasPets: "no",
  executors: [{ name: "Alex Executor", relationship: "friend", address: "2 Test St, Brisbane QLD", phone: "0400000000", over18: true }],
  executorIssues: ["none"], professionalExecutor: "no", spokenToExecutors: "yes", wantBackupExecutor: "no",
  assetTypes: ["bank"], estateValue: "under_500k", hasSpecificGifts: "no",
  residueStructure: "all_partner", residuePrimary: "my mother", residueSecondary: "my sister",
  backupRule: "children_take", ultimateBeneficiary: "RSPCA Queensland", vulnerableBeneficiary: "no",
  excludingAnyone: "no", funeralWish: "cremation", serviceType: "secular", flowersDonations: "flowers",
  organDonation: "no", prepaidFuneral: "no", hasDigitalAssets: "no",
  firstContactName: "Alex Executor", firstContactPhone: "0400000000",
  declarationTruth: true, declarationCapacity: true, declarationAdvice: true,
};

const KIDS = [
  { name: "Minor Child", dob: "2018-01-01", relationship: "child", includeInWill: true },
  { name: "Adult Child", dob: "1999-01-01", relationship: "child", includeInWill: true },
];

/** The 10 scenario fixtures required by §10.3. */
const FIXTURES: { id: string; answers: Answers }[] = [
  { id: "01-single-no-kids", answers: { ...BASE } },
  {
    id: "02-couple-minor-children",
    answers: {
      ...BASE, maritalStatus: "married", partnerName: "Pat Partner", relationshipRecent: "no",
      hasChildren: "yes", children: [KIDS[0]], appointGuardian: "yes", guardianName: "Gail Guardian",
      guardianRelationship: "sibling", guardianAddress: { street: "3 Test St", suburb: "Brisbane", state: "QLD", postcode: "4000" },
      otherParentStatus: "alive_parental", trustChoice: "at_18",
      residuePrimary: "my spouse, Pat Partner", residueSecondary: "my children equally",
    },
  },
  {
    id: "03-blended-family",
    answers: {
      ...BASE, maritalStatus: "married", partnerName: "Pat Partner", relationshipRecent: "no",
      hasChildren: "yes",
      children: [{ ...KIDS[0], previousRelationship: true }, KIDS[1]],
      appointGuardian: "yes", guardianName: "Gail Guardian", otherParentStatus: "complicated",
      trustChoice: "trust_25", estateValue: "2m_5m",
    },
  },
  {
    id: "04-charity-gift",
    answers: {
      ...BASE, hasSpecificGifts: "yes",
      gifts: [{ type: "cash", description: "$10,000", recipientName: "Cancer Council Queensland", recipientRelationship: "charity", value: 10000, fallback: "residue" }],
      residueStructure: "named",
      residueBeneficiaries: [{ kind: "charity", name: "RSPCA Queensland", relationship: "charity", abn: "11 005 304 391", share: 100 }],
    },
  },
  {
    id: "05-pet-trust",
    answers: {
      ...BASE, hasPets: "yes",
      pets: [{ animal: "dog", petName: "Matilda", breed: "kelpie", carer: "Chris Carer", backupCarer: "Sam Second" }],
      petMoney: "yes", petAmount: 25000, petInstructions: "Two walks a day.",
    },
  },
  {
    id: "06-multiple-executors-survivor",
    answers: {
      ...BASE,
      executors: [
        { name: "Alex Executor", relationship: "friend", address: "2 Test St, Brisbane QLD", over18: true },
        { name: "Blair Executor", relationship: "sibling", address: "4 Test St, Brisbane QLD", over18: true },
      ],
      executorMode: "survivor", wantBackupExecutor: "yes",
      backupExecutors: [{ name: "Casey Backup", relationship: "friend" }],
    },
  },
  {
    id: "07-disinherited-child",
    answers: {
      ...BASE, hasChildren: "yes",
      children: [{ ...KIDS[1], includeInWill: false }],
      excludingAnyone: "yes", excludedNames: "Adult Child", exclusionReason: "Provided for during my lifetime.",
    },
  },
  {
    id: "08-vulnerable-beneficiary-trust",
    answers: {
      ...BASE, hasChildren: "yes",
      children: [{ ...KIDS[1], hasDisability: true, includeInWill: true }],
      vulnerableBeneficiary: "yes", residueStructure: "split_children",
    },
  },
  {
    id: "09-property-and-crypto-gifts",
    answers: {
      ...BASE, assetTypes: ["home", "super", "bank"], propertyOwnership: "tenants_in_common",
      hasSpecificGifts: "yes", hasDigitalAssets: "yes",
      gifts: [
        { type: "property", description: "my unit at 5 Test St", recipientName: "Dana Devisee", recipientRelationship: "niece", value: 600000, fallback: "named", fallbackName: "Evan Backup" },
        { type: "digital", description: "my Bitcoin holdings", recipientName: "Finn Friend", recipientRelationship: "friend", value: 50000, fallback: "residue", condition: "he has turned 25" },
      ],
    },
  },
  {
    id: "10-full-funeral-wishes",
    answers: {
      ...BASE, funeralWish: "burial", funeralLocation: "Toowong Cemetery", serviceType: "religious",
      funeralMusic: "The Parting Glass", funeralReadings: "Psalm 23", flowersDonations: "donations",
      donationCharity: "Royal Flying Doctor Service", organDonation: "yes",
      prepaidFuneral: "yes", prepaidProvider: "Metropolitan Funerals", prepaidPolicy: "MF-2024-88213",
      personalMessage: "Thank you for everything.",
    },
  },
];

describe("clause assembly — 10 scenario fixtures", () => {
  const bank = getClauseBank();

  for (const fx of FIXTURES) {
    it(`${fx.id} produces a stable clause list`, () => {
      const doc = buildWillDocument(matter(fx.answers), CLIENT, bank);
      const snapshot = doc.sections.flatMap((s) =>
        s.clauses.filter((c) => c.texts.length > 0).map((c) => `${s.categoryId}/${c.clauseId}:${c.variantId}x${c.texts.length}`)
      );
      expect(snapshot).toMatchSnapshot();
      // Every will must carry the mandatory spine
      expect(snapshot.some((x) => x.includes("DECL_TITLE"))).toBe(true);
      expect(snapshot.some((x) => x.includes("EXEC_APPOINT_PRIMARY"))).toBe(true);
      expect(snapshot.some((x) => x.includes("POW_DEBTS"))).toBe(true);
      expect(snapshot.some((x) => x.includes("ATT_EXECUTION"))).toBe(true);
    });
  }

  it("assembles sections in the order required by §10.2", () => {
    const doc = buildWillDocument(matter(FIXTURES[2].answers), CLIENT, bank);
    const order = doc.sections.map((s) => s.categoryId);
    const expected = ["title", "definitions", "executors", "guardians", "specific_gifts", "pets", "residue", "giftover", "trusts", "statements", "powers", "funeral", "testimonium", "attestation"];
    // every rendered section must appear in the canonical order
    const idx = order.map((o) => expected.indexOf(o));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    expect(idx.every((i) => i >= 0)).toBe(true);
  });

  it("selects the right executor variant for sole / joint / survivor", () => {
    const sole = buildWillDocument(matter(FIXTURES[0].answers), CLIENT, bank);
    const survivor = buildWillDocument(matter(FIXTURES[5].answers), CLIENT, bank);
    const findExec = (d: ReturnType<typeof buildWillDocument>) =>
      d.sections.flatMap((s) => s.clauses).find((c) => c.clauseId === "EXEC_APPOINT_PRIMARY");
    expect(findExec(sole)?.variantId).toBe("sole");
    expect(findExec(survivor)?.variantId).toBe("survivor");
    expect(findExec(survivor)?.texts[0]).toContain("survivors or survivor");
    expect(findExec(survivor)?.texts[0]).toContain("Alex Executor");
    expect(findExec(survivor)?.texts[0]).toContain("and Blair Executor");
  });

  it("marks every clause DRAFT until the firm approves it", () => {
    const doc = buildWillDocument(matter(FIXTURES[0].answers), CLIENT, bank);
    const rendered = doc.sections.flatMap((s) => s.clauses).filter((c) => c.texts.length > 0);
    expect(rendered.every((c) => c.draft)).toBe(true);
    expect(doc.draftClauses).toBe(rendered.length);
    expect(doc.watermark).toBe("DRAFT — NOT YET APPROVED");
  });

  it("removes the watermark only once issued, and names files correctly", () => {
    const issued = buildWillDocument(matter(FIXTURES[0].answers, "issued"), CLIENT, bank);
    expect(issued.watermark).toBeNull();
    expect(willFilename(issued, "docx")).toMatch(/^Will_Client_MW-2026-9001_v\d+\.docx$/);
  });

  it("routes complex fixtures to the senior lawyer", () => {
    const blended = computeComplexity(evaluateFlags(FIXTURES[2].answers));
    const simple = computeComplexity(evaluateFlags(FIXTURES[0].answers));
    expect(blended.routing).toBe("senior-lawyer");
    expect(simple.routing).toBe("lawyer");
  });
});
