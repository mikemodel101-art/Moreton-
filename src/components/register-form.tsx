"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, UserPlus } from "lucide-react";
import { registerAction } from "@/lib/actions/auth";
import { Button, FieldShell, Input } from "@/components/ui";

export function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await registerAction(form);
      if (r.ok && r.data) {
        router.push(r.data.redirectTo);
        router.refresh();
      } else if (!r.ok) setError(r.error);
    });
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-ink/10 bg-paper p-7 card-shadow">
      <div className="space-y-4">
        <FieldShell label="Full legal name" htmlFor="reg-name" required>
          <Input id="reg-name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Mary Citizen" />
        </FieldShell>
        <FieldShell label="Email" htmlFor="reg-email" required>
          <Input id="reg-email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        </FieldShell>
        <FieldShell label="Password" htmlFor="reg-pass" required help="At least 8 characters. In the real product, this would be hashed — here it is dummy-only.">
          <Input id="reg-pass" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        </FieldShell>
        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          <UserPlus className="h-4 w-4" aria-hidden /> Create account &amp; begin
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
