"use client";

import { useEffect, useState } from "react";
import { FlaskConical, X } from "lucide-react";

const KEY = "mgw-proto-banner-dismissed";

export function PrototypeBanner() {
  const [dismissed, setDismissed] = useState<boolean>(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(KEY) === "1");
  }, []);

  if (dismissed) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 border-b border-gold/40 bg-[#FFF7E0] text-ink no-print"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 text-sm">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-clay" aria-hidden />
        <div className="flex-1">
          <p className="font-semibold">
            Prototype — dummy data only. Not legal advice.{" "}
            <span className="font-normal text-ink/70">
              Stripe runs in test mode and no real emails are sent.
            </span>
          </p>
          {expanded && (
            <p className="mt-1 text-ink/80">
              Every person, matter, payment and email here is fictional. Questionnaire, checkout, lawyer
              review, exports and admin tools are fully functional against seeded data. Use the persona
              switcher (bottom-left) to explore each role. Passwords for all demo accounts:{" "}
              <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-xs">demo1234</code>.
            </p>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 text-xs font-semibold text-eucalyptus underline underline-offset-2"
          >
            {expanded ? "Less about this prototype" : "More about this prototype"}
          </button>
        </div>
        <button
          type="button"
          aria-label="Dismiss prototype notice"
          className="rounded-md p-1 hover:bg-black/5"
          onClick={() => {
            window.localStorage.setItem(KEY, "1");
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
