import { redirect } from "next/navigation";
import { MailOpen, ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/store";
import { formatDateTime } from "@/lib/engine";
import { Badge, Card } from "@/components/ui";
import Link from "next/link";

export const metadata: Metadata = { title: "Email previews" };

const KIND_LABEL: Record<string, { label: string; tone: "green" | "gold" | "red" | "sky" | "neutral" | "clay" }> = {
  welcome: { label: "Welcome", tone: "green" },
  receipt: { label: "Receipt", tone: "gold" },
  changes_requested: { label: "Changes", tone: "clay" },
  approved: { label: "Approved", tone: "green" },
  issued: { label: "Issued", tone: "green" },
  message: { label: "Message", tone: "sky" },
  internal_digest: { label: "Internal", tone: "neutral" },
  internal_new_matter: { label: "Internal", tone: "neutral" },
  internal_resubmitted: { label: "Internal", tone: "neutral" },
  internal_signoff: { label: "Internal", tone: "red" },
};

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string; to?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/mail");
  const sp = await searchParams;
  const staff = user.role !== "client";
  const showAll = staff && sp.all === "1";

  const items = db().mail.filter((m) => (showAll ? true : m.toEmail === user.email));

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-ink/10 bg-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">Prototype mailbox</p>
            <h1 className="mt-1 flex items-center gap-2.5 font-display text-3xl font-semibold text-ink">
              <MailOpen className="h-7 w-7 text-eucalyptus" aria-hidden /> Email previews
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/60">
              <ShieldOff className="h-4 w-4 text-clay" aria-hidden /> No real email is ever sent — every
              notification is rendered here.
            </p>
          </div>
          {staff && (
            <div className="flex rounded-full border border-ink/15 bg-sand p-1 text-sm font-semibold">
              <Link
                href="/mail"
                aria-current={!showAll ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 ${!showAll ? "bg-eucalyptus text-paper" : "text-ink/60"}`}
              >
                Sent to me
              </Link>
              <Link
                href="/mail?all=1"
                aria-current={showAll ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 ${showAll ? "bg-eucalyptus text-paper" : "text-ink/60"}`}
              >
                All dummy email
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-3 px-4 py-8 sm:px-6">
        {items.length === 0 && (
          <Card className="p-10 text-center text-sm text-ink/60">
            No emails addressed to {user.email} yet. Complete an action — like paying or messaging a
            lawyer — and the preview appears here.
          </Card>
        )}
        {items.map((m) => {
          const kind = KIND_LABEL[m.kind] ?? { label: m.kind, tone: "neutral" as const };
          return (
            <details key={m.id} className="group rounded-2xl border border-ink/10 bg-paper card-shadow open:ring-1 open:ring-eucalyptus/25">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <Badge tone={kind.tone}>{kind.label}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{m.subject}</p>
                  <p className="truncate text-xs text-ink/55">
                    To: {m.toName} &lt;{m.toEmail}&gt; · {formatDateTime(m.createdAt)}
                    {m.matterId ? ` · ${db().matters.find((x) => x.id === m.matterId)?.ref ?? m.matterId}` : ""}
                  </p>
                </div>
                <span className="text-xs font-semibold text-eucalyptus group-open:hidden">Preview</span>
                <span className="hidden text-xs font-semibold text-eucalyptus group-open:inline">Collapse</span>
              </summary>
              <div className="border-t border-ink/10 bg-sand px-5 py-4">
                <iframe
                  title={`Email preview: ${m.subject}`}
                  sandbox=""
                  srcDoc={m.html}
                  className="h-[420px] w-full rounded-xl border border-ink/10 bg-white"
                />
              </div>
            </details>
          );
        })}
      </main>
    </div>
  );
}
