"use client";

import { useMemo, useState } from "react";
import { Beaker, Eye, EyeOff, RotateCcw } from "lucide-react";
import type { Section } from "@/lib/config";
import type { Answers, AnswerValue } from "@/lib/types";
import { questionPath } from "@/lib/steps";
import { checkConsistency, computeComplexity, computeDerived, evaluateFlags } from "@/lib/engine";
import { Badge, Button, Card, Input, Select, SEVERITY_TONE, cn } from "@/components/ui";

const PRESETS: { name: string; answers: Answers }[] = [
  { name: "Empty", answers: {} },
  {
    name: "Simple single",
    answers: { dob: "1990-02-01", maritalStatus: "single", hasChildren: "no", hasPets: "no", livesInQLD: "yes", estateValue: "under_500k", hasSpecificGifts: "no", residueStructure: "named" },
  },
  {
    name: "Blended family + business",
    answers: {
      dob: "1968-04-17", maritalStatus: "married", relationshipRecent: "no", hasChildren: "yes",
      children: [
        { name: "Charlotte", dob: "1998-02-14", relationship: "child", previousRelationship: true, includeInWill: true },
        { name: "Alice", dob: "2013-05-06", relationship: "child", previousRelationship: false, includeInWill: true },
      ],
      structures: ["business", "trust"], estateValue: "2m_5m", livesInQLD: "yes", propertyOwnership: "tenants_in_common",
    },
  },
  {
    name: "Blocker: helper is beneficiary",
    answers: { dob: "1944-01-01", hasHelper: "yes", helperName: "Robert Shaw", helperIsBeneficiary: "yes", maritalStatus: "widowed" },
  },
  {
    name: "Blocker: executor under 18",
    answers: { dob: "1980-01-01", executorIssues: ["under18"], maritalStatus: "single" },
  },
  {
    name: "Inconsistent answers",
    answers: { dob: "1985-01-01", hasChildren: "no", guardianName: "Sam Lee", residueStructure: "split_children", hasPets: "no", petAmount: 5000 },
  },
];

/** Quick-edit fields that drive most of the branching and flag logic. */
const CONTROLS: { id: string; label: string; options: string[] }[] = [
  { id: "maritalStatus", label: "Relationship", options: ["", "single", "married", "defacto", "separated", "divorced", "widowed"] },
  { id: "hasChildren", label: "Has children", options: ["", "yes", "no"] },
  { id: "livesInQLD", label: "Lives in QLD", options: ["", "yes", "interstate", "overseas"] },
  { id: "estateValue", label: "Estate value", options: ["", "under_500k", "500k_1m", "1m_2m", "2m_5m", "over_5m"] },
  { id: "excludingAnyone", label: "Excluding someone", options: ["", "yes", "no"] },
  { id: "vulnerableBeneficiary", label: "Vulnerable beneficiary", options: ["", "yes", "no", "unsure"] },
  { id: "propertyOwnership", label: "Property tenure", options: ["", "sole", "joint_tenants", "tenants_in_common", "trust_or_company", "unsure"] },
  { id: "professionalExecutor", label: "Professional executor", options: ["", "no", "firm", "trustee", "unsure"] },
  { id: "hasHelper", label: "Someone helping", options: ["", "no", "yes"] },
  { id: "helperIsBeneficiary", label: "Helper benefits", options: ["", "no", "yes", "unsure"] },
  { id: "hasPets", label: "Has pets", options: ["", "yes", "no"] },
  { id: "hasSpecificGifts", label: "Specific gifts", options: ["", "yes", "no"] },
];

