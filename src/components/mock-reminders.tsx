"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Baby, Bell, BellOff, CalendarDays, Clock3, Heart, Home, Landmark, Mail, Plane, Users } from "lucide-react";
import { Badge, Button, Card, Select, cn } from "@/components/ui";
import { Callout, useToast } from "@/components/design-system";
import { MockNotice } from "@/components/mock-notice";
import { Ribbon } from "@/components/mock-ribbon";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const LIFE_EVENTS = [
  { id: "child", icon: Baby, label: "New child or grandchild", advice: "Add them as a beneficiary and review your guardian nomination.", urgent: true },
  { id: "marriage", icon: Heart, label: "Married or entered a civil partnership", advice: "Marriage generally revokes an existing will in Queensland — update immediately.", urgent: true },
  { id: "separation", icon: Users, label: "Separated or divorced", advice: "Divorce affects gifts to a former spouse. Review executors too.", urgent: true },
  { id: "property", icon: Home, label: "Bought or sold property", advice: "Check how the title is held — joint tenancy overrides your will.", urgent: false },
  { id: "business", icon: Landmark, label: "Started or sold a business", advice: "Business interests may need succession directions outside the will.", urgent: false },
  { id: "moved", icon: Plane, label: "Moved interstate or overseas", advice: "Different states and countries have different rules. Worth a check.", urgent: false },
];

