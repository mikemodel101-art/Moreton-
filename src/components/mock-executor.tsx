"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock3, Copy, MapPin, Send, ShieldCheck, UserCheck, Users } from "lucide-react";
import { Badge, Button, Card, Select, Textarea, cn } from "@/components/ui";
import { AnimatedCheck, Modal, Timeline, useToast } from "@/components/design-system";
import { MockNotice } from "@/components/mock-notice";
import { Ribbon } from "@/components/mock-ribbon";

type Status = "accepted" | "informed" | "not_told";

interface Exec {
  id: string;
  name: string;
  role: string;
  email: string;
  status: Status;
}

const INITIAL: Exec[] = [
  { id: "e1", name: "Frank Albert Davis", role: "Primary executor · husband", email: "frank.davis@example.com", status: "accepted" },
  { id: "e2", name: "Simon Albert Davis", role: "Substitute executor · son", email: "simon.davis@example.com", status: "informed" },
  { id: "e3", name: "Megan Joy Hartley", role: "Second substitute · daughter", email: "megan.hartley@example.com", status: "not_told" },
];

const STATUS_META: Record<Status, { label: string; tone: "green" | "gold" | "neutral"; icon: typeof Check }> = {
  accepted: { label: "Accepted", tone: "green", icon: UserCheck },
  informed: { label: "Informed", tone: "gold", icon: Clock3 },
  not_told: { label: "Not yet told", tone: "neutral", icon: Users },
};

const TEMPLATES: Record<string, { label: string; body: (n: string) => string }> = {
  gentle: {
    label: "Gentle and brief",
    body: (n) => `Hi ${n.split(" ")[0]},\n\nI've just finished my will, and I've named you as my executor. There's nothing you need to do now — I just didn't want it to come as a surprise one day.\n\nIt's kept with Moreton & Grey in Brisbane. If you'd like, I can walk you through what the role involves over a cuppa.\n\nThank you. It means a lot.`,
  },
  practical: {
    label: "Practical detail",
    body: (n) => `Hi ${n.split(" ")[0]},\n\nI've named you as executor of my will. Being an executor means, when the time comes, you'd collect my assets, pay any debts, and distribute what's left according to my will. It usually takes a few months of paperwork.\n\nThe original is held by Moreton & Grey, Level 12, 240 Queen Street, Brisbane. They'll guide you through everything.\n\nYou can say no — now or later — so please tell me honestly.`,
  },
  short: {
    label: "Very short",
    body: (n) => `Hi ${n.split(" ")[0]} — I've named you as my executor in my will. Nothing to do for now; the firm holds everything. Happy to explain whenever suits.`,
  },
};

const ACCESS_STEPS = [
  { title: "Notify the firm", body: "The executor contacts Moreton & Grey and provides the death certificate.", state: "done" as const },
  { title: "Identity verification", body: "Photo ID checked against the executor named in the will.", state: "done" as const },
  { title: "Will released", body: "The original is produced and a certified copy issued to the executor.", state: "current" as const },
  { title: "Probate support", body: "The firm assists with the Supreme Court application if instructed.", state: "upcoming" as const },
  { title: "Vault unsealed", body: "Sealed items (such as digital asset memoranda) are released.", state: "upcoming" as const },
];

