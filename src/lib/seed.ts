import type {
  AuditEntry,
  FlagEval,
  Lead,
  MailItem,
  Matter,
  Message,
  Note,
  User,
} from "./types";
import { addressLine, computeComplexity, evaluateFlags } from "./engine";

/** Deterministic, shareable referral code — e.g. HARPER-4F9K */
export function makeReferralCode(seed: string, name?: string): string {
  const base = (name ?? seed).replace(/[^a-z]/gi, "").slice(0, 6).toUpperCase() || "CLIENT";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const suffix = h.toString(36).toUpperCase().padStart(4, "0").slice(-4);
  return `${base}-${suffix}`;
}
import pricingConfig from "../../config/pricing.json";
import clausesConfig from "../../config/clauses.json";
import questionsConfig from "../../config/questions.json";
import type { Clause, Plan, PromoCode } from "./types";

const ISO = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600_000).toISOString();

export interface DB {
  seededAt: string;
  users: User[];
  matters: Matter[];
  notes: Note[];
  messages: Message[];
  audit: AuditEntry[];
  mail: MailItem[];
  promos: PromoCode[];
  plans: Plan[];
  clauses: Clause[];
  questions: typeof questionsConfig;
  leads: Lead[];
  referralCredits: Record<string, { code: string; invited: number; converted: number; credit: number }>;
}

const PW = "demo1234";

export const USERS: User[] = [
  { id: "u-admin", name: "Priya Sharma", email: "admin@moretongrey.example", password: PW, role: "admin", title: "Practice Manager", color: "#B4552D" },
  { id: "u-senior", name: "Margaret Holloway", email: "senior@moretongrey.example", password: PW, role: "senior_lawyer", title: "Principal Solicitor", color: "#1C4634" },
  { id: "u-lawyer-dan", name: "Daniel O'Connor", email: "daniel@moretongrey.example", password: PW, role: "lawyer", title: "Senior Associate", color: "#2E5E4E" },
  { id: "u-lawyer-grace", name: "Grace Liu", email: "grace@moretongrey.example", password: PW, role: "lawyer", title: "Solicitor", color: "#7FA6A0" },
  { id: "u-observer", name: "Demo Observer", email: "observer@moretongrey.example", password: PW, role: "observer", title: "Read-only guest", color: "#8A8578" },
  { id: "u-ava", name: "Ava Nguyen", email: "ava.nguyen@example.com", password: PW, role: "client", color: "#5C8374" },
  { id: "u-jack", name: "Jack Thompson", email: "jack.thompson@example.com", password: PW, role: "client", color: "#B08D2E" },
  { id: "u-mia", name: "Mia Walker", email: "mia.walker@example.com", password: PW, role: "client", color: "#B4552D" },
  { id: "u-oliver", name: "Oliver Brown", email: "oliver.brown@example.com", password: PW, role: "client", color: "#1C4634" },
  { id: "u-sophie", name: "Sophie Miller", email: "sophie.miller@example.com", password: PW, role: "client", color: "#2E5E4E" },
  { id: "u-lucas", name: "Lucas Wilson", email: "lucas.wilson@example.com", password: PW, role: "client", color: "#7FA6A0" },
  { id: "u-harper", name: "Harper Davis", email: "harper.davis@example.com", password: PW, role: "client", color: "#B08D2E" },
  { id: "u-ethan", name: "Ethan Clark", email: "ethan.clark@example.com", password: PW, role: "client", color: "#5C8374" },
];

/* ------------------------------------------------------------------ */

interface MatterSeed {
  id: string;
  ref: string;
  clientId: string;
  lawyer: string | null;
  status: Matter["status"];
  planId: string;
  answers: Matter["answers"];
  payment?: { promo: string | null; last4: string; hoursAgo: number };
  times: { created: number; submitted?: number; paid?: number; approved?: number; issued?: number };
  reviewRound?: number;
  approvedBy?: string | null;
  signedOffBy?: string | null;
  pendingSignOff?: boolean;
}

/**
 * Seeds were authored against the v5 answer shape. This upgrades them in place to
 * the v8 schema (executor repeater, residue structures, typed gifts, funeral detail)
 * so every seeded matter stays valid and renders real clauses.
 */
