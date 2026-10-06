"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/components/ui";

export function CopyField({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-fern">{label}</p>
      <div className="flex items-center gap-2">
        <code
          className={cn(
            "flex-1 truncate rounded-xl border-2 border-dashed border-eucalyptus/30 bg-eucalyptus/5 px-4 py-3 font-mono text-eucalyptus",
            big ? "text-xl font-bold tracking-wider" : "text-sm"
          )}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
            } catch {
              /* clipboard unavailable in some sandboxes */
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-eucalyptus px-4 py-2.5 text-sm font-bold text-paper hover:bg-moss"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