export function MockExecutorContact() {
  const [execs, setExecs] = useState(INITIAL);
  const [composing, setComposing] = useState<Exec | null>(null);
  const [template, setTemplate] = useState("gentle");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  function openCompose(e: Exec) {
    setComposing(e);
    setTemplate("gentle");
    setBody(TEMPLATES.gentle.body(e.name));
    setSent(false);
  }

  const card = `MY WILL — WHERE IT'S KEPT
Will-maker: Harper Joy Davis
Original held by: Moreton & Grey, Level 12, 240 Queen Street, Brisbane QLD 4000
Phone: (07) 3000 0000
Matter: MW-2026-0108
Executor: Frank Albert Davis
(Prototype card — dummy details.)`;

  return (
    <>
      <Ribbon
        title="Executor Contact"
        blurb="Tell the people you've chosen — gently, and with everything they need. Track who knows, who's agreed, and what happens when the time comes."
      />

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Users className="h-5 w-5 text-eucalyptus" aria-hidden /> Your executors
        </h2>
        <ul className="mt-4 space-y-2.5">
          {execs.map((e) => {
            const m = STATUS_META[e.status];
            return (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{e.name}</p>
                  <p className="text-xs text-ink/55">{e.role} · {e.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={m.tone}>
                    <m.icon className="h-3 w-3" aria-hidden /> {m.label}
                  </Badge>
                  {e.status !== "accepted" && (
                    <Button size="sm" variant={e.status === "not_told" ? "primary" : "outline"} onClick={() => openCompose(e)}>
                      <Send className="h-3.5 w-3.5" aria-hidden /> {e.status === "not_told" ? "Tell them" : "Remind"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <MapPin className="h-5 w-5 text-eucalyptus" aria-hidden /> &ldquo;Where my will is kept&rdquo; card
          </h2>
          <p className="mt-1 text-sm text-ink/60">Share this with anyone who might need it. No private details.</p>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border-2 border-dashed border-eucalyptus/30 bg-eucalyptus/5 p-4 font-mono text-xs leading-relaxed text-ink/80">
{card}
          </pre>
          <Button
            size="sm"
            className="mt-3"
            onClick={async () => {
              try { await navigator.clipboard.writeText(card); } catch { /* sandbox */ }
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
              toast.push({ title: "Card copied", body: "Paste it into a message or print it for the fridge.", tone: "success" });
            }}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Copied" : "Copy card"}
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-eucalyptus" aria-hidden /> Executor access, after death
          </h2>
          <p className="mt-1 text-sm text-ink/60">
            What your executor would actually do to obtain your will.
          </p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => setAccessOpen(true)}>
            Walk through the access flow
          </Button>
          <p className="mt-3 text-xs text-ink/50">
            Nothing is released without a death certificate and verified identity.
          </p>
        </Card>
      </div>

      {/* Compose / send notification */}
      <Modal open={!!composing} onClose={() => setComposing(null)} title={sent ? "Notification sent" : `Tell ${composing?.name.split(" ")[0] ?? ""}`} wide>
        {sent ? (
          <div className="text-center">
            <AnimatedCheck size={56} className="mx-auto" />
            <p className="mt-4 text-sm leading-relaxed text-ink/70">
              Marked as <strong>Informed</strong>. In the prototype this renders as an in-app email preview —
              no real message is sent.
            </p>
            <Button className="mt-5" onClick={() => setComposing(null)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="tpl" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-fern">
                Message template
              </label>
              <Select
                id="tpl"
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value);
                  if (composing) setBody(TEMPLATES[e.target.value].body(composing.name));
                }}
              >
                {Object.entries(TEMPLATES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="msg" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-fern">
                Your message
              </label>
              <Textarea id="msg" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[200px]" />
            </div>
            <div className="rounded-xl bg-sand px-4 py-3 text-xs text-ink/60">
              Will be sent to <strong className="text-ink">{composing?.email}</strong> — rendered as an email
              preview in this prototype.
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!composing) return;
                setExecs((prev) => prev.map((x) => (x.id === composing.id ? { ...x, status: "informed" } : x)));
                setSent(true);
                toast.push({ title: "Marked as informed", body: `${composing.name} has been notified (mock).`, tone: "success" });
              }}
            >
              <Send className="h-4 w-4" aria-hidden /> Send notification
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={accessOpen} onClose={() => setAccessOpen(false)} title="How an executor gets your will" wide>
        <Timeline items={ACCESS_STEPS} />
        <p className="mt-5 rounded-xl bg-sand px-4 py-3 text-xs leading-relaxed text-ink/60">
          Illustrative only. The full product would issue each executor a secure portal invitation with
          step-by-step probate guidance.
        </p>
        <Button className="mt-4" onClick={() => setAccessOpen(false)}>Close</Button>
      </Modal>

      <MockNotice />
    </>
  );
}
