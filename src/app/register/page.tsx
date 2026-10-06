import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/chrome";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-14 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">Create your account</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Start your will</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          One account holds every draft, message and document. Dummy data only — this registers you in this
          browser session.
        </p>
        <div className="mt-8">
          <RegisterForm />
        </div>
        <p className="mt-6 text-center text-sm text-ink/60">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-eucalyptus underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
