export type Role = "client" | "lawyer" | "senior_lawyer" | "admin" | "observer";

export type MatterStatus =
  | "draft"
  | "awaiting_payment"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "issued";

export const STATUS_LABELS: Record<MatterStatus, string> = {
  draft: "Draft",
  awaiting_payment: "Awaiting payment",
  in_review: "In lawyer review",
  changes_requested: "Changes requested",
  approved: "Approved",
  issued: "Issued",
};

export const STATUS_ORDER: MatterStatus[] = [
  "draft",
  "awaiting_payment",
  "in_review",
  "changes_requested",
  "approved",
  "issued",
];

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // dummy prototype credentials only
  role: Role;
  title?: string;
  color: string; // avatar hue
}

export interface Address {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
}

export type AnswerValue =
  | string
  | number
  | boolean
  | null
  | Address
  | Array<Record<string, unknown>>
  | string[];

export type Answers = Record<string, AnswerValue | undefined>;

export type FlagSeverity = "info" | "medium" | "high" | "blocker";

export interface FlagEval {
  id: string;
  label: string;
  severity: FlagSeverity;
  category: string;
  clientMessage: string;
  lawyerMessage: string;
  routing: "lawyer" | "senior-lawyer";
  blocksAutoApproval: boolean;
  weight: number;
  /** derived convenience: routing === "senior-lawyer" */
  requiresSeniorSignOff: boolean;
}

export type FlagState = "open" | "acknowledged" | "resolved" | "escalated";

export interface FlagResolution {
  flagId: string;
  state: FlagState;
  note?: string;
  byUserId: string;
  at: string;
}

export interface WillVersion {
  id: string;
  n: number;
  createdAt: string;
  byUserId: string;
  reason: string;
  answers: Answers;
  clauseTexts: string[];
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  reason: string;
  preferredTime: string;
  matterId: string | null;
  createdAt: string;
  status: "new" | "contacted";
}

export interface Payment {
  id: string;
  planId: string;
  planName: string;
  base: number;
  addOnIds?: string[];
  addOnTotal?: number;
  discount: number;
  total: number;
  gst?: number;
  promoCode?: string | null;
  referralCode?: string | null;
  last4: string;
  paidAt: string;
  invoiceNo?: string;
  refundedAt?: string | null;
}

export interface ClauseOverride {
  enabled?: boolean;
  text?: string;
}

export interface Matter {
  id: string;
  ref: string;
  clientId: string;
  assignedLawyerId: string | null;
  status: MatterStatus;
  planId: string;
  answers: Answers;
  flags: FlagEval[];
  pendingSignOff: boolean;
  signedOffBy: string | null;
  approvedBy: string | null;
  clauseOverrides: Record<string, ClauseOverride>;
  payment: Payment | null;
  reviewRound: number;
  flagResolutions: Record<string, FlagResolution>;
  versions: WillVersion[];
  complexityScore: number;
  complexityBand: string;
  referralCode: string | null;
  referredBy: string | null;
  approvalChecklist: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  paidAt: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
}

export interface Note {
  id: string;
  matterId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Message {
  id: string;
  matterId: string;
  fromId: string;
  body: string;
  internal: boolean; // internal = lawyer-only comment; false = visible to client
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  at: string;
}

export interface MailItem {
  id: string;
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  kind: string;
  matterId?: string;
  createdAt: string;
}

export interface PromoCode {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  active: boolean;
  referrer: string | null;
  note: string;
  uses: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  appliesTo?: string[] | null;
}

export interface Plan {
  id: string;
  name: string;
  kind?: string;
  price: number;
  blurb: string;
  features: string[];
  recommendedFor: string;
  popular: boolean;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  blurb: string;
  recommendedWhen: string | null;
}

export interface ClauseVariant {
  id: string;
  when: unknown | null;
  text: string;
}

export interface Clause {
  id: string;
  legacyId?: string | null;
  title: string;
  section: string;
  order: number;
  include: unknown | null;
  optional: boolean;
  repeat?: string | null;
  variants: ClauseVariant[];
  lawyerNotes: string;
  version: string;
  status: string;
  approvedBy: string | null;
  approvedOn: string | null;
}

export interface ClauseCategory {
  id: string;
  title: string;
  order: number;
}

export interface SessionPayload {
  userId: string;
  at: number;
}
