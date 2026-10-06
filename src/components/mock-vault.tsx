"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Building2, Download, FileBadge, FileText, FolderLock, KeyRound, Lock, ScrollText,
  ShieldCheck, Unlock, Upload, UserCheck,
} from "lucide-react";
import { Badge, Button, Card, FieldShell, Input, Select, Textarea, cn } from "@/components/ui";
import { AnimatedCheck, Modal, useToast } from "@/components/design-system";
import { MockNotice } from "@/components/mock-notice";
import { Ribbon } from "@/components/mock-ribbon";

const FILES = [
  { id: "f1", name: "Will — signed original", meta: "Lodged 14 Mar 2026 · verified against issue record", icon: ScrollText, tag: "Original" },
  { id: "f2", name: "Enduring Power of Attorney", meta: "Uploaded by client · 1.4 MB", icon: FileBadge, tag: "Linked" },
  { id: "f3", name: "Advance Health Directive", meta: "Uploaded by client · 900 KB", icon: FileText, tag: "Linked" },
  { id: "f4", name: "Cryptocurrency access memo", meta: "Sealed · released to executor on verified death", icon: KeyRound, tag: "Sealed" },
];

const ACCESS = [
  { name: "Harper Davis", role: "Will-maker", level: "Full access", now: true },
  { name: "Frank Albert Davis", role: "Executor", level: "On death, after verification", now: false },
  { name: "Simon Albert Davis", role: "Substitute executor", level: "On death, after verification", now: false },
  { name: "Moreton & Grey", role: "Custodian firm", level: "Custody only — cannot read sealed items", now: true },
];

const LOG = [
  { who: "Harper Davis", what: "Viewed will (original)", when: "12 Apr 2026, 9:14am" },
  { who: "Moreton & Grey", what: "Lodged signed original into deed room 4B", when: "14 Mar 2026, 4:02pm" },
  { who: "Harper Davis", what: "Uploaded Enduring Power of Attorney", when: "14 Mar 2026, 3:48pm" },
  { who: "System", what: "Vault created on will issue", when: "12 Mar 2026, 11:30am" },
];

