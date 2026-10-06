import { notFound } from "next/navigation";
import { MockVault } from "@/components/mock-vault";
import { MockReminders } from "@/components/mock-reminders";
import { MockExecutorContact } from "@/components/mock-executor";

export const TOOL_ROUTES: Record<string, string> = {
  storage: "vault",
  vault: "vault",
  reminders: "reminders",
  "executor-contact": "contact",
  executor: "contact",
  contact: "contact",
};

export function ToolScreen({ tool }: { tool: string }) {
  const resolved = TOOL_ROUTES[tool];
  if (!resolved) notFound();
  return (
    <div className="space-y-6">
      {resolved === "vault" && <MockVault />}
      {resolved === "reminders" && <MockReminders />}
      {resolved === "contact" && <MockExecutorContact />}
    </div>
  );
}
