"use client";

import { useState } from "react";
import { ArrowRight, Bell, Check, FlaskConical, Sparkles } from "lucide-react";
import {
  Avatar, Badge, Button, Card, ProgressBar, StatusPill, FieldShell, Input, Textarea, Select,
  EmptyState, cn,
} from "@/components/ui";
import {
  Term, Callout, Modal, Drawer, useToast, SkeletonCard, SkeletonText,
  ComboBox, PercentAllocator, DataTable, KanbanBoard, DiffViewer, RichTextEditor,
  Timeline, CompletionRing, AnimatedCheck, CountUp, AnimatedMoney, Stagger, StaggerItem,
  DirSlide, CompletionOverlay,
} from "@/components/design-system";
import brand from "../../../config/brand.json";

const NAV = [
  ["tokens", "Tokens"], ["type", "Typography"], ["buttons", "Buttons"], ["inputs", "Inputs"],
  ["allocator", "Allocator"], ["progress", "Progress"], ["feedback", "Feedback"],
  ["data", "Data display"], ["kanban", "Kanban"], ["documents", "Clauses"],
];

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
      <div className="h-14" style={{ background: value }} />
      <div className="px-2.5 py-1.5">
        <p className="text-xs font-bold text-ink">{name}</p>
        <p className="font-mono text-[10px] text-ink/50">{value}</p>
      </div>
    </div>
  );
}

