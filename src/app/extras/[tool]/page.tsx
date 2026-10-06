import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { ToolScreen } from "@/components/tool-screens";

export const metadata: Metadata = { title: "Concept preview" };

export function generateStaticParams() {
  return [{ tool: "storage" }, { tool: "reminders" }, { tool: "executor-contact" }, { tool: "executor" }];
}

export default async function ExtrasPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/app" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-eucalyptus">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>
      <div className="mt-4">
        <ToolScreen tool={tool} />
      </div>
    </div>
  );
}
