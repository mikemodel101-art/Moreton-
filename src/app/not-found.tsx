import Link from "next/link";
import { Compass } from "lucide-react";
import { SiteHeader } from "@/components/chrome";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-eucalyptus/10 text-eucalyptus">
          <Compass className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold text-ink">This page wandered off</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          The link you followed doesn&rsquo;t exist (or that matter belongs to someone else). Everything in
          this prototype is reachable from the dashboard.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/" className="rounded-full bg-eucalyptus px-6 py-3 text-sm font-bold text-paper hover:bg-moss">
            Back to home
          </Link>
          <Link href="/login" className="rounded-full border-2 border-eucalyptus px-6 py-3 text-sm font-bold text-eucalyptus hover:bg-eucalyptus hover:text-paper">
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
