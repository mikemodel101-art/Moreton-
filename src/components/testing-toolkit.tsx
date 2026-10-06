"use client";

import { useMemo, useState } from "react";
import { Download, NotebookPen, ThumbsDown, ThumbsUp, Timer, TrendingDown } from "lucide-react";
import { Badge, Button, Card, Textarea, cn } from "@/components/ui";
import { DataTable } from "@/components/design-system";
import type { FeedbackRow } from "@/lib/actions/feedback";

export function TestingToolkit({
  feedback,
  funnel,
}: {
  feedback: FeedbackRow[];
  funnel: { step: string; reached: number }[];
}) {
  const [notes, setNotes] = useState("");

  const byQuestion = useMemo(() => {
    const map = new Map<string, { label: string; up: number; down: number; totalMs: number; n: number }>();
    for (const f of feedback) {
      const cur = map.get(f.questionId) ?? { label: f.questionLabel, up: 0, down: 0, totalMs: 0, n: 0 };
      if (f.rating === "up") cur.up += 1;
      else cur.down += 1;
      cur.totalMs += f.ms;
      cur.n += 1;
      map.set(f.questionId, cur);
    }
    return [...map.entries()]
      .map(([id, v]) => ({ id, ...v, avgSec: Math.round(v.totalMs / v.n / 1000), clarity: Math.round((v.up / v.n) * 100) }))
      .sort((a, b) => a.clarity - b.clarity || b.avgSec - a.avgSec);
  }, [feedback]);

  const up = feedback.filter((f) => f.rating === "up").length;
  const clarity = feedback.length ? Math.round((up / feedback.length) * 100) : 0;
  const slowest = byQuestion.length ? [...byQuestion].sort((a, b) => b.avgSec - a.avgSec)[0] : null;
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.reached));

  function exportCsv() {
    const header = ["id", "createdAt", "user", "matterId", "questionId", "questionLabel", "rating", "seconds", "comment"];
    const rows = feedback.map((f) => [
      f.id, f.createdAt, f.userName, f.matterId ?? "", f.questionId, f.questionLabel, f.rating,
      Math.round(f.ms / 1000), (f.comment ?? "").replace(/"/g, '""'),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c)}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moreton-user-testing-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Responses", value: String(feedback.length), sub: "this session" },
          { label: "Clarity score", value: `${clarity}%`, sub: `${up} 👍 / ${feedback.length - up} 👎` },
          { label: "Slowest question", value: slowest ? `${slowest.avgSec}s` : "—", sub: slowest ? slowest.label.slice(0, 32) : "no data" },
          { label: "Questions rated", value: String(byQuestion.length), sub: "distinct" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs font-semibold text-ink/55">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">{s.value}</p>
            <p className="truncate text-xs text-ink/45">{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Timer className="h-5 w-5 text-eucalyptus" aria-hidden /> Problem questions
          </h2>
          <p className="mt-1 text-xs text-ink/55">Lowest clarity first — these are what to rewrite.</p>
          <ul className="mt-4 space-y-2.5">
            {byQuestion.map((q) => (
              <li key={q.id} className="rounded-xl border border-ink/10 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{q.label}</p>
                    <code className="font-mono text-[10px] text-ink/40">{q.id}</code>
                  </div>
                  <Badge tone={q.clarity >= 75 ? "green" : q.clarity >= 50 ? "gold" : "red"}>{q.clarity}% clear</Badge>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-ink/55">
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-eucalyptus" aria-hidden /> {q.up}</span>
                  <span className="inline-flex items-center gap-1"><ThumbsDown className="h-3 w-3 text-clay" aria-hidden /> {q.down}</span>
                  <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" aria-hidden /> {q.avgSec}s avg</span>
                </div>
              </li>
            ))}
            {byQuestion.length === 0 && <li className="py-6 text-center text-sm text-ink/50">No feedback captured yet.</li>}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <TrendingDown className="h-5 w-5 text-eucalyptus" aria-hidden /> Drop-off funnel
            </h2>
            <ul className="mt-4 space-y-3">
              {funnel.map((f) => (
                <li key={f.step}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-ink">{f.step}</span>
                    <span className="text-ink/60">{f.reached}</span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-ink/8">
                    <div className="h-full rounded-full bg-eucalyptus" style={{ width: `${(f.reached / maxFunnel) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <NotebookPen className="h-5 w-5 text-eucalyptus" aria-hidden /> Session notes
            </h2>
            <p className="mt-1 text-xs text-ink/55">Observations during a live testing session. Included in the CSV export.</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="P3 hesitated on the residue question; didn't notice the slider at first…"
              className="mt-3 min-h-[120px]"
            />
            <Button size="sm" className="mt-3" onClick={exportCsv}>
              <Download className="h-4 w-4" aria-hidden /> Export feedback CSV
            </Button>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <h2 className="border-b border-ink/10 px-5 py-3.5 font-display text-lg font-semibold text-ink">All responses</h2>
        <div className="p-4">
          <DataTable<FeedbackRow>
            caption="User-testing feedback"
            rows={feedback}
            pageSize={8}
            searchPlaceholder="Search comments, questions, testers…"
            columns={[
              { key: "rating", label: "", render: (r) => (r.rating === "up" ? <ThumbsUp className="h-4 w-4 text-eucalyptus" aria-label="Clear" /> : <ThumbsDown className="h-4 w-4 text-clay" aria-label="Confusing" />) },
              { key: "questionLabel", label: "Question", sortable: true, render: (r) => <span className="block max-w-[260px] truncate text-xs">{r.questionLabel}</span> },
              { key: "comment", label: "Comment", render: (r) => <span className={cn("block max-w-[300px] text-xs", !r.comment && "text-ink/35")}>{r.comment || "—"}</span> },
              { key: "ms", label: "Time", sortable: true, align: "right", sortValue: (r) => r.ms, render: (r) => <span className="text-xs">{Math.round(r.ms / 1000)}s</span> },
              { key: "userName", label: "Tester", sortable: true, render: (r) => <span className="text-xs">{r.userName}</span> },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