function Demo({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5">
      <p className="mb-1 text-sm font-bold text-ink">{title}</p>
      {hint && <p className="mb-3 text-xs text-ink/55">{hint}</p>}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function DesignPage() {
  const t = brand.tokens;
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const [step, setStep] = useState(0);
  const [combo, setCombo] = useState("");
  const [toggle, setToggle] = useState(true);
  const [radio, setRadio] = useState("married");
  const [checks, setChecks] = useState<string[]>(["home"]);
  const [alloc, setAlloc] = useState([
    { id: "a", label: "Elaine Brown", sub: "Spouse", value: 50 },
    { id: "b", label: "Charlotte Brown", sub: "Daughter", value: 25 },
    { id: "c", label: "Henry Brown", sub: "Son", value: 25 },
  ]);
  const [boardKey, setBoardKey] = useState(0);
  const [rich, setRich] = useState("I APPOINT {{executorName}} of {{executorAddress}} to be the executor of this will.");

  const tableRows = [
    { id: "r1", ref: "MW-2026-0141", client: "Ava Nguyen", status: "Draft", updated: "2h ago" },
    { id: "r2", ref: "MW-2026-0138", client: "Mia Walker", status: "In review", updated: "5h ago" },
    { id: "r3", ref: "MW-2026-0136", client: "Oliver Brown", status: "Flagged", updated: "1d ago" },
    { id: "r4", ref: "MW-2026-0108", client: "Harper Davis", status: "Issued", updated: "4d ago" },
    { id: "r5", ref: "MW-2026-0122", client: "Lucas Wilson", status: "Approved", updated: "2d ago" },
  ];

  return (
    <div className="min-h-screen bg-sand">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-ink text-paper">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="h-5 w-5 text-gold" aria-hidden />
            <p className="font-display text-lg font-semibold">Design system</p>
            <Badge tone="gold" className="ml-1">internal · /design</Badge>
          </div>
          <a href="/" className="text-xs font-semibold text-paper/70 hover:text-paper">← Back to product</a>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[180px_1fr]">
        <nav className="hidden lg:block" aria-label="Design sections">
          <ul className="sticky top-24 space-y-1 text-sm">
            {NAV.map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="block rounded-lg px-3 py-1.5 font-semibold text-ink/60 hover:bg-paper hover:text-eucalyptus">{label}</a></li>
            ))}
          </ul>
        </nav>

        <main className="space-y-12 pb-24">
          <p className="max-w-2xl text-sm leading-relaxed text-ink/65">
            Every surface tokens from <code className="rounded bg-paper px-1 font-mono text-xs">config/brand.json</code> —
            swapping the brand is a one-file change. Tone of voice: <em>{brand.toneOfVoice.summary}</em>
          </p>

          {/* TOKENS */}
          <section id="tokens" aria-labelledby="tokens-h">
            <h2 id="tokens-h" className="font-display text-2xl font-semibold text-ink">Brand tokens</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Swatch name="primary" value={t.primary} />
              <Swatch name="secondary" value={t.secondary} />
              <Swatch name="accent" value={t.accent} />
              <Swatch name="surface" value={t.surface} />
              <Swatch name="success" value={t.success} />
              <Swatch name="warning" value={t.warning} />
              <Swatch name="danger" value={t.danger} />
              <Swatch name="background" value={t.background} />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-fern">Neutral scale 50–900</p>
            <div className="mt-2 flex overflow-hidden rounded-xl border border-ink/10">
              {Object.entries(t.neutral).map(([k, v]) => (
                <div key={k} className="flex h-12 flex-1 items-end justify-center pb-0.5 text-[8px] font-mono" style={{ background: v, color: Number(k) > 500 ? "#fff" : "#888" }}>{k}</div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(t.radius).filter(([k]) => k !== "full").map(([k, v]) => (
                <div key={k} className="border border-ink/10 bg-white p-3 text-center text-xs font-semibold" style={{ borderRadius: v }}>
                  radius.{k} · {v}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {Object.entries(t.shadow).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white p-4 text-center text-xs font-semibold" style={{ boxShadow: v }}>
                  shadow.{k}
                </div>
              ))}
            </div>
          </section>

          {/* TYPE */}
          <section id="type" aria-labelledby="type-h">
            <h2 id="type-h" className="font-display text-2xl font-semibold text-ink">Typography &amp; voice</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Demo title={`Heading — ${t.fonts.heading}`}>
                <p className="font-display text-3xl font-semibold">Queensland wills, made properly simple.</p>
                <p className="font-display text-xl">The quick brown fox</p>
              </Demo>
              <Demo title={`Body — ${t.fonts.body} (18px on mobile)`}>
                <p className="text-base leading-relaxed">Most people put off their will for years. We make it calm, plain-English, and reviewed by a real solicitor — so you can finish in one sitting.</p>
              </Demo>
            </div>
            <div className="mt-3">
              <Demo title="Tone-of-voice rules" hint="Shown here because the brand guide lives in config">
                <ul className="list-inside list-disc space-y-1 text-sm text-ink/70">
                  {brand.toneOfVoice.rules.map((r) => <li key={r}>{r}</li>)}
                </ul>
                <p className="text-sm">Legal terms always get a tooltip: <Term label="executor" tip={brand.toneOfVoice.tooltipExamples.executor} /> · <Term label="probate" tip={brand.toneOfVoice.tooltipExamples.probate} /> · <Term label="residue" tip={brand.toneOfVoice.tooltipExamples.residue} /></p>
              </Demo>
            </div>
          </section>

          {/* BUTTONS */}
          <section id="buttons" aria-labelledby="buttons-h">
            <h2 id="buttons-h" className="font-display text-2xl font-semibold text-ink">Buttons</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="gold">Gold</Button>
              <Button variant="danger">Destructive</Button>
              <Button variant="ghost">Ghost</Button>
              <Button loading>Saving</Button>
              <Button disabled>Disabled</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large <ArrowRight className="h-4 w-4" aria-hidden /></Button>
            </div>
          </section>

          {/* INPUTS */}
          <section id="inputs" aria-labelledby="inputs-h">
            <h2 id="inputs-h" className="font-display text-2xl font-semibold text-ink">Inputs</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Demo title="Text, email, phone & date">
                <FieldShell label="Full legal name" htmlFor="d-name" required help="As shown on photo ID."><Input id="d-name" placeholder="Jane Mary Citizen" /></FieldShell>
                <FieldShell label="AU phone" htmlFor="d-tel"><Input id="d-tel" placeholder="04XX XXX XXX" inputMode="tel" /></FieldShell>
                <FieldShell label="Date (Australian picker)" htmlFor="d-date"><Input id="d-date" type="date" /></FieldShell>
              </Demo>
              <Demo title="Currency, percentage & textarea">
                <FieldShell label="Gift amount" htmlFor="d-money">
                  <span className="relative block"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink/40" aria-hidden>$</span><Input id="d-money" className="pl-7" inputMode="numeric" placeholder="5,000" /></span>
                </FieldShell>
                <FieldShell label="Percentage" htmlFor="d-pct">
                  <span className="relative block"><Input id="d-pct" className="pr-8" inputMode="numeric" placeholder="50" /><span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink/40" aria-hidden>%</span></span>
                </FieldShell>
                <FieldShell label="Life story" htmlFor="d-ta"><Textarea id="d-ta" placeholder="Tell us what matters…" /></FieldShell>
              </Demo>
              <Demo title="Address (state defaults QLD)">
                <div className="grid grid-cols-[1fr_90px] gap-2">
                  <Input aria-label="Suburb" placeholder="Suburb" />
                  <Select aria-label="State" defaultValue="QLD">{["QLD","NSW","VIC","SA","WA","TAS","NT","ACT"].map((s) => <option key={s}>{s}</option>)}</Select>
                </div>
                <Input aria-label="Postcode" placeholder="Postcode" inputMode="numeric" />
              </Demo>
              <Demo title="Select, toggle & combobox (searchable, keyboard nav)">
                <Select aria-label="Relationship" defaultValue="spouse"><option value="spouse">Spouse / partner</option><option>Sibling</option><option>Friend</option></Select>
                <div className="flex items-center gap-3">
                  <button type="button" role="switch" aria-checked={toggle} aria-label="Toggle option" onClick={() => setToggle(!toggle)} className={cn("relative h-6 w-11 rounded-full transition-colors", toggle ? "bg-eucalyptus" : "bg-ink/20")}>
                    <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", toggle ? "left-[22px]" : "left-0.5")} />
                  </button>
                  <span className="text-sm">{toggle ? "Included in will" : "Excluded"}</span>
                </div>
                <ComboBox id="d-combo" label="Suburb (combobox)" options={["Ashgrove","Bardon","Chelmer","Kenmore Hills","Paddington","Toowong","Wynnum","Manly"]} value={combo} onChange={setCombo} />
              </Demo>
              <Demo title="Radio cards & checkbox cards">
                <div className="grid grid-cols-2 gap-2">
                  {["single","married"].map((v) => (
                    <label key={v} className={cn("flex cursor-pointer items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-sm", radio === v ? "border-eucalyptus bg-eucalyptus/8" : "border-ink/12 bg-white")}>
                      <input type="radio" name="d-radio" checked={radio === v} onChange={() => setRadio(v)} className="h-4 w-4 accent-eucalyptus" />{v[0].toUpperCase() + v.slice(1)}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["home","super","bank","business"].map((v) => (
                    <label key={v} className={cn("flex cursor-pointer items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-sm", checks.includes(v) ? "border-eucalyptus bg-eucalyptus/8" : "border-ink/12 bg-white")}>
                      <input type="checkbox" checked={checks.includes(v)} onChange={(e) => setChecks(e.target.checked ? [...checks, v] : checks.filter((x) => x !== v))} className="h-4 w-4 accent-eucalyptus" />{v}
                    </label>
                  ))}
                </div>
              </Demo>
              <Demo title="Repeater — drag to reorder (layout animations)" hint="Drag any card; framer-motion springs it into place">
                <RepeaterDemo />
              </Demo>
            </div>
          </section>

          {/* ALLOCATOR */}
          <section id="allocator" aria-labelledby="alloc-h">
            <h2 id="alloc-h" className="font-display text-2xl font-semibold text-ink">Percentage allocator</h2>
            <p className="mb-4 mt-1 text-sm text-ink/60">Sliders drive a live donut; leaving 100% shakes gently until it balances.</p>
            <Card className="p-6">
              <PercentAllocator
                items={alloc}
                onChange={(id, v) => setAlloc((a) => a.map((x) => (x.id === id ? { ...x, value: v } : x)))}
                onRemove={(id) => setAlloc((a) => a.filter((x) => x.id !== id))}
                onAdd={() => setAlloc((a) => [...a, { id: Math.random().toString(36).slice(2, 7), label: "New beneficiary", sub: "", value: 0 }])}
              />
            </Card>
          </section>

          {/* PROGRESS */}
          <section id="progress" aria-labelledby="progress-h">
            <h2 id="progress-h" className="font-display text-2xl font-semibold text-ink">Progress &amp; direction-aware steps</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Demo title="Progress bar + completion rings">
                <ProgressBar value={64} label="Questionnaire" />
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-sm"><CompletionRing done size={20} /> done</span>
                  <span className="flex items-center gap-1.5 text-sm"><CompletionRing current size={20} /> current</span>
                  <span className="flex items-center gap-1.5 text-sm text-ink/50"><CompletionRing size={20} /> upcoming</span>
                </div>
                <AnimatedCheck size={48} />
                <p className="text-sm">Tweened counters: <CountUp value={11400} format={(v) => `${Math.round(v).toLocaleString()}+ wills`} className="font-bold text-eucalyptus" /> · <AnimatedMoney value={349} className="font-bold text-eucalyptus" /></p>
              </Demo>
              <Demo title="Direction-aware transitions (Back reverses)" hint="Outgoing slides left 24px, incoming from right — and mirror on Back">
                <div className="overflow-hidden rounded-xl border border-ink/10 bg-white p-4">
                  <DirSlide k={String(step)} dir={dir}>
                    <p className="py-6 text-center font-semibold">Step {step + 1} — {["About you","Relationship","Children"][step]}</p>
                  </DirSlide>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setDir(-1); setStep((s) => Math.max(0, s - 1)); }}>Back</Button>
                  <Button size="sm" onClick={() => { setDir(1); setStep((s) => Math.min(2, s + 1)); }}>Continue</Button>
                </div>
              </Demo>
            </div>
          </section>

          {/* FEEDBACK */}
          <section id="feedback" aria-labelledby="feedback-h">
            <h2 id="feedback-h" className="font-display text-2xl font-semibold text-ink">Feedback</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Demo title="Callouts (flag callout pulses once, then static)">
                <Callout tone="info">Your answers autosave as you type.</Callout>
                <Callout tone="warning">Superannuation does not automatically form part of your estate.</Callout>
                <Callout tone="lawyer">A blended family was detected — a lawyer checks the wording before approval.</Callout>
                <Callout tone="danger">Shares must total exactly 100% before you can continue.</Callout>
              </Demo>
              <Demo title="Overlays, toasts, skeletons">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setModal(true)}>Open modal</Button>
                  <Button size="sm" variant="outline" onClick={() => setDrawer(true)}>Open drawer</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.push({ title: "Step complete", body: "Children & dependants saved.", tone: "success" })}>Fire toast</Button>
                  <Button size="sm" variant="outline" onClick={() => setOverlay(true)}>Completion overlay</Button>
                </div>
                <SkeletonCard />
                <SkeletonText lines={2} />
              </Demo>
            </div>
            <Modal open={modal} onClose={() => setModal(false)} title="A calm modal">
              <p className="text-sm text-ink/70">Esc, the backdrop, and the × all close it. 300ms ease-out spring.</p>
              <Button className="mt-4" onClick={() => setModal(false)}>Got it</Button>
            </Modal>
            <Drawer open={drawer} onClose={() => setDrawer(false)} title="Right-hand drawer">
              <p className="text-sm text-ink/70">Used for matter quick-views in the lawyer console. Spring-snapped at 300/32.</p>
            </Drawer>
            <CompletionOverlay open={overlay} onCta={() => setOverlay(false)} title="Your questionnaire is complete" body="No confetti — just a soft bloom and a drawn checkmark, fitting the subject matter." ctaLabel="Review your answers" />
          </section>

          {/* DATA */}
          <section id="data" aria-labelledby="data-h">
            <h2 id="data-h" className="font-display text-2xl font-semibold text-ink">Data display</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Demo title="Status badges & review accordion">
                <div className="flex flex-wrap gap-1.5">
                  {(["draft","awaiting_payment","in_review","changes_requested","approved","issued"] as const).map((s) => <StatusPill key={s} status={s} />)}
                </div>
                {["Your relationship","Children & dependants"].map((s, i) => (
                  <details key={s} className="rounded-xl border border-ink/10 bg-white px-4 py-2.5 open:pb-3">
                    <summary className="cursor-pointer text-sm font-semibold">{s}</summary>
                    <p className="mt-2 text-xs text-ink/60">Summary rows for section {i + 2} appear here with EDIT links back to the wizard.</p>
                  </details>
                ))}
              </Demo>
              <Demo title="Timeline & staggered lists (40ms stagger)">
                <Timeline items={[
                  { title: "Questionnaire submitted", time: "Mon 9:41", state: "done" },
                  { title: "Paid — Standard Will", time: "Mon 9:52", state: "done" },
                  { title: "Lawyer review", state: "current", body: "Grace Liu is reviewing" },
                  { title: "Approval & issue", state: "upcoming" },
                ]} />
                <Stagger className="grid grid-cols-2 gap-2">
                  {[1,2,3,4].map((n) => <StaggerItem key={n}><div className="rounded-xl bg-white p-3 text-center text-sm font-semibold">Fade-up {n}</div></StaggerItem>)}
                </Stagger>
              </Demo>
            </div>
            <div className="mt-3">
              <Demo title="Data table — sort, filter, search, paginate" hint="Click headers to sort; search filters live">
                <DataTable
                  caption="Matters"
                  pageSize={3}
                  rows={tableRows}
                  columns={[
                    { key: "ref", label: "Reference", sortable: true },
                    { key: "client", label: "Client", sortable: true, render: (r) => <span className="flex items-center gap-2"><Avatar name={String(r.client)} color="#1F3352" size="sm" />{String(r.client)}</span> },
                    { key: "status", label: "Status", sortable: true, render: (r) => <Badge tone="sky">{String(r.status)}</Badge> },
                    { key: "updated", label: "Updated", sortable: true, align: "right" },
                  ]}
                />
              </Demo>
            </div>
          </section>

          {/* KANBAN */}
          <section id="kanban" aria-labelledby="kanban-h">
            <h2 id="kanban-h" className="font-display text-2xl font-semibold text-ink">Kanban board</h2>
            <p className="mb-4 mt-1 text-sm text-ink/60">
              Drag cards between columns — spring snapping, async accept/reject (rejection snaps the card back).{" "}
              <button type="button" className="font-semibold text-eucalyptus underline" onClick={() => setBoardKey((k) => k + 1)}>Reset</button>
            </p>
            <KanbanBoard
              key={boardKey}
              columns={[
                { id: "todo", title: "Unassigned", items: [{ id: "k1", title: "MW-2026-0144 · Clark", sub: "Essential · paid 4h ago" }] },
                { id: "review", title: "In review", items: [{ id: "k2", title: "MW-2026-0138 · Walker", sub: "Daniel" }, { id: "k3", title: "MW-2026-0136 · Brown", sub: "Grace · flagged" }] },
                { id: "signoff", title: "Await sign-off", items: [] },
                { id: "done", title: "Approved", items: [{ id: "k4", title: "MW-2026-0122 · Wilson", sub: "Ready to issue" }] },
              ]}
              onDropItem={async () => true}
            />
          </section>

          {/* DOCUMENTS */}
          <section id="documents" aria-labelledby="docs-h">
            <h2 id="docs-h" className="font-display text-2xl font-semibold text-ink">Clauses — rich text &amp; diff</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <Demo title="Rich-text editor (lawyer overrides)" hint="Bold/italic + one-click {{variable}} insertion">
                <RichTextEditor value={rich} onChange={setRich} variables={["fullName", "executorName", "executorAddress", "residuePrimary"]} />
              </Demo>
              <Demo title="Diff viewer — bank vs override" hint="Inline and split word-level diffs">
                <DiffViewer
                  before="I APPOINT Kate Louise Thompson to be the executor and trustee of this will."
                  after="I APPOINT Kate Louise Thompson and Peter Thompson JOINTLY to be the executors and trustees of this will."
                />
                <DiffViewer
                  mode="split"
                  before="I GIVE the whole of my residuary estate to my wife."
                  after="I GIVE the whole of my residuary estate to my wife, Kate Louise Thompson, absolutely."
                />
              </Demo>
            </div>
            <div className="mt-3">
              <Demo title="Empty state & avatars">
                <div className="flex items-center gap-2">
                  <Avatar name="Margaret Holloway" color="#1F3352" /><Avatar name="Grace Liu" color="#7FA6A0" /><Avatar name="Oliver Brown" color="#B08D2E" size="lg" />
                  <Badge tone="green"><Check className="h-3 w-3" aria-hidden /> verified</Badge>
                  <Badge tone="gold"><Bell className="h-3 w-3" aria-hidden /> awaiting</Badge>
                </div>
                <EmptyState icon={<Sparkles className="h-6 w-6" aria-hidden />} title="No wills yet" body="Start your first will — it takes about 20 minutes." action={<Button size="sm">Start</Button>} />
              </Demo>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* Drag-to-reorder repeater demo */
import { motion as fm, AnimatePresence as AP } from "framer-motion";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState as useState2 } from "react";

function RepeaterDemo() {
  const [items, setItems] = useState2([{ id: "1", name: "Ruby Thompson" }, { id: "2", name: "Max Thompson" }, { id: "3", name: "Peter Thompson" }]);
  const [drag, setDrag] = useState2<string | null>(null);
  return (
    <div className="space-y-2">
      <AP initial={false}>
        {items.map((item) => (
          <fm.div
            key={item.id}
            layout
            draggable
            onDragStart={() => setDrag(item.id)}
            onDragEnd={() => setDrag(null)}
            onDragOver={(e: React.DragEvent) => e.preventDefault()}
            onDrop={() => {
              if (!drag || drag === item.id) return;
              setItems((prev) => {
                const next = prev.filter((x) => x.id !== drag);
                next.splice(next.findIndex((x) => x.id === item.id), 0, prev.find((x) => x.id === drag)!);
                return [...next];
              });
              setDrag(null);
            }}
            className={cn("flex cursor-grab items-center gap-2.5 rounded-xl border border-ink/12 bg-white px-3 py-2.5", drag === item.id && "opacity-60")}
          >
            <GripVertical className="h-4 w-4 text-ink/30" aria-hidden />
            <span className="flex-1 text-sm font-semibold">{item.name}</span>
            <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setItems((p) => p.filter((x) => x.id !== item.id))} className="rounded p-1 text-ink/35 hover:text-danger">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </fm.div>
        ))}
      </AP>
      <Button size="sm" variant="outline" onClick={() => setItems((p) => [...p, { id: Math.random().toString(36).slice(2, 6), name: "New person" }])}>
        <Plus className="h-4 w-4" aria-hidden /> Add person
      </Button>
    </div>
  );
}
