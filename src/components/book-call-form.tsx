"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarCheck, Send } from "lucide-react";
import { bookConsultationAction } from "@/lib/actions/client";
import { Button, Card, FieldShell, Input, Select, Textarea } from "@/components/ui";
import { AnimatedCheck } from "@/components/design-system";

const TIMES = ["Any time", "Weekday mornings", "Weekday afternoons", "Early evening", "Saturday morning"];

export function BookCallForm({
  matterId,
  defaultName,
  defaultEmail,
  defaultReason,
}: {
  matterId: string | null;
  defaultName: string;
  defaultEmail: string;
  defaultReason: string;
}) {
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    phone: "",
    reason: defaultReason,
    preferredTime: TIMES[0],
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <Card className="flex flex-col items-center p-10 text-center">
        <AnimatedCheck size={56} />
        <h2 className="mt-5 font-display text-2xl font-semibold text-ink">We&rsquo;ve got it</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/65">
          A solicitor will call you {form.preferredTime.toLowerCase()}. A confirmation has been rendered in
          your email preview inbox — no real email was sent.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/mail" className="rounded-full bg-eucalyptus px-5 py-2.5 text-sm font-bold text-paper hover:bg-moss">
            See the confirmation email
          </Link>
          <Link href="/will" className="rounded-full border-2 border-eucalyptus px-5 py-2.5 text-sm font-bold text-eucalyptus hover:bg-eucalyptus hover:text-paper">
            Back to my will
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-7">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
        <CalendarCheck className="h-5 w-5 text-eucalyptus" aria-hidden /> Book a call
      </h2>
      <p className="mt-1 text-sm text-ink/60">No cost, no obligation. Takes about 20 minutes.</p>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await bookConsultationAction({ ...form, matterId });
            if (r.ok) setDone(true);
            else setError(r.error);
          });
        }}
      >
        <FieldShell label="Your name" htmlFor="lead-name" required>
          <Input id="lead-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
        </FieldShell>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell label="Email" htmlFor="lead-email" required>
            <Input id="lead-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          </FieldShell>
          <FieldShell label="Phone" htmlFor="lead-phone" required>
            <Input id="lead-phone" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="04XX XXX XXX" autoComplete="tel" />
          </FieldShell>
        </div>
        <FieldShell label="Best time to reach you" htmlFor="lead-time">
          <Select id="lead-time" value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}>
            {TIMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </FieldShell>
        <FieldShell label="Anything you'd like us to know? (optional)" htmlFor="lead-reason">
          <Textarea id="lead-reason" value={form.reason} maxLength={600} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </FieldShell>
        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          <Send className="h-4 w-4" aria-hidden /> Request a call
        </Button>
      </form>
    </Card>
  );
}
