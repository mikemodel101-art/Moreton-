# Moreton Wills Online — project document

> **Prototype for testing. Dummy data only. Not legal advice.**
> Stripe runs in test mode. No email is ever sent. All clause wording is placeholder
> text marked **DRAFT: firm to approve**.

This is the working prototype of an online wills service for a Queensland law firm, built for
user-testing sessions and as the sales demo to win the full build. A client answers guided
questions one screen at a time, pays online, and a solicitor reviews every answer before the
will is issued — end to end, on seeded dummy data.

- **Live surface:** 48 routes, five roles, 8 seeded matters across every status
- **Engine:** config-driven questions, 31 triage flags, complexity scoring, variant-based
  clause bank, DOCX/PDF generation
- **Docs:** this file (project) · `README.md` (setup + how to edit) · `.env.example`

---

## 1 · Build phases (Section 17) — status log

All eleven phases complete. Each entry: what was built, how to verify it, and assumptions made.

### Phase 1 — Foundation ✅

**Built:** Next.js 16 (App Router, TS strict), Tailwind v4 with runtime brand-token injection
from `config/brand.json`, full design system (`/design`), custom HMAC-cookie auth with five
roles and server-side RBAC, seeded in-memory store (14 users, 8 matters, notes, messages, audit,
mail), floating **Demo Persona Switcher**, prototype banner.

**Verify:** `/login` → quick sign-in buttons. Bottom-left pill switches identity anywhere.

**Assumptions:** custom cookie auth instead of Auth.js (no DB for its adapter); in-memory seeded
store instead of a database, per the brief.

### Phase 2 — Questionnaire engine ✅

**Built:** JSON config loader, branching evaluator (`visibleIf` json-logic + derived facts),
one-question-per-screen at `/will/[step]/[questionId]`, 400 ms debounced autosave with tick
morph, resume-on-any-device at the exact unanswered question, direction-aware transitions,
stepper rail with completion rings, "Why we ask" expander, "I'm not sure" sentinel.

**Verify:** persona → Ava Nguyen → Resume → change `hasChildren` and watch Guardians appear.

### Phase 3 — All 7 steps populated ✅

**Built:** About you (identity, relationships, children, prior wills, structures, dependants,
helper/undue-influence), Guardians (incl. trust-age selector), Pets, **Executors** (up to 4 +
substitutes, over-18 confirmation, issues → flag or hard stop, professional executor, spoken-to
nudge), **Divide estate** (four structures, beneficiary allocator with live donut, charity ABN
lookup, survivorship rules, vulnerable beneficiaries, tenure, exclusions), **Gifts** (typed:
cash/item/property/crypto with fallbacks, conditions, proportionality warning), **Funeral
wishes** and declarations. Every question has plain-English help and a "Why we ask" note.

**Verify:** walk Ava's draft → `/will` shows per-step status + time estimates.

### Phase 4 — Flags & review ✅

**Built:** severity model (info/medium/high/blocker with weights), 31 triage rules covering the
whole starter library, **complexity score & routing** (Straightforward / Needs attention /
Complex → senior lawyer), blocker path to `/book-a-call` with lead capture, **consistency
checker** (10 contradiction rules with jump-to-fix links) on the review screen, logic simulator
at `/admin/simulator`.

**Verify:** simulator → "Blocker: helper is beneficiary" preset → complexity reads BLOCKED;
Jack's review shows "All answered".

### Phase 5 — Checkout ✅

**Built:** Stripe-style test-mode checkout (4242 success / 4000…0002 decline), four plans
including **Mirror Wills (couple)**, three add-ons, GST-inclusive totals, promo engine with
distinct invalid/expired/maxed-out/wrong-product errors, 100%-off bypass that skips the card and
still creates an order, **referral codes** with credit ledger and `/referrals` dashboard,
idempotent double-submission guard, PDF **tax invoice** at `/api/invoice/[id]`.

**Verify:** `/pricing` promo tester; Jack's pay flow with `WELCOME10`; download invoice.

**Assumptions:** Stripe is faithfully mocked (no live keys in the sandbox); webhook listen
command documented in README.

### Phase 6 — Document engine ✅

**Built:** 40-clause bank with `include` conditions + per-variant `when`, versioning and DRAFT
approval state; assembly in the statutory section order; live preview panel with new-clause
highlight; page-turn reader with "included because you said…" provenance; **DOCX** (heading
styles, auto-numbered clauses, initials footer, Page X of Y, cover page with dummy QR,
attestation page with witness blocks) and **PDF** (locked DRAFT watermark removed only on
issue); standalone 1-page signing-guide PDF; filename pattern `Will_{Surname}_{MatterID}_v{n}`.

**Verify:** `/app/documents/m-harper` + both export buttons; `Will_Davis_MW-2026-0108_v1.docx`.