export function LogicSimulator({ sections }: { sections: Section[] }) {
  const [answers, setAnswers] = useState<Answers>(PRESETS[1].answers);
  const [showHidden, setShowHidden] = useState(false);

  const result = useMemo(() => {
    const path = questionPath(sections, answers);
    const visibleIds = new Set(path.map((p) => p.question.id));
    const flags = evaluateFlags(answers);
    return {
      path,
      visibleIds,
      flags,
      complexity: computeComplexity(flags),
      issues: checkConsistency(answers),
      derived: computeDerived(answers),
    };
  }, [sections, answers]);

  function set(id: string, v: AnswerValue) {
    setAnswers((prev) => {
      const next = { ...prev };
      if (v === "" || v === undefined) delete next[id];
      else next[id] = v;
      return next;
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {/* Controls */}
      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
            <Beaker className="h-4 w-4 text-eucalyptus" aria-hidden /> Scenario
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setAnswers(p.answers)}
                className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:border-eucalyptus hover:text-eucalyptus"
              >
                {p.name}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-3" onClick={() => setAnswers({})}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Clear all
          </Button>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-base font-semibold text-ink">Answers</h2>
          <div className="mt-3 space-y-2.5">
            {CONTROLS.map((c) => (
              <div key={c.id}>
                <label htmlFor={`sim-${c.id}`} className="mb-1 block text-[11px] font-semibold text-ink/60">
                  {c.label}
                </label>
                <Select id={`sim-${c.id}`} value={String(answers[c.id] ?? "")} onChange={(e) => set(c.id, e.target.value)} className="py-1.5 text-xs">
                  {c.options.map((o) => (
                    <option key={o} value={o}>
                      {o === "" ? "— not answered —" : o}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
            <div>
              <label htmlFor="sim-dob" className="mb-1 block text-[11px] font-semibold text-ink/60">
                Date of birth (drives capacity flag)
              </label>
              <Input id="sim-dob" type="date" value={String(answers.dob ?? "")} onChange={(e) => set("dob", e.target.value)} className="py-1.5 text-xs" />
            </div>
          </div>
        </Card>
      </div>

      {/* Output */}
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-ink">Outcome</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink/55">Complexity</span>
              <span className="font-display text-2xl font-semibold text-ink">{result.complexity.score}</span>
              <Badge tone={result.complexity.label === "Complex" ? "red" : result.complexity.label === "Needs attention" ? "gold" : "green"}>
                {result.complexity.label}
              </Badge>
              <Badge tone="neutral">→ {result.complexity.routing}</Badge>
            </div>
          </div>
          {result.complexity.blocked && (
            <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger">
              BLOCKED — client is routed to /book-a-call instead of checkout.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">
            Flags triggered <span className="text-sm font-normal text-ink/50">({result.flags.length})</span>
          </h2>
          {result.flags.length === 0 ? (
            <p className="text-sm text-ink/50">No flags for this scenario.</p>
          ) : (
            <ul className="space-y-2">
              {result.flags.map((f) => (
                <li key={f.id} className="rounded-xl border border-ink/10 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={SEVERITY_TONE[f.severity] ?? "sky"} className="uppercase">
                      <span className="font-mono text-[9px] opacity-70">{f.severity}</span> {f.label}
                    </Badge>
                    <code className="font-mono text-[10px] text-ink/40">{f.id}</code>
                    <span className="ml-auto text-[11px] font-semibold text-ink/50">weight {f.weight} · {f.routing}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-ink/65">{f.lawyerMessage}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {result.issues.length > 0 && (
          <Card className="border-clay/30 bg-clay/5 p-5">
            <h2 className="font-display text-base font-semibold text-ink">Consistency issues ({result.issues.length})</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink/75">
              {result.issues.map((i) => (
                <li key={i.id}>
                  · {i.message} <code className="font-mono text-[10px] text-ink/40">{i.id}</code>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">
              Questions shown <span className="text-sm font-normal text-ink/50">({result.path.length})</span>
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
              {showHidden ? "Hide skipped" : "Show skipped"}
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {sections.map((s) => {
              const shown = result.path.filter((p) => p.section.id === s.id);
              const skipped = s.questions.filter((q) => !result.visibleIds.has(q.id));
              if (shown.length === 0 && !showHidden) {
                return (
                  <p key={s.id} className="text-xs text-ink/40">
                    <strong className="text-ink/55">{s.title}</strong> — step skipped entirely
                  </p>
                );
              }
              return (
                <div key={s.id}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-fern">{s.title}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {shown.map((p) => (
                      <code key={p.question.id} className="rounded bg-eucalyptus/10 px-1.5 py-0.5 font-mono text-[10px] text-eucalyptus">
                        {p.question.id}
                      </code>
                    ))}
                    {showHidden &&
                      skipped.map((q) => (
                        <code key={q.id} className="rounded bg-ink/6 px-1.5 py-0.5 font-mono text-[10px] text-ink/35 line-through">
                          {q.id}
                        </code>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <details className="rounded-2xl border border-ink/10 bg-paper p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Derived facts (what conditions read)</summary>
          <pre className={cn("mt-3 max-h-64 overflow-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-paper/85 nice-scroll")}>
            {JSON.stringify(result.derived, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