const EMAIL_PREVIEW = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;border:1px solid #E5DECC;border-radius:12px;overflow:hidden">
<div style="background:#1F3352;color:#FCFAF5;padding:16px 22px"><strong style="font-size:17px">Moreton &amp; Grey</strong></div>
<div style="padding:20px 22px;font-family:Helvetica,Arial,sans-serif;color:#141C26;font-size:14px;line-height:1.6">
<h2 style="font-family:Georgia,serif;margin:0 0 10px;font-size:19px;color:#1F3352">Your annual will check-in</h2>
<p>Hi Harper, it's been a year since your will was issued. A quick two-minute check:</p>
<ul><li>Have any names, addresses or relationships changed?</li><li>Have you bought or sold property?</li><li>Is your executor still the right person?</li></ul>
<p><a href="#" style="background:#1F3352;color:#FCFAF5;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Review my will</a></p>
<p style="color:#5E6E7E;font-size:12px;margin-top:18px">Nothing changed? Reply "all good" and we'll check in again next year.</p>
</div></div>`;

export function MockReminders() {
  const [on, setOn] = useState(true);
  const [month, setMonth] = useState("March");
  const [checked, setChecked] = useState<string[]>([]);
  const [snoozed, setSnoozed] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const toast = useToast();

  const urgent = LIFE_EVENTS.filter((e) => checked.includes(e.id) && e.urgent);
  const nonUrgent = LIFE_EVENTS.filter((e) => checked.includes(e.id) && !e.urgent);
  const year = new Date().getFullYear() + (MONTHS.indexOf(month) <= new Date().getMonth() ? 1 : 0);

  return (
    <>
      <Ribbon
        title="Annual Review Reminders"
        blurb="A will should grow with your life. Toggle reminders, pick your month, and tell us when something changes — we'll say whether it matters."
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", on ? "bg-eucalyptus/10 text-eucalyptus" : "bg-ink/8 text-ink/40")} aria-hidden>
              {on ? <Bell className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-ink">Annual check-in reminders</p>
              <p className="text-sm text-ink/60">{on ? `Next reminder: ${month} ${year}` : "Currently switched off"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {on && (
              <>
                <label htmlFor="rm-month" className="sr-only">Reminder month</label>
                <Select id="rm-month" value={month} onChange={(e) => setMonth(e.target.value)} className="max-w-[150px] py-2 text-sm">
                  {MONTHS.map((m) => <option key={m}>{m}</option>)}
                </Select>
              </>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label="Annual reminders"
              onClick={() => { setOn(!on); toast.push({ title: on ? "Reminders off" : "Reminders on", body: on ? "We won't nudge you." : `We'll check in each ${month}.`, tone: "success" }); }}
              className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-eucalyptus" : "bg-ink/20")}
            >
              <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all", on ? "left-[22px]" : "left-0.5")} />
            </button>
          </div>
        </div>

        {on && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
            <Button size="sm" variant="outline" onClick={() => setShowEmail((v) => !v)}>
              <Mail className="h-4 w-4" aria-hidden /> {showEmail ? "Hide" : "Preview"} reminder email
            </Button>
            <Button
              size="sm"
              variant={snoozed ? "ghost" : "outline"}
              onClick={() => { setSnoozed(!snoozed); toast.push({ title: snoozed ? "Snooze cleared" : "Snoozed 3 months", tone: "info" }); }}
            >
              <Clock3 className="h-4 w-4" aria-hidden /> {snoozed ? "Snoozed — undo" : "Snooze 3 months"}
            </Button>
          </div>
        )}

        <AnimatePresence>
          {showEmail && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <iframe title="Reminder email preview" sandbox="" srcDoc={EMAIL_PREVIEW} className="mt-4 h-[360px] w-full rounded-xl border border-ink/10 bg-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Has anything changed?</h2>
          <p className="mt-1 text-sm text-ink/60">Tick anything that applies — we&rsquo;ll tell you whether your will needs updating.</p>
          <ul className="mt-4 space-y-2">
            {LIFE_EVENTS.map((e) => {
              const isOn = checked.includes(e.id);
              return (
                <li key={e.id}>
                  <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 transition-colors", isOn ? "border-eucalyptus bg-eucalyptus/8" : "border-ink/10 hover:border-ink/25")}>
                    <input
                      type="checkbox"
                      checked={isOn}
                      className="mt-0.5 h-4 w-4 accent-eucalyptus"
                      onChange={(ev) => setChecked(ev.target.checked ? [...checked, e.id] : checked.filter((x) => x !== e.id))}
                    />
                    <span className="flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <e.icon className="h-4 w-4 text-eucalyptus" aria-hidden /> {e.label}
                      </span>
                      {isOn && <span className="mt-1 block text-xs leading-relaxed text-ink/65">{e.advice}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {urgent.length > 0 && (
            <div className="mt-4">
              <Callout tone="warning" title="Update recommended now">
                {urgent.length} of the things you ticked usually mean your will should be updated soon. In the
                full product this books a review.
              </Callout>
            </div>
          )}
          {urgent.length === 0 && nonUrgent.length > 0 && (
            <div className="mt-4">
              <Callout tone="info">Worth a check at your next annual review — nothing urgent.</Callout>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <CalendarDays className="h-5 w-5 text-eucalyptus" aria-hidden /> Upcoming
          </h2>
          <ul className="mt-4 space-y-2.5">
            {[
              { when: `${month} ${year}`, what: "Annual check-in email", tone: on ? "green" : "neutral" },
              { when: `${month} ${year + 1}`, what: "Annual check-in email", tone: on ? "green" : "neutral" },
              { when: "On life event", what: "Triggered review prompt", tone: "sky" },
              { when: "As enacted", what: "QLD law change notice", tone: "gold" },
            ].map((r) => (
              <li key={r.when + r.what} className="flex items-center justify-between gap-3 rounded-xl bg-sand px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{r.what}</p>
                  <p className="text-xs text-ink/55">{r.when}</p>
                </div>
                <Badge tone={r.tone as "green" | "neutral" | "sky" | "gold"}>{on || r.tone !== "green" ? "Scheduled" : "Paused"}</Badge>
              </li>
            ))}
          </ul>
          {snoozed && <p className="mt-3 rounded-xl bg-gold/15 px-3 py-2 text-xs font-semibold text-[#7A5C14]">Snoozed — next nudge deferred by 3 months.</p>}
        </Card>
      </div>

      <MockNotice />
    </>
  );
}
