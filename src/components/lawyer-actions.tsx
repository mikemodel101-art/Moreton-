"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Hand, UserCheck } from "lucide-react";
import { assignToMeAction, reassignMatterAction } from "@/lib/actions/lawyer";

export function TakeMatterButton({ matterId }: { matterId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await assignToMeAction(matterId);
            if (!r.ok) setError(r.error);
            router.refresh();
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-gold px-4 py-2 text-xs font-bold text-[#7A5C14] hover:bg-gold/15 disabled:opacity-50"
      >
        <Hand className="h-3.5 w-3.5" aria-hidden /> {pending ? "Assigning…" : "Take this matter"}
      </button>
      {error && <span className="mt-1 text-[11px] text-danger">{error}</span>}
    </span>
  );
}

export function ReassignSelect({
  matterId,
  lawyers,
  currentId,
}: {
  matterId: string;
  lawyers: { id: string; name: string }[];
  currentId: string | null;
}) {
  const [value, setValue] = useState(currentId ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-1">
      <label htmlFor={`reassign-${matterId}`} className="sr-only">
        Reassign matter
      </label>
      <select
        id={`reassign-${matterId}`}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return;
          setValue(v);
          start(async () => {
            const r = await reassignMatterAction(matterId, v);
            if (!r.ok) setValue(currentId ?? "");
            router.refresh();
          });
        }}
        className="rounded-full border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink/70"
      >
        <option value="" disabled>
          Reassign…
        </option>
        {lawyers.map((l) => (
          <option key={l.id} value={l.id} disabled={l.id === currentId}>
            {l.name}
          </option>
        ))}
      </select>
      {pending && <UserCheck className="h-3.5 w-3.5 animate-pulse text-eucalyptus" aria-hidden />}
    </span>
  );
}
