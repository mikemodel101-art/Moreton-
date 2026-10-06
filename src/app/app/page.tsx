import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Inbox, Mail, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/store";
import { getSections } from "@/lib/config";
import { sectionCompletion } from "@/lib/validation";
import { STATUS_NEXT_ACTION } from "@/lib/format";
import { money, formatDate } from "@/lib/engine";
import { Avatar, Badge, Card, EmptyState, ProgressBar, StatusPill } from "@/components/ui";
import { StartWillCards } from "@/components/start-will";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/app");

  if (user.role === "lawyer" || user.role === "senior_lawyer") redirect("/lawyer");
  if (user.role === "admin") redirect("/admin");

  const isObserver = user.role === "observer";
  const sections = getSections();
  const matters = db().matters
    .filter((m) => (isObserver ? true : m.clientId === user.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const myMail = db().mail.filter((m) => (isObserver ? true : m.toEmail === user.email)).slice(0, 3);
  const plans = db().plans;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">
            {isObserver ? "Observer view — all seeded clients" : "Your portal"}
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">
            {isObserver ? "Client dashboards" : `Hello, ${user.name.split(" ")[0]}`}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink/60">
            {isObserver
              ? "You're browsing read-only. Use the persona switcher to act as any client."
              : "Everything about your will lives here — questionnaire, payment, review progress and your final document."}
          </p>
        </div>
        <Badge tone="green" className="self-start">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Lawyer reviewed service
        </Badge>
      </div>

      {/* Matters */}
      <section aria-labelledby="matters-heading">
        <h2 id="matters-heading" className="font-display text-2xl font-semibold text-ink">
          {isObserver ? "All seeded wills" : "Your wills"}
        </h2>
        {matters.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<FileText className="h-6 w-6" aria-hidden />}
              title="No wills yet"
              body="Start your first will below — it takes about 20 minutes, autosaves as you go."
            />
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {matters.map((m) => {
              const client = db().users.find((u) => u.id === m.clientId);
              const pct = m.status === "draft" ? sectionCompletion(sections, m.answers) : 100;
              const next = STATUS_NEXT_ACTION[m.status];
              return (
                <li key={m.id}>
                  <Card className="h-full p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {client && <Avatar name={client.name} color={client.color} />}
                        <div>
                          <p className="font-semibold text-ink">{client?.name ?? "Unknown client"}</p>
                          <p className="text-xs text-ink/55">
                            {m.ref} · {db().plans.find((p) => p.id === m.planId)?.name} · started{" "}
                            {formatDate(m.createdAt)}
                          </p>
                        </div>
                      </div>
                      <StatusPill status={m.status} />
                    </div>
                    {m.status === "draft" && (
                      <ProgressBar value={pct} className="mt-4" label="Questionnaire" />
                    )}
                    {m.flags.length > 0 && m.status !== "issued" && (
                      <p className="mt-3 text-xs text-ink/55">
                        {m.flags.length} triage flag{m.flags.length > 1 ? "s" : ""} under review — your lawyer is
                        checking the details.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={next.href(m.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-eucalyptus px-4 py-2 text-xs font-bold text-paper hover:bg-moss"
                      >
                        {next.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                      <Link
                        href={`/app/status/${m.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-ink/70 hover:bg-sand"
                      >
                        Status
                      </Link>
                      <Link
                        href={`/app/messages/${m.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-xs font-bold text-ink/70 hover:bg-sand"
                      >
                        Messages
                      </Link>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!isObserver && (
        <section aria-labelledby="new-will-heading">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" aria-hidden />
            <h2 id="new-will-heading" className="font-display text-2xl font-semibold text-ink">
              Start a new will
            </h2>
          </div>
          <StartWillCards plans={plans.map((p) => ({ id: p.id, name: p.name, price: p.price, blurb: p.blurb, popular: p.popular }))} />
        </section>
      )}

      {/* Mailbox teaser */}
      <section aria-labelledby="mail-heading">
        <div className="flex items-center justify-between">
          <h2 id="mail-heading" className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
            <Inbox className="h-5 w-5 text-eucalyptus" aria-hidden /> Latest email previews
          </h2>
          <Link href="/mail" className="text-sm font-semibold text-eucalyptus hover:underline">
            Open mailbox
          </Link>
        </div>
        {myMail.length === 0 ? (
          <Card className="mt-4 p-6 text-sm text-ink/60">
            Nothing yet — welcome emails, receipts and status updates appear here instead of your real
            inbox.
          </Card>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {myMail.map((m) => (
              <li key={m.id}>
                <Link
                  href="/mail"
                  className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-paper px-4 py-3 card-shadow transition-transform hover:-translate-y-0.5"
                >
                  <Mail className="h-4 w-4 shrink-0 text-fern" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{m.subject}</span>
                    <span className="block truncate text-xs text-ink/55">
                      To {m.toName} · {formatDate(m.createdAt)}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-ink/30" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mock tools */}
      <section aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="font-display text-2xl font-semibold text-ink">
          Coming with your plan — concept previews
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { href: "/extras/storage", title: "Document Vault", body: "Store your signed will and certificates with bank-grade security." },
            { href: "/extras/reminders", title: "Review Reminders", body: "We nudge you to review your will after big life events." },
            { href: "/extras/executor-contact", title: "Executor Contact", body: "Tell the people you've chosen, gently and completely." },
          ].map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group rounded-2xl border border-ink/10 bg-paper p-5 card-shadow transition-transform hover:-translate-y-1"
            >
              <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7A5C14]">
                Mock concept
              </span>
              <p className="mt-3 font-semibold text-ink group-hover:text-eucalyptus">{t.title}</p>
              <p className="mt-1 text-sm text-ink/60">{t.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
