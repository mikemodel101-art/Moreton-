"use client";

import { useOptimistic, useRef, useState, useTransition, useEffect } from "react";
import { Send, Lock } from "lucide-react";
import { sendClientMessageAction } from "@/lib/actions/client";
import { Avatar, Button, Textarea, cn } from "@/components/ui";
import { formatDateTime, timeAgo } from "@/lib/engine";
import type { Role } from "@/lib/types";

export interface ThreadMessage {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  authorName: string;
  authorColor: string;
  authorRole: Role | string;
}

export function MessageThread({
  matterId,
  messages,
  readOnly,
  placeholder,
}: {
  matterId: string;
  messages: ThreadMessage[];
  readOnly: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic<ThreadMessage[], ThreadMessage>(
    messages,
    (state, msg) => [...state, msg]
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [optimistic.length]);

  function send() {
    const body = draft.trim();
    if (body.length < 2) {
      setError("Type a message first.");
      return;
    }
    setError(null);
    setDraft("");
    start(async () => {
      addOptimistic({
        id: "optimistic-" + Date.now(),
        body,
        createdAt: new Date().toISOString(),
        mine: true,
        authorName: "You",
        authorColor: "#1C4634",
        authorRole: "client",
      });
      const r = await sendClientMessageAction(matterId, body);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-ink/10 bg-paper card-shadow">
      <div className="max-h-[52vh] space-y-4 overflow-y-auto px-5 py-6 nice-scroll" aria-live="polite" aria-label="Conversation">
        {optimistic.length === 0 && (
          <p className="py-8 text-center text-sm text-ink/50">
            No messages yet — say hello. Your lawyer replies within one business day (in the prototype,
            instantly into this thread and the mailbox).
          </p>
        )}
        {optimistic.map((m) => (
          <div key={m.id} className={cn("flex gap-3", m.mine && "flex-row-reverse")}>
            <Avatar name={m.authorName} color={m.authorColor} size="sm" />
            <div className={cn("max-w-[80%]", m.mine && "text-right")}>
              <p className="text-[11px] font-semibold text-ink/50">
                {m.authorName}
                {m.authorRole === "lawyer" || m.authorRole === "senior_lawyer" ? " · Lawyer" : ""} ·{" "}
                <time dateTime={m.createdAt} title={formatDateTime(m.createdAt)}>
                  {timeAgo(m.createdAt)}
                </time>
              </p>
              <p
                className={cn(
                  "mt-1 inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed",
                  m.mine ? "bg-eucalyptus text-paper" : "bg-sand text-ink"
                )}
              >
                {m.body}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-ink/10 bg-sand/60 p-4">
        {readOnly ? (
          <p className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-ink/55">
            <Lock className="h-4 w-4" aria-hidden /> Read-only observer view — sign in as a client to
            reply.
          </p>
        ) : (
          <>
            <label htmlFor="composer" className="sr-only">
              Message
            </label>
            <Textarea
              id="composer"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder ?? "Write a message…"}
              className="min-h-[72px]"
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            {error && (
              <p role="alert" className="mt-2 text-xs font-semibold text-danger">
                {error}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-ink/45">{draft.length}/2000 · Ctrl+Enter to send</span>
              <Button type="button" size="sm" onClick={send} loading={pending}>
                <Send className="h-3.5 w-3.5" aria-hidden /> Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
