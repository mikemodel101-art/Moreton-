import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Clock3,
  Layers,
  RotateCw,
  SkipForward,
} from "lucide-react";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getActiveMatter } from "@/lib/store";
import { getSections } from "@/lib/config";
import { sectionVisible } from "@/lib/validation";
import { firstUnansweredPath, stepInfo, STEP_ICONS, type StepStatus } from "@/lib/steps";
import { sectionCompletion } from "@/lib/validation";
import { StatusPill, cn } from "@/components/ui";
import { CountUp } from "@/components/design-system";
import { computeReadiness, estateSnapshot, smartNudges } from "@/lib/readiness";
import { EstateSnapshot, ReadinessRing, SmartNudges, GlossaryButton } from "@/components/extras";

export const metadata: Metadata = { title: "Your will — 7 steps" };

const STATUS_META: Record<StepStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  complete: { label: "Complete", cls: "bg-eucalyptus/10 text-eucalyptus", icon: CheckCircle2 },
  in_progress: { label: "In progress", cls: "bg-gold/15 text-[#7A5C14]", icon: RotateCw },
  not_started: { label: "Not started", cls: "bg-ink/8 text-ink/55", icon: CircleDashed },
  needs_attention: { label: "Needs attention", cls: "bg-clay/10 text-clay", icon: CircleAlert },
  skipped: { label: "Skipped", cls: "bg-ink/8 text-ink/55", icon: SkipForward },
  not_needed: { label: "Not needed for you", cls: "bg-ink/6 text-ink/40", icon: Layers },
};

export default async function WillDashboard({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/will");
  const sp = await searchParams;
  const matter = getActiveMatter(user, sp.m);
  if (!matter) redirect("/start");

  const sections = getSections();
  const pct = sectionCompletion(sections, matter.answers);
  const visible = sections.filter((s) => sectionVisible(s, matter.answers));
  const resume = firstUnansweredPath(sections, matter.answers);
  const infos = sections.map((s) => ({ section: s, info: stepInfo(s, matter.answers, matter.flags) }));
  const readiness = computeReadiness(sections, matter.answers);
  const snapshot = estateSnapshot(matter.answers);
  const nudges = smartNudges(matter.answers);
  const completedCount = infos.filter((i) => i.info.status === "complete" || i.info.status === "skipped").length;

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-ink/10 bg-eucalyptus text-paper">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href="/app" className="text-xs font-semibold text-paper/60 hover:text-paper">← Portal</Link>
              <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">Your will, in 7 steps</h1>
              <p className="mt-1 text-sm text-paper/65">{matter.ref} · {matter.answers.fullName ? String(matter.answers.fullName) : user.name}</p>
            </div>
            <StatusPill status={matter.status} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center justify-between text-xs font-semibold text-paper/70">
                <span>{completedCount} of {visible.length} steps done</span>
                <CountUp value={pct} suffix="%" className="text-gold" />
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-paper/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gold transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {["draft", "changes_requested"].includes(matter.status) && resume && (
              <Link
                href={`/will/${resume.section.id}/${resume.question.id}?m=${matter.id}`}
                className="group inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-ink hover:brightness-105"
              >
                Resume where you left off
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            )}
            {matter.status === "awaiting_payment" && (
              <Link href={`/checkout?m=${matter.id}`} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-ink hover:brightness-105">
                Continue to payment <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-24 pt-8 sm:px-6">
        <ReadinessRing score={readiness.score} band={readiness.band} nextActions={readiness.nextActions} matterId={matter.id} />
        <SmartNudges nudges={nudges} matterId={matter.id} />
        <ol className="grid gap-4 sm:grid-cols-2">
          {infos.map(({ section, info }, i) => {
            const meta = STATUS_META[info.status];
            const Icon = STEP_ICONS[section.icon ?? "user"] ?? STEP_ICONS.user;
            const href = info.status === "not_needed"
              ? undefined
              : `/will/${section.id}/${info.firstUnanswered?.id ?? firstVisibleId(section.id)}?m=${matter.id}`;
            return (
              <li key={section.id}>
                <div className={cn("flex h-full flex-col rounded-3xl border p-5 card-shadow", info.status === "not_needed" ? "border-ink/10 bg-paper/50 opacity-70" : "border-ink/10 bg-paper")}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-eucalyptus/10 text-eucalyptus" aria-hidden>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", meta.cls)}>
                      <meta.icon className="h-3 w-3" aria-hidden /> {meta.label}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-xl font-semibold text-ink">
                    <span className="mr-1.5 text-sm font-normal text-ink/40" aria-hidden>{i + 1}.</span>
                    {section.title}
                  </h2>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-ink/60">{section.description}</p>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-ink/45">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden /> ~{section.minutes ?? 3} min
                      {info.total > 0 && <span className="text-ink/35">· {info.answered}/{info.total} answered</span>}
                    </span>
                    {href && info.status !== "not_needed" && (
                      <Link
                        href={href}
                        className={cn(
                          "rounded-full px-4 py-2 text-xs font-bold transition-colors",
                          info.status === "in_progress" || info.status === "needs_attention"
                            ? "bg-eucalyptus text-paper hover:bg-moss"
                            : "border-2 border-eucalyptus text-eucalyptus hover:bg-eucalyptus hover:text-paper"
                        )}
                      >
                        {info.status === "not_started" ? "Start" : info.status === "complete" || info.status === "skipped" ? "Review" : "Continue"}
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <EstateSnapshot slices={snapshot.slices} estimate={snapshot.estimate} giftTotal={snapshot.giftTotal} residuePool={snapshot.residuePool} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ink/10 bg-paper p-6 card-shadow">
          <div>
            <p className="font-display text-lg font-semibold text-ink">Finished all seven?</p>
            <p className="text-sm text-ink/60">Review every answer before it goes to a lawyer.</p>
          </div>
          <Link
            href={`/app/wizard/${matter.id}/review`}
            className={cn(
              "rounded-full px-6 py-3 text-sm font-bold transition-colors",
              pct >= 100 ? "bg-eucalyptus text-paper hover:bg-moss" : "pointer-events-none bg-ink/10 text-ink/40"
            )}
            aria-disabled={pct < 100}
          >
            Review answers
          </Link>
        </div>
      </main>
    </div>
  );
}

function firstVisibleId(sectionId: string): string {
  const map: Record<string, string> = {
    about: "fullName",
    guardians: "appointGuardian",
    pets: "hasPets",
    executors: "executors",
    divide: "assetTypes",
    gifts: "hasSpecificGifts",
    funeral: "funeralWish",
  };
  return map[sectionId] ?? "fullName";
}
