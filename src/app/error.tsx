"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LifeBuoy, RefreshCw, TriangleAlert } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Prototype error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="max-w-lg text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-clay/10 text-clay" aria-hidden>
          <TriangleAlert className="h-8 w-8" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold text-ink">Something went sideways</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/65">
          A prototype hiccup, not your fault. Your answers are autosaved — nothing has been lost. Try again,
          and if it keeps happening, tell whoever is running the session.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-ink/40">Reference: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-eucalyptus px-6 py-3 text-sm font-bold text-paper hover:bg-moss"
          >
            <RefreshCw className="h-4 w-4" aria-hidden /> Try again
          </button>
          <Link href="/app" className="rounded-full border-2 border-eucalyptus px-6 py-3 text-sm font-bold text-eucalyptus hover:bg-eucalyptus hover:text-paper">
            Back to my dashboard
          </Link>
          <Link href="/book-a-call" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-ink/60 hover:text-eucalyptus">
            <LifeBuoy className="h-4 w-4" aria-hidden /> Talk to a human
          </Link>
        </div>
      </div>
    </div>
  );
}
