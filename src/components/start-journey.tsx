"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createMatterAction } from "@/lib/actions/client";
import { Button, cn } from "@/components/ui";
import { money } from "@/lib/engine";

interface PlanLite {
  id: string;
  name: string;
  price: number;
  popular: boolean;
}

export function StartJourney({
  plans,
  defaultPlanId,
  resumeMatterId,
}: {
  plans: PlanLite[];
  defaultPlanId: string;
  resumeMatterId: string | null;
}) {
  const [plan, setPlan] = useState(defaultPlanId);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (resumeMatterId) {
    return (
      <Button size="lg" onClick={() => router.push("/will")}>
        Resume your will <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    );
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Choose your plan">
        {plans.map((p) => {
          const active = plan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPlan(p.id)}
              className={cn(
                "rounded-2xl border-2 p-4 text-left transition-all",
                active ? "border-eucalyptus bg-paper ring-2 ring-eucalyptus/20" : "border-ink/10 bg-paper/70 hover:border-ink/25"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display font-semibold text-ink">{p.name}</span>
                {p.popular && <span className="rounded-full bg-eucalyptus px-2 py-0.5 text-[10px] font-bold uppercase text-paper">Popular</span>}
              </span>
              <span className="mt-1 block font-display text-2xl font-semibold text-eucalyptus">{money(p.price)}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <Button
        size="lg"
        className="mt-4"
        loading={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await createMatterAction(plan);
            if (r.ok && r.data) router.push("/will");
            else if (!r.ok) setError(r.error);
          });
        }}
      >
        Begin my will <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
      <p className="mt-3 text-xs text-ink/55">Creates a dummy matter in this session — nothing real is filed.</p>
    </div>
  );
}
