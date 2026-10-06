"use client";

import { useState, useTransition } from "react";
import { Tag } from "lucide-react";
import { checkPromoAction } from "@/lib/actions/client";
import { Button, Input, Select } from "@/components/ui";
import { money } from "@/lib/engine";

export function PromoTester({ plans }: { plans: { id: string; name: string; price: number }[] }) {
  const [code, setCode] = useState("WELCOME20");
  const [planId, setPlanId] = useState(plans[1]?.id ?? plans[0]?.id ?? "");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const plan = plans.find((p) => p.id === planId);

  function apply() {
    start(async () => {
      const r = await checkPromoAction(code, planId);
      if (r.ok && r.data) {
        setResult({
          ok: true,
          text: `${r.data.description} — new total ${money(r.data.total)} (saving ${money(r.data.discount)})`,
        });
      } else if (!r.ok) {
        setResult({ ok: false, text: r.error });
      }
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="promo-plan" className="sr-only">
            Plan
          </label>
          <Select id="promo-plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {money(p.price)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <label htmlFor="promo-code" className="sr-only">
            Promo code
          </label>
          <Input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            className="font-mono uppercase"
          />
        </div>
        <Button type="button" onClick={apply} loading={pending} variant="gold">
          <Tag className="h-4 w-4" aria-hidden /> Apply
        </Button>
      </div>
      {plan && !result && (
        <p className="mt-3 text-sm text-ink/60">
          Base price: <strong className="text-ink">{money(plan.price)}</strong>
        </p>
      )}
      {result && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
            result.ok ? "bg-eucalyptus/10 text-eucalyptus" : "bg-danger/10 text-danger"
          }`}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
