import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { ADMIN_NAV } from "@/app/admin/page";
import { db } from "@/lib/store";
import { QuestionsJsonEditor } from "@/components/admin-widgets";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Question bank" };

export default async function AdminQuestionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer"].includes(user.role)) redirect("/lawyer");

  const q = db().questions;
  const typedSections = q.sections as unknown as import("@/lib/config").Section[];
  const sections = typedSections.length;
  const questions = typedSections.reduce((n, s) => n + s.questions.length, 0);
  const branchCount =
    typedSections.filter((s) => s.visibleIf).length +
    typedSections.reduce((n, s) => n + s.questions.filter((qq) => qq.visibleIf).length, 0);
  const repeaterCount = typedSections.reduce(
    (n, s) => n + s.questions.filter((qq) => qq.type === "repeater").length,
    0
  );
  const isAdmin = user.role === "admin";

  return (
    <ConsoleShell
      title="Question bank"
      subtitle={`Version ${q.version} · ${sections} sections · ${questions} questions`}
      currentPath="/admin/questions"
      allowedRoles={["admin", "observer"]}
      nav={ADMIN_NAV}
    >
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Sections", sections],
          ["Questions", questions],
          ["Branching rules", branchCount],
          ["Repeaters", repeaterCount],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-4 text-center">
            <p className="font-display text-2xl font-semibold text-eucalyptus">{value}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        {isAdmin ? (
          <QuestionsJsonEditor json={JSON.stringify(q, null, 2)} />
        ) : (
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-fern">Read-only view (observer)</p>
            <pre className="max-h-[480px] overflow-auto rounded-xl bg-ink p-4 font-mono text-xs leading-relaxed text-paper/85 nice-scroll">
              {JSON.stringify(q, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </ConsoleShell>
  );
}