function migrateAnswers(a: Record<string, unknown>): Record<string, unknown> {
  const out = { ...a };
  const addr = (v: unknown) => (typeof v === "string" ? v : addressLine(v));

  if (!out.executors && out.executorName) {
    out.executors = [
      {
        name: out.executorName,
        relationship: out.executorRelationship ?? "other",
        address: addr(out.executorAddress) || addr(out.address),
        phone: "07 3000 0000",
        email: "",
        over18: true,
      },
    ];
  }
  if (!out.backupExecutors && out.backupExecutorName) {
    out.backupExecutors = [
      { name: out.backupExecutorName, relationship: out.backupExecutorRelationship ?? "other", phone: "" },
    ];
  }
  out.executorIssues ??= ["none"];
  out.executorIsBeneficiary ??= ["spouse", "child"].includes(String(out.executorRelationship)) ? "yes" : "no";
  out.professionalExecutor ??= "no";
  out.spokenToExecutors ??= "yes";

  if (!out.residueStructure && out.residuePlan) {
    out.residueStructure = out.residuePlan === "custom" ? "named" : "all_partner";
  }
  if (!out.residueBeneficiaries && Array.isArray(out.residueShares)) {
    out.residueBeneficiaries = (out.residueShares as Array<Record<string, unknown>>).map((s) => ({
      kind: "person",
      name: s.name,
      relationship: s.relationship,
      abn: "",
      share: s.share,
    }));
  }
  out.backupRule ??= "children_take";
  out.vulnerableBeneficiary ??= "no";
  if (!out.propertyOwnership) {
    const assets = Array.isArray(out.assetTypes) ? (out.assetTypes as string[]) : [];
    out.propertyOwnership = assets.includes("home") ? "joint_tenants" : "sole";
  }

  if (Array.isArray(out.gifts)) {
    out.gifts = (out.gifts as Array<Record<string, unknown>>).map((g) => {
      const desc = String(g.description ?? "");
      const isCash = /^\$/.test(desc.trim());
      return {
        type: g.type ?? (isCash ? "cash" : "item"),
        description: g.description,
        recipientName: g.recipientName,
        recipientRelationship: g.recipientRelationship,
        value: g.value ?? (isCash ? Number(desc.replace(/[^\d.]/g, "")) || "" : ""),
        fallback: g.fallback ?? "residue",
        fallbackName: g.fallbackName ?? "",
        condition: g.condition ?? "",
        message: g.message ?? "",
      };
    });
  }

  if (!out.funeralLocation && out.funeralDetails) out.funeralLocation = out.funeralDetails;
  out.serviceType ??= "family_decide";
  out.flowersDonations ??= "flowers";
  out.organDonation ??= "family_decide";
  out.prepaidFuneral ??= "no";
  out.firstContactName ??= String(out.partnerName ?? out.executorName ?? "My executor");
  out.firstContactPhone ??= "0400 000 000";
  return out;
}

/** Defaults keep seeded matters valid against the expanded question bank. */
const ANSWER_DEFAULTS: Record<string, unknown> = {
  livesInQLD: "yes",
  existingWill: "no",
  structures: [],
  otherParentStatus: "alive_parental",
  relationshipRecent: "no",
  proceedingsComplete: "yes",
  sameGuardianAll: "yes",
  trustChoice: "at_18",
  petMoney: "no",
};

function buildMatter(s: MatterSeed): Matter {
  const answers = migrateAnswers({ ...ANSWER_DEFAULTS, ...s.answers }) as Matter["answers"];
  const plan = pricingConfig.plans.find((p) => p.id === s.planId)!;
  let payment: Matter["payment"] = null;
  if (s.payment) {
    const promo = s.payment.promo
      ? (pricingConfig.promoCodes as unknown as PromoCode[]).find((c) => c.code === s.payment!.promo) ?? null
      : null;
    const discount = promo
      ? promo.kind === "percent"
        ? Math.round(plan.price * (promo.value / 100))
        : promo.value
      : 0;
    payment = {
      id: "pi_test_" + s.id.replace("m-", ""),
      planId: plan.id,
      planName: plan.name,
      base: plan.price,
      discount: Math.min(discount, plan.price),
      total: Math.max(0, plan.price - Math.min(discount, plan.price)),
      promoCode: promo?.code ?? null,
      last4: s.payment.last4,
      paidAt: ISO(s.payment.hoursAgo),
    };
  }
  const flags: FlagEval[] = evaluateFlags(answers);
  const complexity = computeComplexity(flags);
  return {
    id: s.id,
    ref: s.ref,
    clientId: s.clientId,
    assignedLawyerId: s.lawyer,
    status: s.status,
    planId: s.planId,
    answers,
    flags,
    pendingSignOff: s.pendingSignOff ?? false,
    signedOffBy: s.signedOffBy ?? null,
    approvedBy: s.approvedBy ?? null,
    clauseOverrides: {},
    payment,
    reviewRound: s.reviewRound ?? 1,
    flagResolutions: {},
    versions: [],
    complexityScore: complexity.score,
    complexityBand: complexity.band,
    referralCode: makeReferralCode(s.id),
    referredBy: null,
    approvalChecklist: {},
    createdAt: ISO(s.times.created),
    updatedAt: ISO(Math.min(...Object.values(s.times).filter((v): v is number => v !== undefined))),
    submittedAt: s.times.submitted !== undefined ? ISO(s.times.submitted) : null,
    paidAt: s.times.paid !== undefined ? ISO(s.times.paid) : null,
    approvedAt: s.times.approved !== undefined ? ISO(s.times.approved) : null,
    issuedAt: s.times.issued !== undefined ? ISO(s.times.issued) : null,
  };
}

