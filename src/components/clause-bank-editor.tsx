"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Beaker, Eye, FlaskConical, Save, ShieldAlert } from "lucide-react";
import { approveClauseAction, updateClauseTextAction } from "@/lib/actions/admin";
import { Badge, Button, Card, Select, Textarea, cn } from "@/components/ui";
import { DiffViewer, RichTextEditor } from "@/components/design-system";
import { evalCondition, renderTemplate, buildClauseContext } from "@/lib/engine";
import type { Answers } from "@/lib/types";

export interface ClauseRowAdmin {
  id: string;
  title: string;
  section: string;
  order: number;
  include: unknown;
  optional: boolean;
  repeat: string | null;
  variants: { id: string; when: unknown; text: string }[];
  lawyerNotes: string;
  version: string;
  status: string;
  approvedBy: string | null;
  approvedOn: string | null;
}

/** Sample matters used for preview-with-sample-data and the logic tester. */
export const SAMPLES: { id: string; label: string; answers: Answers }[] = [
  {
    id: "single",
    label: "Single, no children",
    answers: {
      fullName: "Ethan James Clark", occupation: "Apprentice carpenter", dob: "2003-05-19",
      address: { street: "9/120 Beck Street", suburb: "Kelvin Grove", state: "QLD", postcode: "4059" },
      maritalStatus: "single", hasChildren: "no", hasPets: "no",
      executors: [{ name: "Denise Maree Clark", relationship: "parent", address: "45 Nepean Ave, Norman Park QLD", over18: true }],
      residueStructure: "all_partner", residuePrimary: "my mother, Denise Maree Clark", residueSecondary: "Beyond Blue",
      ultimateBeneficiary: "Beyond Blue", backupRule: "redistribute", hasSpecificGifts: "no", funeralWish: "cremation",
    },
  },
  {
    id: "couple_minors",
    label: "Couple with minor children",
    answers: {
      fullName: "Jack William Thompson", occupation: "Electrician", dob: "1985-03-02",
      address: { street: "8 Banksia Court", suburb: "Wynnum", state: "QLD", postcode: "4178" },
      maritalStatus: "married", partnerName: "Kate Louise Thompson", hasChildren: "yes",
      children: [{ name: "Ruby Thompson", dob: "2018-05-30", relationship: "child", includeInWill: true }],
      executors: [
        { name: "Kate Louise Thompson", relationship: "spouse", address: "8 Banksia Court, Wynnum QLD", over18: true },
        { name: "Peter Thompson", relationship: "sibling", address: "3 Smith St, Manly QLD", over18: true },
      ],
      appointGuardian: "yes", guardianName: "Sarah Maree Cole", guardianRelationship: "sibling",
      guardianAddress: { street: "22 Pandanus Ave", suburb: "Manly", state: "QLD", postcode: "4179" },
      trustChoice: "trust_25", residueStructure: "all_partner", residuePrimary: "my wife, Kate Louise Thompson",
      residueSecondary: "my children in equal shares", backupRule: "children_take",
      ultimateBeneficiary: "The Smith Family Foundation", hasSpecificGifts: "no", funeralWish: "cremation", hasPets: "no",
    },
  },
  {
    id: "charity_pets",
    label: "Charity gift + pet trust",
    answers: {
      fullName: "Harper Joy Davis", occupation: "Retired librarian", dob: "1954-02-28",
      address: { street: "31 Flame Tree Crescent", suburb: "Kenmore Hills", state: "QLD", postcode: "4069" },
      maritalStatus: "married", partnerName: "Frank Albert Davis", hasChildren: "no",
      executors: [{ name: "Frank Albert Davis", relationship: "spouse", address: "31 Flame Tree Cr, Kenmore Hills QLD", over18: true }],
      hasSpecificGifts: "yes",
      gifts: [{ type: "cash", description: "$10,000", recipientName: "Cancer Council Queensland", recipientRelationship: "charity", value: 10000, fallback: "residue" }],
      hasPets: "yes", pets: [{ animal: "dog", petName: "Matilda", carer: "Simon Davis" }],
      petMoney: "yes", petAmount: 5000,
      residueStructure: "named",
      residueBeneficiaries: [{ kind: "person", name: "Megan Hartley", relationship: "daughter", share: 100 }],
      backupRule: "children_take", ultimateBeneficiary: "RSPCA Queensland", funeralWish: "burial",
    },
  },
  {
    id: "blended",
    label: "Blended family + business",
    answers: {
      fullName: "Oliver James Brown", occupation: "Company director", dob: "1968-04-17",
      address: { street: "57 Hampstead Road", suburb: "Highgate Hill", state: "QLD", postcode: "4101" },
      maritalStatus: "married", partnerName: "Elaine Margaret Brown", hasChildren: "yes",
      children: [
        { name: "Charlotte Brown", dob: "1998-02-14", relationship: "child", previousRelationship: true, includeInWill: true },
        { name: "Alice Brown", dob: "2013-05-06", relationship: "child", includeInWill: true },
      ],
      structures: ["business", "trust"], estateValue: "2m_5m",
      executors: [
        { name: "Elaine Margaret Brown", relationship: "spouse", address: "57 Hampstead Rd, Highgate Hill QLD", over18: true },
        { name: "Natalie Reeves", relationship: "professional", address: "Level 12, 240 Queen St, Brisbane QLD", over18: true },
      ],
      executorMode: "survivor", professionalExecutor: "firm",
      appointGuardian: "yes", guardianName: "Mark and Lisa Brown", trustChoice: "trust_30",
      residueStructure: "named",
      residueBeneficiaries: [
        { kind: "person", name: "Elaine Margaret Brown", relationship: "wife", share: 50 },
        { kind: "person", name: "Charlotte Brown", relationship: "daughter", share: 25 },
        { kind: "person", name: "Alice Brown", relationship: "daughter", share: 25 },
      ],
      backupRule: "children_take", ultimateBeneficiary: "The Fred Hollows Foundation",
      vulnerableBeneficiary: "no", hasSpecificGifts: "no", hasPets: "no", funeralWish: "burial",
    },
  },
];

