"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, CheckCircle2, CreditCard, Gift, Loader2, Mail, Receipt, Tag } from "lucide-react";
import { checkPromoAction, completeCheckoutAction, updateAddOnsAction, updatePlanAction } from "@/lib/actions/client";
import { Button, Input, FieldShell, cn } from "@/components/ui";
import { AnimatedMoney } from "@/components/design-system";
import { AnimatePresence, motion as fm } from "framer-motion";
import { formatDateTime, money } from "@/lib/engine";
import type { Payment } from "@/lib/types";

interface PlanLite {
  id: string;
  name: string;
  price: number;
  features: string[];
}

function formatCard(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return d.slice(0, 2) + "/" + d.slice(2);
}

export function Checkout({
  matterId,
  matterRef,
  plans,
  addOns,
  initialAddOns,
  currentPlanId,
  successMode,
  payment,
  readOnly,
}: {
  matterId: string;
  matterRef: string;
  plans: PlanLite[];
  addOns: { id: string; name: string; price: number; blurb: string }[];
  initialAddOns: string[];
  currentPlanId: string;
  successMode: boolean;
  payment: Payment | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [planId, setPlanId] = useState(currentPlanId);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(initialAddOns);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number; description: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payError, setPayError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "processing" | "done">(successMode ? "done" : "form");
  const [pending, start] = useTransition();

  const plan = plans.find((p) => p.id === planId)!;
  const addOnTotal = addOns.filter((a) => selectedAddOns.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const subtotal = plan.price + addOnTotal;
  const total = Math.max(0, subtotal - (promo?.discount ?? 0));
  const isFree = total === 0;

  function changePlan(id: string) {
    setPlanId(id);
    setPromo(null);
    start(async () => {
      await updatePlanAction(matterId, id);
    });
  }

  function applyPromo() {
    setPromoError(null);
    start(async () => {
      const r = await checkPromoAction(promoInput, planId, selectedAddOns);
      if (r.ok && r.data) {
        setPromo({ code: promoInput.trim().toUpperCase(), discount: r.data.discount, description: r.data.description });
      } else if (!r.ok) {
        setPromo(null);
        setPromoError(r.error);
      }
    });
  }

  function validate(): boolean {
    if (isFree) return true; // 100% promo / referral — skip the card entirely
    const e: Record<string, string> = {};
    if (card.number.replace(/\D/g, "").length !== 16) e.number = "Enter the 16-digit card number";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) e.expiry = "Use MM/YY";
    if (!/^\d{3,4}$/.test(card.cvc)) e.cvc = "3–4 digits";
    if (card.name.trim().length < 2) e.name = "Name on card is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function pay() {
    if (!validate()) return;
    setPayError(null);
    setPhase("processing");
    // Simulated Stripe latency, then the real server action
    setTimeout(() => {
      start(async () => {
        const r = await completeCheckoutAction({
          matterId,
          cardNumber: card.number,
          expiry: card.expiry,
          cvc: card.cvc,
          name: card.name,
          promoCode: promo?.code ?? null,
          addOnIds: selectedAddOns,
          freeOrder: isFree,
        });
        if (r.ok) {
          setPhase("done");
          router.replace(`/app/pay/${matterId}?done=1`);
          router.refresh();
        } else {
          setPhase("form");
          setPayError(r.error);
        }
      });
    }, 1400);
  }

  if (phase === "done") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="mt-8 overflow-hidden rounded-3xl border border-eucalyptus/25 bg-paper card-shadow-lg"
      >
        <div className="bg-eucalyptus px-7 py-10 text-center text-paper">
          <motion.div
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-paper"
          >
            <CheckCircle2 className="h-9 w-9 text-eucalyptus" aria-hidden />
          </motion.div>
          <h2 className="mt-4 font-display text-3xl font-semibold">Payment successful</h2>
          <p className="mt-2 text-paper/75">Your will is now with a Queensland lawyer for review.</p>
        </div>
        <div className="grid gap-6 px-7 py-7 sm:grid-cols-3">
          {[
            { n: "1", t: "Receipt preview", d: "Find it in your in-app mailbox (no real email is sent)." },
            { n: "2", t: "Lawyer review", d: "Usually 2–3 business days. You can message your lawyer any time." },
            { n: "3", t: "Approval & issue", d: "Once issued, download your will and signing checklist here." },
          ].map((s) => (
            <div key={s.n} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-[#7A5C14]">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-bold text-ink">{s.t}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 border-t border-ink/10 px-7 py-5">
          <Button onClick={() => router.push(`/status?m=${matterId}`)}>Track your review</Button>
          <a href={`/api/invoice/${matterId}`} className="inline-flex items-center gap-2 rounded-full border-2 border-eucalyptus px-5 py-2.5 text-sm font-semibold text-eucalyptus hover:bg-eucalyptus hover:text-paper">
            <Receipt className="h-4 w-4" aria-hidden /> Tax invoice (PDF)
          </a>
          <Button variant="outline" onClick={() => router.push("/referrals")}>
            <Gift className="h-4 w-4" aria-hidden /> Get your referral code
          </Button>
          <Button variant="ghost" onClick={() => router.push("/mail")}>
            <Mail className="h-4 w-4" aria-hidden /> Email previews
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      {/* Processing overlay */}
      {phase === "processing" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl bg-sand/85 backdrop-blur-sm" role="status" aria-live="assertive">
          <Loader2 className="h-10 w-10 animate-spin text-eucalyptus" aria-hidden />
          <p className="font-display text-xl font-semibold text-ink">Contacting Stripe (test mode)…</p>
          <p className="text-sm text-ink/60">Verifying card · applying promo · creating PaymentIntent</p>
        </div>
      )}

      {/* Card form — styled after Stripe Checkout */}
      <section aria-labelledby="card-heading" className="rounded-3xl border border-ink/10 bg-white p-7 card-shadow">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="card-heading" className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <CreditCard className="h-5 w-5 text-eucalyptus" aria-hidden /> Card details
          </h2>
          <span className="rounded-full bg-[#635BFF]/10 px-3 py-1 text-xs font-bold text-[#635BFF]">
            Stripe · TEST MODE
          </span>
        </div>

        <div className="space-y-4">
          <FieldShell label="Card number" htmlFor="cc-number" error={errors.number} required>
            <Input
              id="cc-number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              value={card.number}
              disabled={readOnly}
              aria-invalid={!!errors.number}
              onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })}
            />
          </FieldShell>
          <div className="grid grid-cols-2 gap-4">
            <FieldShell label="Expiry" htmlFor="cc-exp" error={errors.expiry} required>
              <Input
                id="cc-exp"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={card.expiry}
                disabled={readOnly}
                aria-invalid={!!errors.expiry}
                onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
              />
            </FieldShell>
            <FieldShell label="CVC" htmlFor="cc-cvc" error={errors.cvc} required>
              <Input
                id="cc-cvc"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                value={card.cvc}
                disabled={readOnly}
                aria-invalid={!!errors.cvc}
                onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              />
            </FieldShell>
          </div>
          <FieldShell label="Name on card" htmlFor="cc-name" error={errors.name} required>
            <Input
              id="cc-name"
              autoComplete="cc-name"
              placeholder="A NGUYEN"
              value={card.name}
              disabled={readOnly}
              aria-invalid={!!errors.name}
              onChange={(e) => setCard({ ...card, name: e.target.value })}
            />
          </FieldShell>

          {payError && (
            <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-danger">
              {payError}
            </p>
          )}

          <Button
            type="button"
            className="w-full"
            size="lg"
            loading={pending || phase === "processing"}
            disabled={readOnly}
            onClick={pay}
          >
            {isFree ? `Complete order · ${money(0)}` : `Pay ${money(total)} · ${plan.name}`}
          </Button>
          <p className="text-center text-xs text-ink/50">
            {isFree
              ? "Your code covers the full amount — Stripe is skipped, but an order and tax invoice are still created."
              : "Test cards: 4242 4242 4242 4242 (success) · 4000 0000 0000 0002 (decline)"}
          </p>
        </div>
      </section>

      {/* Order summary */}
      <aside aria-labelledby="summary-heading">
        <div className="rounded-3xl border border-ink/10 bg-paper p-7 card-shadow">
          <h2 id="summary-heading" className="font-display text-xl font-semibold text-ink">
            Order summary
          </h2>
          <p className="mt-1 text-xs text-ink/55">{matterRef}</p>

          <div className="mt-5 space-y-2" role="radiogroup" aria-label="Plan">
            {plans.map((p) => {
              const active = p.id === planId;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={readOnly || pending}
                  onClick={() => changePlan(p.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                    active ? "border-eucalyptus bg-eucalyptus/8" : "border-ink/10 hover:border-ink/25"
                  }`}
                >
                  <span className="text-sm font-semibold text-ink">{p.name}</span>
                  <span className="font-display text-lg font-semibold text-eucalyptus">{money(p.price)}</span>
                </button>
              );
            })}
          </div>

          {addOns.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fern">Add-ons</p>
              <div className="space-y-2">
                {addOns.map((a) => {
                  const on = selectedAddOns.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 text-sm",
                        on ? "border-eucalyptus bg-eucalyptus/8" : "border-ink/10",
                        readOnly && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={readOnly}
                        className="mt-0.5 h-4 w-4 accent-eucalyptus"
                        onChange={(e) => {
                          const next = e.target.checked ? [...selectedAddOns, a.id] : selectedAddOns.filter((x) => x !== a.id);
                          setSelectedAddOns(next);
                          setPromo(null);
                          start(async () => {
                            await updateAddOnsAction(matterId, next);
                          });
                        }}
                      />
                      <span className="flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink">{a.name}</span>
                          <span className="font-semibold text-eucalyptus">{money(a.price)}</span>
                        </span>
                        <span className="block text-xs text-ink/55">{a.blurb}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5">
            <label htmlFor="promo" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-fern">
              Promo or referral code
            </label>
            <div className="flex gap-2">
              <Input
                id="promo"
                value={promoInput}
                disabled={readOnly}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="WELCOME20"
                className="font-mono uppercase"
              />
              <Button type="button" variant="outline" size="md" loading={pending} disabled={readOnly} onClick={applyPromo}>
                <Tag className="h-4 w-4" aria-hidden /> Apply
              </Button>
            </div>
            {promoError && (
              <p role="alert" className="mt-2 text-xs font-semibold text-danger">
                {promoError}
              </p>
            )}
            {promo && (
              <p role="status" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-eucalyptus">
                <BadgeCheck className="h-4 w-4" aria-hidden /> {promo.description}
              </p>
            )}
          </div>

          <dl className="mt-6 space-y-2 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink/60">{plan.name}</dt>
              <dd className="font-semibold">{money(plan.price)}</dd>
            </div>
            {addOns
              .filter((a) => selectedAddOns.includes(a.id))
              .map((a) => (
                <div key={a.id} className="flex justify-between">
                  <dt className="text-ink/60">+ {a.name}</dt>
                  <dd className="font-semibold">{money(a.price)}</dd>
                </div>
              ))}
            {addOnTotal > 0 && (
              <div className="flex justify-between border-t border-ink/8 pt-2 text-xs text-ink/50">
                <dt>Subtotal</dt>
                <dd>{money(subtotal)}</dd>
              </div>
            )}
            <AnimatePresence initial={false}>
              {promo && (
                <fm.div
                  key={promo.code}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex justify-between py-1">
                    <dt className="text-ink/60">Discount ({promo.code})</dt>
                    <dd className="font-semibold text-eucalyptus">−<AnimatedMoney value={promo.discount} /></dd>
                  </div>
                </fm.div>
              )}
            </AnimatePresence>
            <div className="flex justify-between border-t border-ink/10 pt-3 text-base">
              <dt className="font-bold">Total today (AUD)</dt>
              <dd className="font-display text-2xl font-semibold text-eucalyptus">
                <AnimatedMoney value={total} />
              </dd>
            </div>
            <div className="flex justify-between text-xs text-ink/50">
              <dt>GST included</dt>
              <dd>{money(total / 11)}</dd>
            </div>
          </dl>
        </div>

        {payment && (
          <div className="mt-4 rounded-3xl border border-eucalyptus/25 bg-eucalyptus/8 p-5 text-sm">
            <p className="font-bold text-eucalyptus">Payment recorded (test mode)</p>
            <p className="mt-1 text-ink/70">
              {payment.planName} · {money(payment.total)} · card {payment.last4} · {formatDateTime(payment.paidAt)}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
