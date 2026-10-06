import { Info } from "lucide-react";
import { Card } from "@/components/ui";

export { Card };

export function ResetDemoNote() {
  return (
    <p className="flex items-start gap-1.5 text-xs text-ink/50">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      All data lives in memory for this demo session (no database). Resetting restores the full seed —
      handy between user-testing sessions.
    </p>
  );
}