### Phase 7 — Lawyer dashboard & workspace ✅

**Built:** queue tabs (New / In review / Awaiting client / Ready to approve / Approved / All,
plus Mine, Complex, SLA risk), list ⇄ kanban with spring-snapping drag mapped to real workflow
actions, KPI cards incl. SLA breach count; 3-pane workspace: answers with provenance, **flags
pane** (acknowledge / resolve-with-note — high & blocker flags are senior-only / escalate), clause
editor with rich text + word-level diff vs bank, notes, messages, audit, versions; **approval
checklist** + three server-side approval gates; DOCX/PDF exports with audit trail.

**Verify:** open a matter as Daniel → try Approve first (it refuses), then resolve flags, tick
the checklist, approve → client notified by email preview.

### Phase 8 — Admin console ✅

**Built:** users & role management, promo/referral code register (create/disable/limits/expiry/
product restriction), pricing editor, **clause bank editor** (versions, sample-data preview,
conditional-logic tester, senior-only approval), questions JSON editor with schema validation,
**logic simulator**, **reports** (conversion funnel, revenue, promos, referrals, avg review time,
flag frequency), **user-testing toolkit** (clarity scores, time-on-screen, drop-off, CSV export),
leads register, audit log, demo-data reset.

**Verify:** `/admin/*` every nav item renders; edit a promo → checkout reflects it instantly.

### Phase 9 — Mock screens ✅

Clearly labelled "Preview feature", all interactive on dummy data:
**Will storage** (animated lock/unlock, certified-copy requests, access matrix, access log,
retrieval flow), **Annual reminders** (toggle, month, email preview, life-events checklist with
advice, calendar, snooze), **Executor contact** (statuses, message templates, send-notification,
"where my will is kept" card, executor access timeline).

**Verify:** `/extras/storage`, `/extras/reminders`, `/extras/executor-contact`.

### Phase 10 — Animation, accessibility, mobile ✅

**Built:** whole Section 4 spec — direction-aware question slides, branching height reveals,
tick morph autosave, offline state, completion light-bloom, staggered lists, tweened counters,
parallax hero, scroll-driven how-it-works, promo countdown, page-turn reader. Global
`MotionConfig reducedMotion="user"`; 18px mobile body text; focus rings; skip links; skeleton
loading routes; offline banner; **accessibility toolbar** (text size, high contrast,
dyslexia-friendly font, brand-token dark mode, Web-Speech read-aloud).

**Verify:** open DevTools → emulate `prefers-reduced-motion` → all animation collapses.

### Phase 11 — Extras, toolkit, docs ✅

**Built:** Will Readiness ring with next-best-action, Estate Snapshot visualiser, glossary
drawer (24 terms) + inline tooltips, smart nudges, notification centre, notification of
resume-link emails, printable document checklist + print-friendly review, privacy controls with
**Delete my test data**, consent checkbox at `/start`, legal pages, 403/error/empty states,
README, `.env.example`.

**Verify:** any client's `/will`; `/privacy-controls` delete flow restores a clean account.

---

## 2 · Routes map

| Area | Routes |
|---|---|
| Marketing | `/`, `/pricing`, `/login`, `/register`, `/design`, `/legal/{privacy,terms,disclaimer}`, `/book-a-call` |
| Client journey | `/start`, `/will`, `/will/resume`, `/will/review`, `/will/[step]/[questionId]`, `/checkout`, `/checkout/success`, `/status`, `/messages`, `/signing-guide`, `/referrals`, `/security`, `/privacy-controls` |
| Client portal | `/app`, `/app/wizard/[id]`, `/app/wizard/[id]/review`, `/app/pay/[id]`, `/app/status/[id]`, `/app/documents/[id]`, `/app/messages/[id]`, `/mail`, `/extras/[tool]` |
| Lawyer | `/lawyer`, `/lawyer?f=<tab>`, `/lawyer?v=kanban`, `/lawyer/matters/[id]`, `/lawyer/audit` |
| Admin | `/admin`, `/admin/users`, `/admin/promos`, `/admin/pricing`, `/admin/clauses`, `/admin/questions`, `/admin/simulator`, `/admin/reports`, `/admin/testing`, `/admin/leads`, `/admin/audit` |
| API | `/api/health`, `/api/export/[matterId]/{docx,pdf}`, `/api/invoice/[id]`, `/api/signing-guide`, `/api/auth/magic` |
| Support | `/403`, `/404` (branded), `error.tsx`, route-level `loading.tsx` skeletons |

Legacy `/app/tools/*` redirect to `/extras/*`; journey resolvers keep `/will/review`,
`/checkout`, `/status`, `/messages` thin over the deep pages — **no dead links anywhere**.

---

## 3 · Data model (Section 14 → in-memory types)