const matterSeeds: MatterSeed[] = [
  {
    id: "m-ava",
    ref: "MW-2026-0141",
    clientId: "u-ava",
    lawyer: null,
    status: "draft",
    planId: "standard",
    times: { created: 26 },
    answers: {
      fullName: "Ava Thi Nguyen",
      dob: "1992-06-14",
      occupation: "Registered nurse",
      phone: "0412 345 901",
      address: { street: "14 Jacaranda Street", suburb: "Ashgrove", state: "QLD", postcode: "4060" },
      maritalStatus: "single",
      planningToMarry: "no",
      hasChildren: "yes",
      children: [{ name: "Chloe Nguyen", dob: "2021-02-11", relationship: "child", previousRelationship: false }],
      hasOtherDependants: "no",
      executorName: "Lan Nguyen",
      executorRelationship: "sibling",
    },
  },
  {
    id: "m-jack",
    ref: "MW-2026-0142",
    clientId: "u-jack",
    lawyer: null,
    status: "awaiting_payment",
    planId: "standard",
    times: { created: 50, submitted: 6 },
    answers: {
      fullName: "Jack William Thompson",
      dob: "1985-03-02",
      occupation: "Electrician",
      phone: "0433 210 876",
      address: { street: "8 Banksia Court", suburb: "Wynnum", state: "QLD", postcode: "4178" },
      maritalStatus: "married",
      partnerName: "Kate Louise Thompson",
      partnerDob: "1987-09-19",
      hasChildren: "yes",
      children: [
        { name: "Ruby Thompson", dob: "2018-05-30", relationship: "child", previousRelationship: false },
        { name: "Max Thompson", dob: "2015-11-12", relationship: "child", previousRelationship: false },
      ],
      hasOtherDependants: "no",
      executorName: "Kate Louise Thompson",
      executorRelationship: "spouse",
      executorAddress: { street: "8 Banksia Court", suburb: "Wynnum", state: "QLD", postcode: "4178" },
      wantBackupExecutor: "yes",
      backupExecutorName: "Peter Thompson",
      backupExecutorRelationship: "sibling",
      appointGuardian: "yes",
      guardianName: "Sarah Maree Cole",
      guardianRelationship: "sibling",
      guardianAddress: { street: "22 Pandanus Ave", suburb: "Manly", state: "QLD", postcode: "4179" },
      assetTypes: ["home", "super", "bank", "vehicles"],
      estateValue: "500k_1m",
      superNomination: "unsure",
      hasSpecificGifts: "no",
      residuePlan: "standard",
      residuePrimary: "my wife, Kate Louise Thompson",
      residueSecondary: "my children Ruby and Max in equal shares",
      ultimateBeneficiary: "The Smith Family Foundation",
      excludingAnyone: "no",
      funeralWish: "cremation",
      funeralDetails: "Ashes scattered at Manly boat harbour.",
      hasPets: "no",
      hasDigitalAssets: "no",
      declarationTruth: true,
      declarationCapacity: true,
      declarationAdvice: true,
    },
  },
  {
    id: "m-mia",
    ref: "MW-2026-0138",
    clientId: "u-mia",
    lawyer: "u-lawyer-dan",
    status: "in_review",
    planId: "essential",
    times: { created: 96, submitted: 30, paid: 29 },
    payment: { promo: "WELCOME20", last4: "4242", hoursAgo: 29 },
    answers: {
      fullName: "Mia Rose Walker",
      dob: "1997-01-25",
      occupation: "Graphic designer",
      phone: "0402 555 311",
      address: { street: "3/41 Latrobe Terrace", suburb: "Paddington", state: "QLD", postcode: "4064" },
      maritalStatus: "defacto",
      partnerName: "Samuel Ford",
      partnerDob: "1995-07-08",
      hasChildren: "no",
      hasOtherDependants: "no",
      executorName: "Samuel Ford",
      executorRelationship: "spouse",
      executorAddress: { street: "3/41 Latrobe Terrace", suburb: "Paddington", state: "QLD", postcode: "4064" },
      wantBackupExecutor: "no",
      assetTypes: ["super", "bank"],
      estateValue: "under_500k",
      superNomination: "no",
      hasSpecificGifts: "yes",
      gifts: [
        { description: "my film camera collection", recipientName: "Samuel Ford", recipientRelationship: "my partner", condition: "" },
      ],
      residuePlan: "standard",
      residuePrimary: "my partner, Samuel Ford",
      residueSecondary: "my mother, Helen Walker",
      ultimateBeneficiary: "Helen Walker",
      excludingAnyone: "no",
      funeralWish: "cremation",
      hasPets: "yes",
      pets: [{ animal: "cat", petName: "Nori", carer: "Samuel Ford" }],
      hasDigitalAssets: "no",
      declarationTruth: true,
      declarationCapacity: true,
      declarationAdvice: true,
    },
  },
  {
    id: "m-oliver",
    ref: "MW-2026-0136",
    clientId: "u-oliver",
    lawyer: "u-lawyer-grace",
    status: "in_review",
    planId: "premium",
    times: { created: 140, submitted: 52, paid: 51 },
    payment: { promo: null, last4: "4242", hoursAgo: 51 },
    answers: {
      fullName: "Oliver James Brown",
      dob: "1968-04-17",
      occupation: "Company director",
      phone: "0418 776 220",
      address: { street: "57 Hampstead Road", suburb: "Highgate Hill", state: "QLD", postcode: "4101" },
      maritalStatus: "married",
      partnerName: "Elaine Margaret Brown",
      partnerDob: "1971-12-03",
      hasChildren: "yes",
      children: [
        { name: "Charlotte Brown", dob: "1998-02-14", relationship: "child", previousRelationship: true },
        { name: "Henry Brown", dob: "2001-08-22", relationship: "child", previousRelationship: true },
        { name: "Alice Brown", dob: "2013-05-06", relationship: "child", previousRelationship: false },
      ],
      hasOtherDependants: "no",
      executorName: "Elaine Margaret Brown",
      executorRelationship: "spouse",
      executorAddress: { street: "57 Hampstead Road", suburb: "Highgate Hill", state: "QLD", postcode: "4101" },
      wantBackupExecutor: "yes",
      backupExecutorName: "Natalie Anne Reeves",
      backupExecutorRelationship: "professional",
      appointGuardian: "yes",
      guardianName: "Mark and Lisa Brown",
      guardianRelationship: "sibling",
      guardianAddress: { street: "9 Laurel Avenue", suburb: "Chelmer", state: "QLD", postcode: "4068" },
      assetTypes: ["home", "super", "bank", "investments", "business"],
      estateValue: "2m_5m",
      superNomination: "yes_estate",
      hasSpecificGifts: "yes",
      gifts: [
        { description: "$25,000", recipientName: "Charlotte Brown", recipientRelationship: "my daughter", condition: "" },
        { description: "$25,000", recipientName: "Henry Brown", recipientRelationship: "my son", condition: "" },
      ],
      residuePlan: "custom",
      residueShares: [
        { name: "Elaine Margaret Brown", relationship: "my wife", share: 50 },
        { name: "Charlotte Brown", relationship: "daughter", share: 17 },
        { name: "Henry Brown", relationship: "son", share: 17 },
        { name: "Alice Brown", relationship: "daughter", share: 16 },
      ],
      ultimateBeneficiary: "The Fred Hollows Foundation",
      excludingAnyone: "no",
      funeralWish: "burial",
      funeralDetails: "Family plot at Toowong Cemetery.",
      hasPets: "no",
      hasDigitalAssets: "yes",
      declarationTruth: true,
      declarationCapacity: true,
      declarationAdvice: true,
    },
  },
  {
    id: "m-sophie",
    ref: "MW-2026-0131",
    clientId: "u-sophie",
    lawyer: "u-lawyer-dan",
    status: "changes_requested",
    planId: "standard",
    reviewRound: 2,
    times: { created: 200, submitted: 80, paid: 79 },
    payment: { promo: null, last4: "4242", hoursAgo: 79 },
    answers: {
      fullName: "Sophie Anne Miller",
      dob: "1988-10-09",
      occupation: "Primary school teacher",
      phone: "0409 887 650",
      address: { street: "12 Silky Oak Rise", suburb: "The Gap", state: "QLD", postcode: "4061" },
      maritalStatus: "married",
      partnerName: "Thomas Edward Miller",
      partnerDob: "1986-04-27",
      hasChildren: "yes",
      children: [
        { name: "Ella Miller", dob: "2020-03-15", relationship: "child", previousRelationship: false },
        { name: "Noah Miller", dob: "2020-03-15", relationship: "child", previousRelationship: false },
      ],
      hasOtherDependants: "no",
      executorName: "Thomas Edward Miller",
      executorRelationship: "spouse",
      executorAddress: { street: "12 Silky Oak Rise", suburb: "The Gap", state: "QLD", postcode: "4061" },
      wantBackupExecutor: "yes",
      backupExecutorName: "my sister",
      backupExecutorRelationship: "sibling",
      appointGuardian: "yes",
      guardianName: "my sister",
      guardianRelationship: "sibling",
      guardianAddress: { street: "", suburb: "", state: "QLD", postcode: "" },
      assetTypes: ["home", "super", "bank", "life"],
      estateValue: "1m_2m",
      superNomination: "yes_estate",
      hasSpecificGifts: "no",
      residuePlan: "standard",
      residuePrimary: "my husband, Thomas Edward Miller",
      residueSecondary: "my children Ella and Noah in equal shares",
      ultimateBeneficiary: "Starlight Children's Foundation",
      excludingAnyone: "no",
      funeralWish: "no_preference",
      hasPets: "no",
      hasDigitalAssets: "no",
      declarationTruth: true,
      declarationCapacity: true,
      declarationAdvice: true,
    },
  },
  {
    id: "m-lucas",
    ref: "MW-2026-0122",
    clientId: "u-lucas",
    lawyer: "u-lawyer-grace",
    status: "approved",
    planId: "standard",
    approvedBy: "u-lawyer-grace",
    times: { created: 400, submitted: 160, paid: 159, approved: 26 },
    payment: { promo: null, last4: "4242", hoursAgo: 159 },
    answers: {
      fullName: "Lucas Henry Wilson",
      dob: "1960-08-11",
      occupation: "Retired school principal",
      phone: " (07) 3355 0192",
      address: { street: "88 Circuit Drive", suburb: "Stafford Heights", state: "QLD", postcode: "4053" },
      maritalStatus: "widowed",
      planningToMarry: "no",
      hasChildren: "yes",
      children: [
        { name: "Rebecca Jane Foster", dob: "1988-01-19", relationship: "child", previousRelationship: false },
        { name: "Andrew Lucas Wilson", dob: "1991-06-23", relationship: "child", previousRelationship: false },
      ],
      hasOtherDependants: "no",
      executorName: "Andrew Lucas Wilson",
      executorRelationship: "child",
      executorAddress: { street: "5 Grevillea Place", suburb: "Everton Park", state: "QLD", postcode: "4053" },
      wantBackupExecutor: "yes",
      backupExecutorName: "Rebecca Jane Foster",
      backupExecutorRelationship: "child",
      assetTypes: ["home", "super", "bank", "investments"],
      estateValue: "1m_2m",
      superNomination: "yes_person",
      hasSpecificGifts: "yes",
      gifts: [
        { description: "my grandfather clock", recipientName: "Rebecca Jane Foster", recipientRelationship: "my daughter", condition: "" },
      ],
      residuePlan: "custom",
      residueShares: [
        { name: "Rebecca Jane Foster", relationship: "daughter", share: 50 },
        { name: "Andrew Lucas Wilson", relationship: "son", share: 50 },
      ],
      ultimateBeneficiary: "Medicins Sans Frontieres Australia",
      excludingAnyone: "no",
      funeralWish: "cremation",
      hasPets: "no",
      hasDigitalAssets: "no",
      declarationTruth: true,
      declarationCapacity: true,
      declarationAdvice: true,
    },
  },
  {
    id: "m-harper",
    ref: "MW-2026-0108",
    clientId: "u-harper",
    lawyer: "u-lawyer-dan",
    status: "issued",
    planId: "standard",
    approvedBy: "u-lawyer-dan",
    times: { created: 900, submitted: 500, paid: 499, approved: 200, issued: 170 },
    payment: { promo: "QLDFAMILY25", last4: "4242", hoursAgo: 499 },
    answers: {
      fullName: "Harper Joy Davis",
      dob: "1954-02-28",
      occupation: "Retired librarian",
      phone: "0431 222 904",
      address: { street: "31 Flame Tree Crescent", suburb: "Kenmore Hills", state: "QLD", postcode: "4069" },
      maritalStatus: "married",
      partnerName: "Frank Albert Davis",
      partnerDob: "1952-10-05",
      hasChildren: "yes",
      children: [
        { name: "Megan Joy Hartley", dob: "1979-04-02", relationship: "child", previousRelationship: false },
        { name: "Simon Albert Davis", dob: "1982-07-17", relationship: "child", previousRelationship: false },
        { name: "Clare Louise Bennett", dob: "1985-01-29", relationship: "child", previousRelationship: false },
      ],
      hasOtherDependants: "no",
      executorName: "Frank Albert Davis",
      executorRelationship: "spouse",
      executorAddress: { street: "31 Flame Tree Crescent", suburb: "Kenmore Hills", state: "QLD", postcode: "4069" },
      wantBackupExecutor: "yes",
      backupExecutorName: "Simon Albert Davis",
      backupExecutorRelationship: "child",
      assetTypes: ["home", "super", "bank", "investments", "vehicles"],
      estateValue: "1m_2m",
      superNomination: "yes_estate",
      hasSpecificGifts: "yes",
      gifts: [
        { description: "my diamond brooch", recipientName: "Iris Hartley", recipientRelationship: "my granddaughter", condition: "she has turned 21" },
        { description: "$10,000", recipientName: "Cancer Council Queensland", recipientRelationship: "charity", condition: "" },
      ],
      residuePlan: "standard",
      residuePrimary: "my husband, Frank Albert Davis",
      residueSecondary: "my children Megan, Simon and Clare in equal shares",
      ultimateBeneficiary: "RSPCA Queensland",
      excludingAnyone: "no",
      funeralWish: "burial",
      funeralDetails: "Quiet service, native flowers only.",
      hasPets: "yes",
      pets: [{ animal: "dog", petName: "Matilda", carer: "Simon Albert Davis" }],
      hasDigitalAssets: "no",
      declarationTruth: true,
      declarationCapacity: true,
      declarationAdvice: true,
    },
  },
  {
    id: "m-ethan",
    ref: "MW-2026-0144",
    clientId: "u-ethan",
    lawyer: null,
    status: "in_review",
    planId: "essential",
    times: { created: 20, submitted: 5, paid: 4 },
    payment: { promo: "STAFF100", last4: "4242", hoursAgo: 4 },
    answers: {
      fullName: "Ethan James Clark",
      dob: "2003-05-19",
      occupation: "Apprentice carpenter",
      phone: "0455 901 233",
      address: { street: "9/120 Beck Street", suburb: "Kelvin Grove", state: "QLD", postcode: "4059" },
      maritalStatus: "single",
      planningToMarry: "no",
      hasChildren: "no",
      hasOtherDependants: "no",
      executorName: "Denise Maree Clark",
      executorRelationship: "other",
      executorAddress: { street: "45 Nepean Avenue", suburb: "Norman Park", state: "QLD", postcode: "4170" },
      wantBackupExecutor: "no",
      assetTypes: ["bank", "vehicles"],
      estateValue: "under_500k",
      hasSpecificGifts: "no",
      residuePlan: "standard",
      residuePrimary: "my mother, Denise Maree Clark",
      ultimateBeneficiary: "Beyond Blue",
      excludingAnyone: "no",
      funeralWish: "no_preference",
      hasPets: "no",
      hasDigitalAssets: "no",
      declarationTruth: true,
      declarationCapacity: true,
      declarationAdvice: true,
    },
  },
];

