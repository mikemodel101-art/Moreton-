import { redirect } from "next/navigation";

const MAP: Record<string, string> = {
  vault: "storage",
  storage: "storage",
  reminders: "reminders",
  executor: "executor",
  "executor-contact": "executor-contact",
};

export async function generateStaticParams() {
  return [{ tool: "vault" }, { tool: "reminders" }, { tool: "executor" }];
}

export default async function LegacyToolRedirect({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  redirect(`/extras/${MAP[tool] ?? tool}`);
}
