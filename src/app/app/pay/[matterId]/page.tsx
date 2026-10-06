import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { canSeeMatter, getMatter } from "@/lib/store";
import { db } from "@/lib/store";
import { PRICING } from "@/lib/config";
import { Checkout } from "@/components/checkout";

export const metadata: Metadata = { title: "Secure payment" };

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ matterId: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { matterId } = await params;
  const sp = await searchParams;
  const matter = getMatter(matterId);
  if (!matter || !canSeeMatter(user, matter)) notFound();

  const payable = matter.status === "awaiting_payment";
  const alreadyPaid = matter.status !== "draft" && matter.status !== "awaiting_payment";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-clay">Step 2 of 3 · Payment</p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink">Secure checkout</h1>
      </div>

      {!payable && !alreadyPaid && (
        <div className="mt-6 rounded-2xl border border-gold/40 bg-[#FFF7E0] px-5 py-4 text-sm">
          Finish and submit your questionnaire first — then payment unlocks.{" "}
          <Link href={`/app/wizard/${matter.id}`} className="font-semibold text-eucalyptus underline">
            Continue questionnaire
          </Link>
        </div>
      )}

      {alreadyPaid && sp.done !== "1" && (
        <div className="mt-6 rounded-2xl border border-eucalyptus/25 bg-eucalyptus/8 px-5 py-4 text-sm">
          This matter is already paid ({matter.payment && `${matter.payment.planName}`}).{" "}
          <Link href={`/app/status/${matter.id}`} className="font-semibold text-eucalyptus underline">
            Track review progress
          </Link>
        </div>
      )}

      {(payable || sp.done === "1") && (
        <Checkout
          matterId={matter.id}
          matterRef={matter.ref}
          plans={db().plans.map((p) => ({ id: p.id, name: p.name, price: p.price, features: p.features }))}
          addOns={PRICING.addOns.map((a) => ({ id: a.id, name: a.name, price: a.price, blurb: a.blurb }))}
          initialAddOns={Array.isArray(matter.answers._addOns) ? (matter.answers._addOns as string[]) : []}
          currentPlanId={matter.planId}
          successMode={sp.done === "1"}
          payment={matter.payment}
          readOnly={user.role === "observer"}
        />
      )}

      <p className="mt-6 flex items-center gap-2 text-xs text-ink/50">
        <Lock className="h-3.5 w-3.5" aria-hidden /> Stripe test mode — no real charge. Success card:
        4242 4242 4242 4242 · Decline card: 4000 0000 0000 0002.
      </p>
    </div>
  );
}
