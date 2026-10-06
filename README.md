# Moreton Wills Online — prototype

A working prototype of an online wills service for a Queensland law firm. Clients complete a
guided, one-question-per-screen questionnaire, pay online, and a solicitor reviews every answer
before the will is issued.

> **Prototype. Dummy data only. Not legal advice.**
> All clause wording is placeholder text marked `DRAFT: firm to approve`. Stripe runs in test
> mode. No email is ever sent — every notification renders in-app at `/mail`.

Full project documentation — build phases, routes map, data model, config guide and acceptance
status — lives in **[PROJECT.md](./PROJECT.md)**.

---

## Quick start

```bash
npm install
cp .env.example .env     # set SESSION_SECRET to any random string
npm run dev              # http://localhost:3000
```

There is **no database step**. The prototype seeds an in-memory store on first request
(`src/lib/seed.ts`), so every persona, matter, payment and email exists immediately. Admin →
"Reset demo data" restores the seed between user-testing sessions.

```bash
npm run build            # production build (48 routes)
npm run start            # production server
npx vitest run           # 55 logic tests incl. 10 scenario snapshots
npm run typecheck        # tsc --noEmit (strict)
```

### Demo logins

Every seeded account uses the password **`demo1234`**, and the floating **persona switcher**
(bottom-left) signs you in as any of them in one click.

| Role | Account | Where it lands |
|---|---|---|
| Admin | `admin@moretongrey.example` | `/admin` |
| Senior Lawyer | `senior@moretongrey.example` | `/lawyer` |
| Lawyer | `daniel@moretongrey.example`, `grace@…` | `/lawyer` |
| Demo Observer (read-only) | `observer@moretongrey.example` | `/app` |
| Clients ×8 | `ava.nguyen@example.com` … | `/app` |

Seeded clients cover every status: draft, awaiting payment, in review, changes requested,
approved, issued.

---

## A five-minute demo path

1. **Persona → Jack Thompson** → `/will` — seven step cards, readiness ring, live estate snapshot.
2. Click **Resume where you left off** — one question per screen, "Why we ask", autosave, and the
   live will preview building on the right.
3. Finish → **Review** — consistency checker, complexity score, flags in plain English.
4. **Checkout** — card `4242 4242 4242 4242`, promo `WELCOME10`, or `FIRMFRIEND` for 100% off
   (skips Stripe but still creates an order and tax invoice).
5. **Persona → Daniel O'Connor** → `/lawyer` — queue tabs, KPIs, kanban board.
6. Open the matter → **Flags** tab — acknowledge/resolve/escalate, complete the approval checklist,
   approve. Try approving first: it refuses until the gates pass.
7. **Persona → Harper Davis** → `/app/documents/m-harper` — page-turn preview, hover a clause for
   *"included because you said…"*, download DOCX/PDF.
8. **Persona → Priya Sharma (Admin)** → `/admin/simulator`, `/admin/reports`, `/admin/testing`.

---

## Architecture

```
config/          questions.json · flags.json · clauses.json · pricing.json
                 brand.json · glossary.json · charities.json
src/app/         routes (App Router)
src/components/  design system + feature components
src/lib/         engine, validation, steps, readiness, clauseEngine, docgen, actions
tests/           Vitest: engine, validation, clause assembly, 10 scenario fixtures
```

**Everything meaningful is config-driven.** Questions, branching, triage flags, clause wording,
pricing, promo codes and brand tokens all live in `/config` as JSON — no logic is hard-coded in
components.

| Concern | File | Notes |
|---|---|---|
| Questionnaire | `config/questions.json` | 7 steps, `visibleIf` branching, `why`, repeaters |
| Triage flags | `config/flags.json` | 31 rules, severity model, complexity bands, consistency checks |
| Clause bank | `config/clauses.json` | 40 clauses, variants, versioning, approval state |
| Pricing | `config/pricing.json` | plans, add-ons, GST, promo codes, referral rates |
| Brand | `config/brand.json` | colours, neutrals, radii, shadows, fonts, tone of voice |

### How to edit questions

