"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CreditCard, RotateCcw } from "lucide-react";
import { resubmitMatterAction, submitForPaymentAction } from "@/lib/actions/client";
import { Button } from "@/components/ui";
import type { MatterStatus } from "@/lib/types";

export function SubmitReview({
  matterId,
  status,
  issueCount,
  readOnly,
}: {
  matterId: string;
  status: MatterStatus;
  issueCount: number;
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (readOnly) return null;

  if (status === "changes_requested") {
    return (
      <div className="mt-8 rounded-3xl border border-ink/10 bg-paper p-7 card-shadow">
        <h2 className="font-display text-xl font-semibold text-ink">Resubmit to your lawyer</h2>
        <p className="mt-1 text-sm text-ink/60">
          Once resubmitted, your answers lock again and go straight back to the top of the review queue.
        </p>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <Button
          className="mt-4"
          size="lg"
          loading={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await resubmitMatterAction(matterId);
              if (r.ok) {
                router.push(`/app/status/${matterId}`);
                router.refresh();
              } else {
                setError(r.error + (r.data?.errors ? " Fix the highlighted items above." : ""));
              }
            });
          }}
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Resubmit answers
        </Button>
      </div>
    );
  }

  if (status !== "draft") return null;

  return (
    <div className="mt-8 rounded-3xl border border-eucalyptus/20 bg-eucalyptus p-7 text-paper card-shadow">
      <h2 className="font-display text-xl font-semibold">Looks right? Lock it in</h2>
      <p className="mt-1 max-w-lg text-sm text-paper/75">
        Next step is secure payment (Stripe test mode). After payment your answers lock and go to a
        Queensland lawyer for review.
      </p>
      {issueCount > 0 && (
        <p className="mt-3 rounded-xl bg-danger/25 px-3.5 py-2.5 text-sm font-semibold">
          {issueCount} answer{issueCount > 1 ? "s" : ""} still need attention — fix them above first.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-danger/25 px-3.5 py-2.5 text-sm font-semibold">
          {error}
        </p>
      )}
      <Button
        variant="gold"
        size="lg"
        className="mt-5"
        loading={pending}
        disabled={issueCount > 0}
        onClick={() => {
          setError(null);
            start(async () => {
              const r = await submitForPaymentAction(matterId);
              if (r.ok) {
                router.push(`/checkout?m=${matterId}`);
                router.refresh();
              } else if (r.error === "BLOCKED") {
                router.push(`/book-a-call?m=${matterId}`);
              } else {
                setError(r.error);
              }
            });
        }}
      >
        <CreditCard className="h-4 w-4" aria-hidden /> Proceed to secure payment
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
