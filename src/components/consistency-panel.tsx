"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ScanSearch } from "lucide-react";
import type { Inconsistency } from "@/lib/engine";
import { Card } from "@/components/ui";

export function ConsistencyPanel({
  issues,
  matterId,
}: {
  issues: Inconsistency[];
  matterId: string;
}) {
  if (issues.length === 0) {
    return (
      <Card className="mt-6 flex items-center gap-3 border-eucalyptus/25 bg-eucalyptus/5 p-5">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-eucalyptus" aria-hidden />
        <p className="text-sm text-ink/75">
          <strong className="text-eucalyptus">Consistency check passed.</strong> Nothing in your answers
          contradicts anything else.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-clay/30 bg-clay/5 p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <ScanSearch className="h-5 w-5 text-clay" aria-hidden />
        {issues.length} {issues.length === 1 ? "answer doesn't" : "answers don't"} quite line up
      </h2>
      <p className="mt-1 text-sm text-ink/65">
        Nothing serious — these are usually leftovers from changing your mind. Each one jumps straight to
        the question.
      </p>
      <ul className="mt-4 space-y-2">
        {issues.map((i) => (
          <li key={i.id}>
            <Link
              href={`/will/${i.step}/${i.questionId}?m=${matterId}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-paper px-4 py-3 transition-colors hover:border-clay/40"
            >
              <span className="text-sm text-ink/80">{i.message}</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-clay">
                Fix this <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