export function MockVault() {
  const [unlocked, setUnlocked] = useState(false);
  const [retrieval, setRetrieval] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ reason: "Updating my will", who: "Me (will-maker)", notes: "" });
  const reduce = useReducedMotion();
  const toast = useToast();

  return (
    <>
      <Ribbon
        title="Secure Document Vault"
        blurb="One encrypted place for the signed original and everything around it. Executors see only what you allow, when you allow it."
      />

      {/* Lock animation */}
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setUnlocked((v) => !v)}
          className="flex w-full items-center gap-5 bg-eucalyptus px-6 py-6 text-left text-paper"
          aria-expanded={unlocked}
        >
          <motion.span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-paper/15"
            animate={reduce ? undefined : unlocked ? { rotate: [0, -12, 0], scale: [1, 1.08, 1] } : { rotate: 0 }}
            transition={{ duration: 0.5 }}
            aria-hidden
          >
            {unlocked ? <Unlock className="h-8 w-8 text-gold" /> : <Lock className="h-8 w-8" />}
          </motion.span>
          <div className="flex-1">
            <p className="font-display text-xl font-semibold">
              {unlocked ? "Vault open" : "Vault sealed"} — Harper Davis
            </p>
            <p className="text-sm text-paper/70">
              {unlocked ? "Contents visible for this session. Tap to re-seal." : "Tap to unlock with your passkey (mock)."}
            </p>
          </div>
          <Badge tone="gold">AES-256 · concept</Badge>
        </button>

        <motion.div
          initial={false}
          animate={{ height: unlocked ? "auto" : 0, opacity: unlocked ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <ul className="divide-y divide-ink/5 px-6">
            {FILES.map((f) => (
              <li key={f.id} className="flex items-center gap-3.5 py-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand text-eucalyptus" aria-hidden>
                  <f.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{f.name}</p>
                  <p className="truncate text-xs text-ink/55">{f.meta}</p>
                </div>
                <Badge tone={f.tag === "Sealed" ? "red" : f.tag === "Original" ? "green" : "neutral"}>{f.tag}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={f.tag === "Sealed"}
                  onClick={() => toast.push({ title: "Certified copy requested", body: `${f.name} — a certified copy would be posted within 3 business days.`, tone: "info" })}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden /> Certified copy
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 px-6 pb-5">
            <Button size="sm" variant="outline" onClick={() => toast.push({ title: "Upload disabled in mock", body: "File upload is illustrative only in this prototype.", tone: "warning" })}>
              <Upload className="h-4 w-4" aria-hidden /> Upload a document
            </Button>
            <Button size="sm" onClick={() => setRetrieval(true)}>
              <FolderLock className="h-4 w-4" aria-hidden /> Request retrieval of the original
            </Button>
          </div>
        </motion.div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Building2 className="h-5 w-5 text-eucalyptus" aria-hidden /> Where it&rsquo;s kept
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            {[
              ["Location", "Moreton & Grey deed room, Level 12, 240 Queen St, Brisbane"],
              ["Shelf reference", "Deed room 4B · packet MG-2026-0108"],
              ["Lodged", "14 March 2026"],
              ["Conditions", "Fireproof, climate controlled, dual-key access"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="shrink-0 text-ink/55">{k}</dt>
                <dd className="text-right font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <UserCheck className="h-5 w-5 text-eucalyptus" aria-hidden /> Who can access
          </h2>
          <ul className="mt-4 space-y-2.5">
            {ACCESS.map((a) => (
              <li key={a.name} className="flex items-start justify-between gap-3 rounded-xl bg-sand px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{a.name}</p>
                  <p className="text-xs text-ink/55">{a.role}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold", a.now ? "bg-eucalyptus/10 text-eucalyptus" : "bg-ink/8 text-ink/55")}>
                  {a.level}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <ShieldCheck className="h-5 w-5 text-eucalyptus" aria-hidden /> Access log
        </h2>
        <ul className="mt-4 divide-y divide-ink/5">
          {LOG.map((l) => (
            <li key={l.what} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span>
                <strong className="text-ink">{l.who}</strong>
                <span className="text-ink/65"> — {l.what}</span>
              </span>
              <span className="shrink-0 text-xs text-ink/45">{l.when}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={retrieval} onClose={() => { setRetrieval(false); setSent(false); }} title={sent ? "Retrieval requested" : "Request the original will"}>
        {sent ? (
          <div className="text-center">
            <AnimatedCheck size={56} className="mx-auto" />
            <p className="mt-4 text-sm leading-relaxed text-ink/70">
              In the full product this books a collection appointment and notifies the deed room. Identity is
              verified in person before the original leaves custody.
            </p>
            <Button className="mt-5" onClick={() => { setRetrieval(false); setSent(false); }}>Close</Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
              toast.push({ title: "Retrieval request logged", body: "Mock flow — nothing really moves.", tone: "success" });
            }}
          >
            <FieldShell label="Why do you need the original?" htmlFor="rr-reason" required>
              <Select id="rr-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                <option>Updating my will</option>
                <option>Applying for probate</option>
                <option>Moving custody to another firm</option>
                <option>Other</option>
              </Select>
            </FieldShell>
            <FieldShell label="Who will collect it?" htmlFor="rr-who" required>
              <Input id="rr-who" value={form.who} onChange={(e) => setForm({ ...form, who: e.target.value })} />
            </FieldShell>
            <FieldShell label="Anything else?" htmlFor="rr-notes">
              <Textarea id="rr-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={400} />
            </FieldShell>
            <Button type="submit" className="w-full">Submit request</Button>
          </form>
        )}
      </Modal>

      <MockNotice />
    </>
  );
}
