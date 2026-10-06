"use client";

import { useMemo, useState } from "react";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { Badge, Button, Card, Input, cn } from "@/components/ui";
import { AnimatedCheck, useToast } from "@/components/design-system";

/** Deterministic dummy TOTP secret + code for the demo. */
function dummySecret(seed: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  let out = "";
  for (let i = 0; i < 16; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out += alphabet[h % 32];
  }
  return out.replace(/(.{4})/g, "$1 ").trim();
}

export function MfaPanel({ userName, role }: { userName: string; role: string }) {
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<"off" | "setup" | "verify">("off");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const secret = useMemo(() => dummySecret(userName), [userName]);
  const expected = useMemo(() => String((secret.replace(/\s/g, "").charCodeAt(0) * 7919) % 1000000).padStart(6, "0"), [secret]);

  if (enabled) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <AnimatedCheck size={44} />
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Two-factor authentication is on <Badge tone="green">Active</Badge>
            </h2>
            <p className="mt-1 text-sm text-ink/65">
              {role.replace("_", " ")} accounts are prompted for a code at each new sign-in. This is a mock
              TOTP screen — no authenticator app is really enrolled.
            </p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setEnabled(false); setStep("off"); setCode(""); }}>
              Turn off
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Smartphone className="h-5 w-5 text-eucalyptus" aria-hidden /> Two-factor authentication
        <Badge tone="gold">Mock screen</Badge>
      </h2>
      <p className="mt-1 text-sm text-ink/65">
        Required for lawyer and admin roles in the full product. Walk through the enrolment below.
      </p>

      {step === "off" && (
        <Button className="mt-4" onClick={() => setStep("setup")}>
          <KeyRound className="h-4 w-4" aria-hidden /> Set up authenticator
        </Button>
      )}

      {step !== "off" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-sand p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-fern">1 · Scan or enter this key</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="grid grid-cols-7 gap-0.5" aria-hidden>
                {Array.from({ length: 49 }).map((_, i) => {
                  const on = (secret.replace(/\s/g, "").charCodeAt(i % 16) + i) % 3 !== 0;
                  return <span key={i} className={cn("h-3.5 w-3.5 rounded-[2px]", on ? "bg-ink" : "bg-transparent")} />;
                })}
              </div>
              <div>
                <code className="block rounded-lg border-2 border-dashed border-eucalyptus/30 bg-white px-3 py-2 font-mono text-sm font-bold tracking-wider text-eucalyptus">
                  {secret}
                </code>
                <p className="mt-1.5 text-xs text-ink/50">Dummy secret — not a real TOTP enrolment.</p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="totp" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-fern">
              2 · Enter the 6-digit code
            </label>
            <div className="flex gap-2">
              <Input
                id="totp"
                inputMode="numeric"
                maxLength={6}
                value={code}
                placeholder={expected}
                className="max-w-[160px] text-center font-mono text-lg tracking-[0.3em]"
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
              />
              <Button
                onClick={() => {
                  if (code === expected) {
                    setEnabled(true);
                    toast.push({ title: "Two-factor enabled", body: "Mock TOTP enrolment complete.", tone: "success" });
                  } else {
                    setError(`Incorrect code. For this demo the code is ${expected}.`);
                  }
                }}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden /> Verify
              </Button>
            </div>
            {error && <p role="alert" className="mt-2 text-xs font-semibold text-danger">{error}</p>}
            <p className="mt-2 text-xs text-ink/50">Hint: the demo code is pre-filled as the placeholder.</p>
          </div>
        </div>
      )}
    </Card>
  );
}
