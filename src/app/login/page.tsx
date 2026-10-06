import { SiteHeader } from "@/components/chrome";
import { LoginForm } from "@/components/login-form";
import { db } from "@/lib/store";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const personas = db().users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    color: u.color,
  }));
  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">Welcome back</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Sign in to your will portal
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink/65">
            This prototype seeds one account per role. Use the quick sign-in list, or type any
            persona&rsquo;s email with the shared password{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm font-semibold text-eucalyptus">
              demo1234
            </code>
            .
          </p>
          <div className="mt-8 rounded-2xl border border-gold/40 bg-[#FFF7E0] p-5 text-sm text-ink/80">
            <p className="font-semibold text-ink">Prototype safety</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Dummy data only — no real people, payments or documents</li>
              <li>Stripe test mode: card 4242 4242 4242 4242</li>
              <li>Emails render as in-app previews at /mail</li>
            </ul>
          </div>
        </div>
        <LoginForm personas={personas} />
      </main>
    </div>
  );
}
