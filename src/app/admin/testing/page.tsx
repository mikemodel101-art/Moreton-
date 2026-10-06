import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/chrome";
import { ADMIN_NAV } from "@/app/admin/page";
import { listFeedbackAction, funnelAction } from "@/lib/actions/feedback";
import { TestingToolkit } from "@/components/testing-toolkit";

export const metadata: Metadata = { title: "User-testing toolkit" };

export default async function TestingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!["admin", "observer", "senior_lawyer"].includes(user.role)) redirect("/lawyer");

  const feedback = await listFeedbackAction();
  const funnel = await funnelAction();

  return (
    <ConsoleShell
      title="User-testing toolkit"
      subtitle="Question feedback, time-on-screen and drop-off — so the firm learns from every session"
      currentPath="/admin/testing"
      allowedRoles={["admin", "observer", "senior_lawyer"]}
      nav={ADMIN_NAV}
    >
      <TestingToolkit feedback={feedback} funnel={funnel} />
    </ConsoleShell>
  );
}
