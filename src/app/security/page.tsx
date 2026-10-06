import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { SiteHeader } from "@/components/chrome";
import { MfaPanel } from "@/components/mfa-panel";
import { Card } from "@/components/ui";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/security");
  const staff = ["lawyer", "senior_lawyer", "admin"].includes(user.role);

  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">Your account</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Security</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/65">
          Signed in as <strong>{user.name}</strong> ({user.role.replace("_", " ")}).
        </p>

        <Card className="mt-8 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-eucalyptus" aria-hidden /> Session policy
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li>· Signed out automatically after 30 minutes of inactivity, with a two-minute warning.</li>
            <li>· &ldquo;Remember this device&rdquo; extends the idle window to 12 hours on this browser.</li>
            <li>· Passwords require at least 8 characters (prototype accounts all use <code className="rounded bg-sand px-1 font-mono text-xs">demo1234</code>).</li>
            <li>· Repeated failed sign-ins are rate-limited for 60 seconds.</li>
          </ul>
        </Card>

        {staff ? (
          <div className="mt-6">
            <MfaPanel userName={user.name} role={user.role} />
          </div>
        ) : (
          <Card className="mt-6 p-6 text-sm text-ink/65">
            Two-factor authentication is required for lawyer and admin accounts. Client accounts use email
            magic links instead — switch persona to a lawyer to see the MFA screen.
          </Card>
        )}
      </main>
    </div>
  );
}
