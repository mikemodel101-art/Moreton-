"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteMyTestDataAction } from "@/lib/actions/client";
import { Button } from "@/components/ui";
import { AnimatedCheck, useToast } from "@/components/design-system";

export function DeleteTestData({ count }: { count: number }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  if (done) {
    return (
      <p className="flex items-center gap-2.5 text-sm font-semibold text-eucalyptus" role="status">
        <AnimatedCheck size={28} /> Test data deleted. Start fresh from the dashboard.
      </p>
    );
  }

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)} disabled={count === 0}>
        <Trash2 className="h-4 w-4" aria-hidden /> {count === 0 ? "Nothing to delete" : `Delete my ${count} test matter${count === 1 ? "" : "s"}`}
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-clay/40 bg-white p-4">
      <p className="text-sm font-semibold text-ink">Permanently delete everything on your demo account?</p>
      <p className="mt-1 text-xs text-ink/60">Matters, answers, messages and email previews. This cannot be undone.</p>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button
          variant="danger"
          size="sm"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await deleteMyTestDataAction();
              if (r.ok) {
                setDone(true);
                toast.push({ title: "Test data deleted", body: "Your demo account is clean.", tone: "success" });
                router.refresh();
              } else setError(r.error);
            })
          }
        >
          Yes, delete it all
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
