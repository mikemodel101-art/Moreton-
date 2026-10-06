"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound, LogIn, MailCheck, Wand2 } from "lucide-react";
import { loginAction, sendMagicLinkAction, switchPersonaAction } from "@/lib/actions/auth";
import { Avatar, Button, Input, FieldShell } from "@/components/ui";
import type { Role } from "@/lib/types";

interface Persona {
  id: string;
  name: string;
  email: string;
  role: Role;
  color: string;
}

const ROLE_LABEL: Record<Role, string> = {
  client: "Client",
  lawyer: "Lawyer",
  senior_lawyer: "Senior Lawyer",
  admin: "Admin",
  observer: "Observer",
};

export function LoginForm({ personas }: { personas: Persona[] }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const params = useSearchParams();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await loginAction({ email, password });
      if (r.ok && r.data) {
        const next = params.get("next");
        router.push(next && next !== "/login" ? next : r.data.redirectTo);
        router.refresh();
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  function quick(id: string) {
    setError(null);
    start(async () => {
      const r = await switchPersonaAction(id);
      if (r.ok && r.data) {
        router.push(r.data.redirectTo);
        router.refresh();
      } else if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="rounded-3xl border border-ink/10 bg-paper p-7 card-shadow"
        aria-labelledby="login-heading"
      >
        <h2 id="login-heading" className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
          <KeyRound className="h-5 w-5 text-eucalyptus" aria-hidden /> Email &amp; password
        </h2>
        <div className="mt-5 space-y-4">
          <FieldShell label="Email address" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={!!error}
            />
          </FieldShell>
          <FieldShell label="Password" htmlFor="password" required help="All demo accounts use demo1234">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="demo1234"
              aria-invalid={!!error}
            />
          </FieldShell>
          {error && (
            <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" loading={pending}>
            <LogIn className="h-4 w-4" aria-hidden /> Sign in
          </Button>
        </div>
      </form>

      <div className="rounded-3xl border border-ink/10 bg-paper p-7 card-shadow">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Wand2 className="h-5 w-5 text-eucalyptus" aria-hidden /> Or sign in with a magic link
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          No password — the link renders as an in-app email preview.
        </p>
        {magicSent ? (
          <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-eucalyptus/10 px-3.5 py-3 text-sm font-semibold text-eucalyptus">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            Magic link ready — open the <a href="/mail" className="underline underline-offset-2">email preview inbox</a> and click “Sign in”.
          </p>
        ) : (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const r = await sendMagicLinkAction(email);
                if (r.ok) setMagicSent(true);
                else if (!r.ok) setError(r.error);
              });
            }}
          >
            <label htmlFor="magic-email" className="sr-only">Email for magic link</label>
            <Input id="magic-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <Button type="submit" variant="outline" loading={pending}>
              Send link
            </Button>
          </form>
        )}
      </div>

      <div className="rounded-3xl border border-ink/10 bg-paper p-7 card-shadow">
        <h2 className="font-display text-xl font-semibold text-ink">Quick demo sign-in</h2>
        <p className="mt-1 text-sm text-ink/60">One click per seeded persona.</p>
        <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {personas.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => quick(p.id)}
                disabled={pending}
                className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sand disabled:opacity-60"
              >
                <Avatar name={p.name} color={p.color} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                  <span className="block text-[11px] text-ink/55">{ROLE_LABEL[p.role]}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-ink/30 transition-transform group-hover:translate-x-0.5 group-hover:text-eucalyptus" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