export function ClauseBankEditor({ clauses, canEdit, canApprove }: { clauses: ClauseRowAdmin[]; canEdit: boolean; canApprove: boolean }) {
  const [sampleId, setSampleId] = useState(SAMPLES[1].id);
  const sample = SAMPLES.find((s) => s.id === sampleId)!;
  const draftCount = clauses.filter((c) => !c.approvedBy).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/50 bg-[#FFF7E0] px-5 py-4">
        <p className="flex items-start gap-2 text-sm text-ink/80">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#7A5C14]" aria-hidden />
          <span>
            <strong>{draftCount} of {clauses.length} clauses are marked DRAFT.</strong> All wording in this
            prototype is placeholder text — the firm&rsquo;s supervising principal approves each clause before
            it can be treated as settled.
          </span>
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="sample" className="text-xs font-bold uppercase tracking-wide text-[#7A5C14]">
            Preview data
          </label>
          <Select id="sample" value={sampleId} onChange={(e) => setSampleId(e.target.value)} className="max-w-[220px] py-1.5 text-xs">
            {SAMPLES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {clauses.map((c) => (
          <ClauseCard key={c.id} clause={c} sample={sample} canEdit={canEdit} canApprove={canApprove} />
        ))}
      </div>
    </div>
  );
}

function ClauseCard({
  clause,
  sample,
  canEdit,
  canApprove,
}: {
  clause: ClauseRowAdmin;
  sample: { id: string; label: string; answers: Answers };
  canEdit: boolean;
  canApprove: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState(clause.variants[0]?.id ?? "standard");
  const [text, setText] = useState(clause.variants[0]?.text ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const variant = clause.variants.find((v) => v.id === variantId) ?? clause.variants[0];
  const dirty = variant && text !== variant.text;

  // Live conditional-logic test against the chosen sample
  const logic = useMemo(() => {
    const includeFires = clause.include === null || clause.include === undefined || evalCondition(clause.include, sample.answers);
    const variantFires = clause.variants.map((v) => ({
      id: v.id,
      fires: v.when === null || v.when === undefined ? "fallback" : evalCondition(v.when, sample.answers) ? "yes" : "no",
    }));
    const chosen =
      clause.variants.find((v) => v.when !== null && v.when !== undefined && evalCondition(v.when, sample.answers)) ??
      clause.variants.find((v) => v.when === null || v.when === undefined);
    const ctx = buildClauseContext(sample.answers);
    const preview = chosen ? renderTemplate(dirty && chosen.id === variantId ? text : chosen.text, ctx) : "";
    return { includeFires, variantFires, chosenId: chosen?.id ?? null, preview };
  }, [clause, sample, text, dirty, variantId]);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <code className="font-mono text-[11px] font-bold text-eucalyptus">{clause.id}</code>
          <span className="font-semibold text-ink">{clause.title}</span>
          {clause.approvedBy ? (
            <Badge tone="green">
              <BadgeCheck className="h-3 w-3" aria-hidden /> v{clause.version} approved
            </Badge>
          ) : (
            <Badge tone="gold">DRAFT v{clause.version}</Badge>
          )}
          {clause.optional ? <Badge tone="neutral">optional</Badge> : <Badge tone="sky">mandatory</Badge>}
          {clause.repeat && <Badge tone="neutral">repeats: {clause.repeat}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", logic.includeFires ? "bg-eucalyptus/10 text-eucalyptus" : "bg-ink/8 text-ink/45")}>
            {logic.includeFires ? "included for sample" : "not included"}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
            <Eye className="h-3.5 w-3.5" aria-hidden /> {open ? "Close" : "Open"}
          </Button>
        </div>
      </div>

      {clause.approvedBy && (
        <p className="mt-1.5 text-xs text-ink/50">
          Approved by {clause.approvedBy} on {clause.approvedOn}
        </p>
      )}

      {/* Preview with sample data (always visible — the quickest check) */}
      <div className="mt-3 rounded-xl bg-sand px-4 py-3">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-fern">
          Preview — {sample.label}
          {logic.chosenId && <span className="ml-1.5 text-ink/40">variant: {logic.chosenId}</span>}
        </p>
        <p className="text-sm leading-relaxed text-ink/85">
          {logic.includeFires ? logic.preview || <em className="text-ink/45">Renders empty for this sample.</em> : <em className="text-ink/45">Condition excludes this clause for the selected sample.</em>}
        </p>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-ink/10 pt-4">
          <p className="rounded-xl bg-eucalyptus/5 px-3.5 py-2.5 text-xs leading-relaxed text-ink/70">
            <strong className="text-eucalyptus">Lawyer notes:</strong> {clause.lawyerNotes}
          </p>

          {/* Conditional logic tester */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-fern">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Conditional logic tester
            </p>
            <div className="space-y-1.5 rounded-xl border border-ink/10 p-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <code className="font-mono text-[10px] text-ink/55">include</code>
                <span className={cn("rounded-full px-2 py-0.5 font-bold", logic.includeFires ? "bg-eucalyptus/10 text-eucalyptus" : "bg-ink/8 text-ink/45")}>
                  {logic.includeFires ? "TRUE" : "FALSE"}
                </span>
              </div>
              {logic.variantFires.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 text-xs">
                  <code className="font-mono text-[10px] text-ink/55">variant: {v.id}</code>
                  <span className={cn("rounded-full px-2 py-0.5 font-bold", v.fires === "yes" ? "bg-eucalyptus/10 text-eucalyptus" : v.fires === "fallback" ? "bg-gold/15 text-[#7A5C14]" : "bg-ink/8 text-ink/45")}>
                    {v.fires === "yes" ? "MATCHES" : v.fires === "fallback" ? "FALLBACK" : "no"}
                  </span>
                </div>
              ))}
              <pre className="mt-2 max-h-28 overflow-auto rounded-lg bg-ink p-2.5 font-mono text-[10px] leading-relaxed text-paper/80 nice-scroll">
{JSON.stringify(clause.include ?? "always included", null, 1)}
              </pre>
            </div>
          </div>

          {/* Variant editor */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <label htmlFor={`v-${clause.id}`} className="text-xs font-bold uppercase tracking-widest text-fern">
                Edit variant
              </label>
              <Select
                id={`v-${clause.id}`}
                value={variantId}
                className="max-w-[200px] py-1 text-xs"
                onChange={(e) => {
                  setVariantId(e.target.value);
                  setText(clause.variants.find((v) => v.id === e.target.value)?.text ?? "");
                }}
              >
                {clause.variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.id}</option>
                ))}
              </Select>
            </div>
            {canEdit ? (
              <RichTextEditor
                value={text || variant?.text || ""}
                onChange={setText}
                variables={["fullName", "addressLine", "executorList", "residuePrimary", "ultimateBeneficiary", "guardianName"]}
                minHeight={120}
              />
            ) : (
              <Textarea readOnly value={variant?.text ?? ""} className="min-h-[110px] font-mono text-xs" />
            )}

            {dirty && (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-fern">Change preview</p>
                <DiffViewer before={variant?.text ?? ""} after={text} />
              </div>
            )}

            {msg && <p role="status" className="mt-2 text-xs font-semibold text-eucalyptus">{msg}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canEdit && (
                <Button
                  size="sm"
                  loading={pending}
                  disabled={!dirty}
                  onClick={() =>
                    start(async () => {
                      const r = await updateClauseTextAction(clause.id, text, variantId);
                      setMsg(r.ok ? "Saved — version bumped and approval reset to DRAFT." : r.error);
                      router.refresh();
                    })
                  }
                >
                  <Save className="h-3.5 w-3.5" aria-hidden /> Save new version
                </Button>
              )}
              {canApprove && !clause.approvedBy && (
                <Button
                  size="sm"
                  variant="gold"
                  loading={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await approveClauseAction(clause.id);
                      setMsg(r.ok ? "Clause approved — DRAFT watermark removed for this clause." : r.error);
                      router.refresh();
                    })
                  }
                >
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Approve wording
                </Button>
              )}
              {!canApprove && !clause.approvedBy && (
                <span className="inline-flex items-center gap-1.5 text-xs text-ink/50">
                  <Beaker className="h-3.5 w-3.5" aria-hidden /> Senior Lawyer approval required
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