The brief (dummy data, no DB) is implemented as TypeScript interfaces in `src/lib/types.ts`,
stored in a seeded in-memory store (`src/lib/store.ts` + `src/lib/seed.ts`) with identical
shape, so swapping to Prisma later means replacing one module:

| Section 14 entity | Prototype equivalent |
|---|---|
| User | `User` (id, role, password, color) |
| Matter | `Matter` (status, complexityScore/Band, plan, timestamps) |
| Answer | `Matter.answers: Record<questionId, value>` + `versions[]` snapshots |
| Flag | `Matter.flags[]` (engine-evaluated) + `flagResolutions[]` |
| ClauseSelection | `Matter.clauseOverrides[clauseId]` {enabled, text} |
| Document | generated on demand (exports are audit-logged) |
| Order | `Matter.payment` {invoiceNo, addOns, gst, refund field} |
| PromoCode | `db().promos` {maxUses, expiresAt, appliesTo} |
| Referral | `db().referralCredits[userId]` {code, invited, converted, credit} |
| Message / Note | `db().messages`, `db().notes` (internal flags) |
| AuditLog | `db().audit` {actor, role, action, before, after, at} |
| Feedback | user-testing store (rating, ms, comment) + `/admin/testing` + CSV |
| ReminderPref | mock-screen state (Section 12 illustrative) |
| ExecutorContact | mock screen state + `/extras/executor-contact` |
| Lead | `db().leads` (blocker consult requests) |

Every mutation records an `AuditLog` row, visible to Senior Lawyer/Admin with before→after JSON.

---

## 4 · Config guide (everything meaningful is a JSON file)

| File | Owns |
|---|---|
| `config/questions.json` | 7 steps, all questions, branching (`visibleIf`), help, `why`, repeaters, totals |
| `config/flags.json` | 31 triage rules (trigger → client/lawyer message → routing), severity weights, complexity bands, 10 consistency checks, feature toggles (userTestingMode, livePreview) |
| `config/clauses.json` | 40 clauses, 14 sections, variants, lawyer notes, v/versioning, approval state |
| `config/pricing.json` | plans (Single×2, Mirror, Premium), add-ons, GST rate, tax-invoice entity, promo codes, referral economics |
| `config/brand.json` | colours, neutral 50–900, radii, shadows, spacing, fonts, logos, tone of voice + tooltip examples |
| `config/glossary.json` | 24 plain-English terms (term → short → long → related) |
| `config/charities.json` | mock ACNC registry for the ABN lookup |

Edit → verify in `/admin/simulator` (questions & flags) or `/admin/clauses` preview
(clauses & pricing). No config edit requires code or redeploy.

---

## 5 · Acceptance criteria (Section 15) — status

**Functional** — register → 7 steps → review → pay → "In review" ✅ · mid-way resume to the
exact question ✅ · branch coverage via Vitest ✅ · 31 flags incl. Complex→senior ✅ · promo &
referral states ✅ · webhook-mock + simulate-payment fallback ✅ · lawyer resolve-flags /
edit-clause-diff / request-changes / approve with gates ✅ · DOCX+PDF with numbering, witness
blocks, watermark logic ✅ · role guards verified via URL & API curls ✅ · three mock screens
interactive ✅

**Design/UX** — 360/768/1280 responsive, ≥44px targets ✅ · Section 4 animations incl.
reduced-motion ✅ · keyboard-complete questionnaire with visible focus, labels, AA contrast ✅ ·
Lighthouse not runnable in sandbox — engineered to the spec (18px mobile text, minimal JS,
system-tuned images).

**Engineering** — README + `.env.example` + no secrets ✅ · seed script ✅ · Vitest 55 passing
✅ · Playwright **not included** (no browser runtime in the sandbox) — replaced by unit tests +
scripted HTTP checks; noted in README.

---

## 6 · Assumptions register

1. **No database** — the brief said dummy-data-only, so data lives in a seeded in-memory store;
   Section 14 shapes preserved for a later Prisma swap.
2. **Stripe is mocked faithfully** rather than integrated — no live keys in the sandbox; test
   cards, declines, promo states, 100% bypass, invoices and idempotency all modelled. Real test
   keys slot into `.env` with a documented `stripe listen` command.
3. **Custom HMAC auth** because Auth.js needs a DB-backed adapter.
4. **All clause wording is placeholder** — never presented as settled drafting; DRAFT markers
   everywhere until approved.
5. **Mirror wills** shipped as the couple product + shared pricing rather than a separate
   partner-invite portal flow.
6. **Playwright omitted** (sandbox), substituted with 55 Vitest tests + scripted request checks.

---

## 7 · Compliance

- Persistent dismissible banner on every page; `noindex`; consent at `/start` not to enter real
  details; `/legal/*`; `/privacy-controls` with working delete; immutable audit log; DRAFT
  clause watermarking; mock screens labelled "Preview feature".
