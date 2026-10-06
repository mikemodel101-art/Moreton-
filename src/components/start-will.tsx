"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createMatterAction } from "@/lib/actions/client";
import { money } from "@/lib/engine";

interface PlanLite {
  id: string;
  name: string;
  price: number;
  blurb: string;
  popular: boolean;
}

export function StartWillCards({ plans }: { plans: PlanLite[] }) {
  const [selected, setSelected] = useState(plans.find((p) => p.popular)?.id ?? plans[0]?.id);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function begin() {
    setError(null);
    start(async () => {
      const r = await createMatterAction(selected);
      if (r.ok && r.data) {
        router.push(`/app/wizard/${r.data.matterId}`);
        router.refresh();
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  return (
    <div className="mt-4">
      <div className="grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Choose a plan">
        {plans.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(p.id)}
              className={`rounded-2xl border-2 p-5 text-left transition-all ${
                active
                  ? "border-eucalyptus bg-paper ring-2 ring-eucalyptus/20"
                  : "border-ink/10 bg-paper/70 hover:border-ink/25"
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold text-ink">{p.name}</span>
                {p.popular && (
                  <span className="rounded-full bg-eucalyptus px-2 py-0.5 text-[10px] font-bold uppercase text-paper">
                    Popular
                  </span>
                )}
              </span>
              <span className="mt-1 block text-sm text-ink/60">{p.blurb}</span>
              <span className="mt-3 block font-display text-2xl font-semibold text-eucalyptus">
                {money(p.price)}
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={begin}
        disabled={pending}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-eucalyptus px-7 py-3.5 text-base font-bold text-paper hover:bg-moss disabled:opacity-60"
      >
        {pending ? "Creating your matter…" : "Start questionnaire"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