/* ------------------------------------------------------------------ */

function emailShell(title: string, bodyHtml: string): string {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;border:1px solid #E5DECC;border-radius:12px;overflow:hidden">
  <div style="background:#1C4634;color:#FBF8F1;padding:18px 24px"><strong style="font-size:18px">Moreton &amp; Grey</strong><div style="font-size:12px;opacity:.8">Moreton Wills Online — Queensland</div></div>
  <div style="padding:22px 24px;font-family:Helvetica,Arial,sans-serif;color:#15211B;font-size:14px;line-height:1.6">
  <h2 style="font-family:Georgia,serif;margin:0 0 12px;font-size:20px;color:#1C4634">${title}</h2>
  ${bodyHtml}
  <p style="margin-top:22px;color:#5C8374;font-size:12px">This is a PROTOTYPE preview. No real email was sent and no addressee is real.</p></div></div>`;
}

export function buildSeedDB(): DB {
  const matters = matterSeeds.map(buildMatter);

  const notes: Note[] = [
    { id: "n-1", matterId: "m-oliver", authorId: "u-lawyer-grace", body: "Blended family + $2m–$5m estate with business interests. Recommend senior sign-off and a call re: control of the family company before approval.", createdAt: ISO(46) },
    { id: "n-2", matterId: "m-sophie", authorId: "u-lawyer-dan", body: "Guardian named only as \"my sister\" — insufficient for a testamentary appointment. Address block also incomplete. Requested changes.", createdAt: ISO(70) },
    { id: "n-3", matterId: "m-harper", authorId: "u-lawyer-dan", body: "Verified brooch beneficiary is 19 — condition to age 21 confirmed with client by phone 12 Mar.", createdAt: ISO(180) },
  ];

  const messages: Message[] = [
    { id: "msg-1", matterId: "m-mia", fromId: "u-mia", body: "Hi, I wasn't sure whether my super automatically goes into the will — could you check?", internal: false, createdAt: ISO(27) },
    { id: "msg-2", matterId: "m-mia", fromId: "u-lawyer-dan", body: "Good question, Mia. Because you selected \"No binding nomination\", I'll add a note for you to contact your fund. Your will covers your estate either way.", internal: false, createdAt: ISO(26) },
    { id: "msg-3", matterId: "m-mia", fromId: "u-lawyer-dan", body: "Camera collection gift is clear. No issues so far.", internal: true, createdAt: ISO(26) },
    { id: "msg-4", matterId: "m-sophie", fromId: "u-lawyer-dan", body: "Hi Sophie — nearly there. Before I can recommend approval I need your sister's full legal name for the guardian and substitute executor appointments, plus her address. \"My sister\" isn't sufficient for a legal document.", internal: false, createdAt: ISO(70) },
    { id: "msg-5", matterId: "m-sophie", fromId: "u-sophie", body: "Ah of course! Emma Jane Porter. I'll fix the address now. Also the twins' school pickup — that's fine to leave out?", internal: false, createdAt: ISO(48) },
    { id: "msg-6", matterId: "m-oliver", fromId: "u-lawyer-grace", body: "Mr Brown — given the size of the estate and your children from your first marriage, I'd like to schedule the included 30-minute video call before this proceeds. Please book via the link in your plan.", internal: false, createdAt: ISO(45) },
  ];

  const audit: AuditEntry[] = [
    { id: "a-1", actorId: "u-ava", actorRole: "client", action: "matter.created", entityType: "matter", entityId: "m-ava", summary: "Started a new will questionnaire", at: ISO(26) },
    { id: "a-2", actorId: "u-jack", actorRole: "client", action: "matter.submitted_for_payment", entityType: "matter", entityId: "m-jack", summary: "Completed questionnaire and proceeded to payment", at: ISO(6) },
    { id: "a-3", actorId: "u-mia", actorRole: "client", action: "payment.completed", entityType: "payment", entityId: "pi_test_mia", summary: "Paid $159.20 (Essential, WELCOME20) — Stripe test mode", before: undefined, after: { total: 159.2 }, at: ISO(29) },
    { id: "a-4", actorId: "u-mia", actorRole: "client", action: "matter.status", entityType: "matter", entityId: "m-mia", summary: "Status changed to in_review", before: "awaiting_payment", after: "in_review", at: ISO(29) },
    { id: "a-5", actorId: "u-lawyer-grace", actorRole: "lawyer", action: "matter.assigned", entityType: "matter", entityId: "m-oliver", summary: "Matter assigned to Grace Liu", at: ISO(50) },
    { id: "a-6", actorId: "u-lawyer-grace", actorRole: "lawyer", action: "flag.raised", entityType: "matter", entityId: "m-oliver", summary: "Triage flags raised: blended_family, large_estate, business_interests, minor_children", at: ISO(50) },
    { id: "a-7", actorId: "u-lawyer-dan", actorRole: "lawyer", action: "changes.requested", entityType: "matter", entityId: "m-sophie", summary: "Requested changes: guardian full legal name and address required", before: "in_review", after: "changes_requested", at: ISO(70) },
    { id: "a-8", actorId: "u-sophie", actorRole: "client", action: "answer.edited_after_submission", entityType: "matter", entityId: "m-sophie", summary: "Client edited answer \"guardianName\" while changes requested", before: "my sister", after: "my sister", at: ISO(47) },
    { id: "a-9", actorId: "u-lawyer-grace", actorRole: "lawyer", action: "matter.approved", entityType: "matter", entityId: "m-lucas", summary: "Will approved — ready for issue", before: "in_review", after: "approved", at: ISO(26) },
    { id: "a-10", actorId: "u-lawyer-dan", actorRole: "lawyer", action: "matter.approved", entityType: "matter", entityId: "m-harper", summary: "Will approved", before: "in_review", after: "approved", at: ISO(200) },
    { id: "a-11", actorId: "u-lawyer-dan", actorRole: "lawyer", action: "matter.issued", entityType: "matter", entityId: "m-harper", summary: "Will issued to client", before: "approved", after: "issued", at: ISO(170) },
    { id: "a-12", actorId: "u-lawyer-dan", actorRole: "lawyer", action: "export.generated", entityType: "matter", entityId: "m-harper", summary: "DOCX export generated", at: ISO(170) },
    { id: "a-13", actorId: "u-admin", actorRole: "admin", action: "user.role_changed", entityType: "user", entityId: "u-observer", summary: "Created read-only Demo Observer account for sales demos", at: ISO(300) },
    { id: "a-14", actorId: "u-admin", actorRole: "admin", action: "promo.updated", entityType: "promo", entityId: "QLDFAMILY25", summary: "Promo code QLDFAMILY25 refreshed for MyCommunity Credit Union members", at: ISO(220) },
    { id: "a-15", actorId: "u-ethan", actorRole: "client", action: "payment.completed", entityType: "payment", entityId: "pi_test_ethan", summary: "Paid $0.00 (Essential, STAFF100) — Stripe test mode", at: ISO(4) },
  ];

  const mail: MailItem[] = [
    { id: "mail-1", toEmail: "ava.nguyen@example.com", toName: "Ava Nguyen", subject: "Welcome — your will is waiting", kind: "welcome", matterId: "m-ava", createdAt: ISO(26), html: emailShell("Welcome, Ava", `<p>Your online will questionnaire has been started. You can save and resume at any time — your answers are stored securely as you go.</p><p><a href="#" style="color:#1C4634">Continue your questionnaire →</a></p>`) },
    { id: "mail-2", toEmail: "mia.walker@example.com", toName: "Mia Walker", subject: "Receipt — Essential Will ($159.20)", kind: "receipt", matterId: "m-mia", createdAt: ISO(29), html: emailShell("Payment received", `<p>Thanks Mia — we've received your payment of <strong>$159.20</strong> for the Essential Will (WELCOME20 applied, card ending 4242).</p><p>Your will is now in the lawyer review queue. Turnaround is usually 2–3 business days.</p><p style="font-size:12px;color:#5C8374">Stripe test mode — card 4242 was not charged.</p>`) },
    { id: "mail-3", toEmail: "sophie.miller@example.com", toName: "Sophie Miller", subject: "Action needed — a small change to your will answers", kind: "changes_requested", matterId: "m-sophie", createdAt: ISO(70), html: emailShell("A quick change is needed", `<p>Hi Sophie — Daniel has reviewed your will and needs one clarification:</p><blockquote style="border-left:3px solid #B08D2E;margin:12px 0;padding:4px 12px;color:#444">Please provide your sister's full legal name and address for the guardian and substitute executor appointments.</blockquote><p><a href="#" style="color:#1C4634">Log in to update your answers →</a></p>`) },
    { id: "mail-4", toEmail: "lucas.wilson@example.com", toName: "Lucas Wilson", subject: "Your will has been approved", kind: "approved", matterId: "m-lucas", createdAt: ISO(26), html: emailShell("Your will is approved", `<p>Good news, Lucas — Grace has approved your will. It will now be prepared for formal issue.</p><p>You'll receive your signing instructions shortly.</p>`) },
    { id: "mail-5", toEmail: "harper.davis@example.com", toName: "Harper Davis", subject: "Your will is ready to sign", kind: "issued", matterId: "m-harper", createdAt: ISO(170), html: emailShell("Your will has been issued", `<p>Dear Harper, your will has been reviewed, approved and issued. Download it from your Moreton Wills dashboard.</p><p><strong>Signing checklist:</strong></p><ol><li>Print the will single-sided.</li><li>Sign each page in blue pen, with two adult witnesses present together.</li><li>Witnesses must not be beneficiaries.</li><li>Store the original safely and tell your executor where it is.</li></ol><p style="font-size:12px;color:#5C8374">Signing requirements: s 10 Succession Act 1981 (Qld).</p>`) },
    { id: "mail-6", toEmail: "daniel@moretongrey.example", toName: "Daniel O'Connor", subject: "Review queue: 3 matters assigned to you", kind: "internal_digest", createdAt: ISO(30), html: emailShell("Your review queue", `<p>You have 3 matters awaiting review: MW-2026-0138 (Mia Walker), MW-2026-0131 (Sophie Miller — changes pending), MW-2026-0108 (Harper Davis — issued).</p>`) },
  ];

  return {
    seededAt: new Date().toISOString(),
    users: USERS.map((u) => ({ ...u })),
    matters,
    notes,
    messages,
    audit,
    mail,
    promos: (pricingConfig.promoCodes as unknown as PromoCode[]).map((p) => ({ ...p })),
    plans: (pricingConfig.plans as unknown as Plan[]).map((p) => ({ ...p })),
    clauses: (clausesConfig.clauses as unknown as Clause[]).map((c) => ({ ...c })),
    questions: JSON.parse(JSON.stringify(questionsConfig)),
    leads: [
      {
        id: "lead-1",
        name: "Tomas Varga",
        email: "tomas.varga@example.com",
        phone: "0477 221 904",
        reason: "Executor under 18 — blocked online",
        preferredTime: "Weekday mornings",
        matterId: null,
        createdAt: ISO(70),
        status: "new",
      },
    ],
    referralCredits: {
      "u-harper": { code: makeReferralCode("u-harper", "Harper"), invited: 3, converted: 2, credit: 100 },
      "u-lucas": { code: makeReferralCode("u-lucas", "Lucas"), invited: 1, converted: 0, credit: 0 },
    },
  };
}