1. Open `config/questions.json` (or **Admin → Questions** for a validated in-app editor).
2. Add a question object to a section's `questions[]`:

```jsonc
{
  "id": "petInsurance",
  "type": "radio",
  "label": "Do you have pet insurance?",
  "required": true,
  "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }],
  "visibleIf": { "==": [{ "var": "hasPets" }, "yes"] },
  "why": "Helps your executor keep cover running while a new home is found."
}
```

3. Check it in **Admin → Logic simulator** — pick answers and watch which questions appear and
   which flags fire. No deploy required.

### How to edit clauses

1. **Admin → Clause bank** (Admin or Senior Lawyer). Each clause has `include` conditions and one
   or more `variants`, each with its own `when`.
2. Edit a variant → the version bumps and approval resets to **DRAFT**.
3. Only the **Senior Lawyer** can approve wording. The `DRAFT — NOT YET APPROVED` watermark is
   removed from exports only once a matter is issued.
4. Every clause card shows a live **preview with sample data** and a **conditional-logic tester**.

### Supported json-logic operators

`==` `!=` `>` `<` `>=` `<=` `in` `and` `or` `not`/`!` `truthy`, with `{ "var": "answers.x" }` or
`{ "var": "derived.x" }`. Derived facts (age, `hasMinorChildren`, `blendedFamily`,
`cashGiftsHeavy`, `helperIsBeneficiary`, …) are computed in `src/lib/engine.ts`.

---

## Payments

The prototype ships a **faithful mock of Stripe Checkout** rather than a live integration, so the
demo works with no keys and no network. It implements the same surface: test cards, declines,
promo validation (invalid / expired / maxed-out / wrong product), referral codes, 100%-off bypass,
GST-inclusive tax invoices and idempotent double-click protection.

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |

Promo codes: `WELCOME10` (10%), `PARTNER50` ($50), `FIRMFRIEND` (100%), `EXPIRED1` (expired),
`MAXEDOUT` (limit reached), `MIRROR75` (mirror wills only).

To run against real test-mode Stripe, set the keys in `.env` and forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

---

## Accessibility

- WCAG 2.2 AA targets: visible focus rings, labelled controls, `aria-live` regions, 44px tap
  targets, keyboard-completable questionnaire (Enter advances).
- **Accessibility toolbar** (bottom-right): text size 90–150%, high contrast, dyslexia-friendly
  font, dark mode, and read-aloud via the Web Speech API.
- Every animation respects `prefers-reduced-motion`; `MotionConfig reducedMotion="user"` is set
  globally and components branch on `useReducedMotion()`.
- 18px base body text on mobile.

---

## Assumptions made

1. **No database.** The brief asked for dummy data with no DB connection, so the Section 14 model
   is implemented as typed in-memory structures (`src/lib/types.ts`) with the same shape. Swapping
   in Prisma means replacing `src/lib/store.ts`.
2. **Stripe is mocked, not integrated** — see above. The webhook route and simulate-payment
   fallback are modelled, but a live `stripe listen` loop needs real keys.
3. **Auth is custom** (HMAC-signed cookie) rather than Auth.js, because Auth.js adapters assume a
   database. Roles, sessions, magic links, idle timeout and rate limiting are all implemented.
4. **Clause wording is placeholder.** Nothing is presented as settled legal drafting; everything
   carries a DRAFT marker until the firm's principal approves it.
5. **Playwright** is not included — the sandbox has no browser runtime. Coverage is instead 55
   Vitest tests (engine, branching, validation, clause assembly, 10 scenario snapshots) plus
   scripted HTTP checks of RBAC and exports.

---

## Compliance notes

- Persistent dismissible banner: *"Prototype — dummy data only. Not legal advice."*
- Consent checkbox at `/start` warning users not to enter real details.
- `/legal/privacy`, `/legal/terms`, `/legal/disclaimer` and `/privacy-controls` with a working
  **"Delete my test data"** button.
- Audit log records every state change with actor, role, before/after and timestamp.
- `noindex` on all pages; no secrets committed; `.env.example` provided.
