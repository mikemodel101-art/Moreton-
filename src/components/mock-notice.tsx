"use client";

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";

export function MockNotice() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper p-5 text-sm text-ink/70 card-shadow">
      <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-clay" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold text-ink">This is a clearly-labelled mock screen (Section 12)</p>
        <p className="mt-1">
          Transactional buttons are intentionally decorative here. Everything else in the prototype —
          questionnaire, checkout, review, exports, admin — is fully functional on dummy data.
        </p>
      </div>
      <button type="button" aria-label="Dismiss" onClick={() => setHidden(true)} className="rounded-md p-1 hover:bg-black/5">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
