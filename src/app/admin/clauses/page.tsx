import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { ADMIN_NAV } from "@/app/admin/page";
import { db } from "@/lib/store";
import { getClauseCategories } from "@/lib/clauseEngine";
import { ClauseBankEditor } from "@/components/clause-bank-editor";
import clausesConfig from "../../../../config/clauses.json";

export const metadata: Metadata = { title: "Clause bank" };

export default async function AdminClausesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer", "senior_lawyer"].includes(user.role)) redirect("/lawyer");

  const categories = getClauseCategories();
  const clauses = [...db().clauses].sort((a, b) => a.order - b.order);
  const canEdit = user.role === "admin" || user.role === "senior_lawyer";
  const canApprove = user.role === "senior_lawyer";

  return (
    <ConsoleShell
      title="Clause bank"
      subtitle={`${clauses.length} clauses · ${categories.length} sections · Queensland · bank v${clausesConfig.version}`}
      currentPath="/admin/clauses"
      allowedRoles={["admin", "observer", "senior_lawyer"]}
      nav={ADMIN_NAV}
    >
      <p className="mb-5 max-w-3xl text-sm text-ink/60">
        The will generator selects clauses by condition, picks the matching <strong>variant</strong>, renders{" "}
        <code className="rounded bg-paper px-1 font-mono text-xs">{"{{variables}}"}</code>, then lets lawyers
        override per matter. Editing any variant bumps the version and resets approval to DRAFT.
      </p>

      <div className="space-y-8">
        {categories.map((cat) => {
          const inCat = clauses.filter((c) => c.section === cat.id);
          if (inCat.length === 0) return null;
          return (
            <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
              <h2 id={`cat-${cat.id}`} className="mb-3 font-display text-lg font-semibold text-ink">
                <span className="mr-2 text-sm font-normal text-ink/40">{cat.order}.</span>
                {cat.title}
                <span className="ml-2 text-xs font-normal text-ink/45">{inCat.length} clauses</span>
              </h2>
              <ClauseBankEditor
                canEdit={canEdit}
                canApprove={canApprove}
                clauses={inCat.map((c) => ({
                  id: c.id,
                  title: c.title,
                  section: c.section,
                  order: c.order,
                  include: c.include,
                  optional: c.optional,
                  repeat: c.repeat ?? null,
                  variants: c.variants,
                  lawyerNotes: c.lawyerNotes,
                  version: c.version,
                  status: c.status,
                  approvedBy: c.approvedBy,
                  approvedOn: c.approvedOn,
                }))}
              />
            </section>
          );
        })}
      </div>
    </ConsoleShell>
  );
}
