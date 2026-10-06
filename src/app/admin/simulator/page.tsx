import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { ADMIN_NAV } from "@/app/admin/page";
import { getSections } from "@/lib/config";
import { LogicSimulator } from "@/components/logic-simulator";

export const metadata: Metadata = { title: "Logic simulator" };

export default async function SimulatorPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer", "senior_lawyer"].includes(user.role)) redirect("/lawyer");

  return (
    <ConsoleShell
      title="Logic simulator"
      subtitle="Pick answers, see which questions appear and which flags fire"
      currentPath="/admin/simulator"
      allowedRoles={["admin", "observer", "senior_lawyer"]}
      nav={ADMIN_NAV}
    >
      <p className="mb-5 max-w-2xl text-sm text-ink/60">
        This runs the real branching and triage engines against hypothetical answers — the same code the
        client questionnaire uses. Change a rule in{" "}
        <code className="rounded bg-paper px-1 font-mono text-xs">config/flags.json</code> and the results
        here change with it, no deploy required.
      </p>
      <LogicSimulator sections={getSections()} />
    </ConsoleShell>
  );
}
