import Link from "next/link";
import { KeyRound, ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser, homeForRole } from "@/lib/auth";
import { SiteHeader } from "@/components/chrome";

export const metadata: Metadata = { title: "Not your door" };

const ROLE_COPY: Record<string, string> = {
  client: "You're signed in as a client, so you can see your own will and nothing else — which is rather the point.",
  lawyer: "Lawyers see matters assigned to them, plus anything unassigned in the queue.",
  senior_lawyer: "You can see every matter, but system configuration belongs to the Admin.",
  admin: "Admin manages the platform — users, pricing, codes and content — but can't approve wills.",
  observer: "You're the read-only Demo Observer: everything is visible, nothing is editable.",
};

export default async function ForbiddenPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const home = user ? homeForRole(user) : "/login";

  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-clay/10 text-clay" aria-hidden>
          <ShieldOff className="h-8 w-8" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold text-ink">That area isn&rsquo;t yours</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/65">
          {user ? ROLE_COPY[user.role] : "You'll need to sign in to go there."}
          {sp.from && (
            <>
              {" "}
              <span className="text-ink/45">(blocked: {sp.from})</span>
            </>
          )}
        </p>
        <p className="mt-4 rounded-2xl bg-paper px-5 py-4 text-xs leading-relaxed text-ink/60 card-shadow">
          Role boundaries are enforced on the server, not just hidden in the interface — try the persona
          switcher at the bottom-left to explore another role.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={home} className="rounded-full bg-eucalyptus px-6 py-3 text-sm font-bold text-paper hover:bg-moss">
            Back to my dashboard
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full border-2 border-eucalyptus px-6 py-3 text-sm font-bold text-eucalyptus hover:bg-eucalyptus hover:text-paper">
            <KeyRound className="h-4 w-4" aria-hidden /> Switch account
          </Link>
        </div>
      </main>
    </div>
  );
}
