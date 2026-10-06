"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { submitFeedbackAction } from "@/lib/actions/feedback";
import { Button, Textarea, cn } from "@/components/ui";

/**
 * Per-question feedback + time-on-screen analytics.
 * Only rendered when the Admin has user-testing mode enabled.
 */
export function FeedbackWidget({
  matterId,
  questionId,
  questionLabel,
}: {
  matterId: string | null;
  questionId: string;
  questionLabel: string;
}) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => {
    started.current = Date.now();
    setRating(null);
    setComment("");
    setSent(false);
  }, [questionId]);

  function send(r: "up" | "down", withComment = false) {
    setRating(r);
    if (r === "down" && !withComment) return; // ask for detail first
    void submitFeedbackAction({
      matterId,
      questionId,
      questionLabel,
      rating: r,
      comment,
      ms: Date.now() - started.current,
    });
    setSent(true);
  }

  if (sent) {
    return (
      <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-eucalyptus/8 px-4 py-2.5 text-xs font-semibold text-eucalyptus" role="status">
        <Check className="h-3.5 w-3.5" aria-hidden /> Thanks — that helps us improve this question.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-dashed border-ink/20 bg-paper/60 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink/60">
          <MessageSquare className="h-3.5 w-3.5 text-fern" aria-hidden /> Was this question clear?
          <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#7A5C14]">user testing</span>
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Yes, this question was clear"
            onClick={() => send("up")}
            className={cn("rounded-full border p-2 transition-colors", rating === "up" ? "border-eucalyptus bg-eucalyptus/10 text-eucalyptus" : "border-ink/15 text-ink/50 hover:border-eucalyptus hover:text-eucalyptus")}
          >
            <ThumbsUp className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="No, this question was confusing"
            onClick={() => send("down")}
            className={cn("rounded-full border p-2 transition-colors", rating === "down" ? "border-clay bg-clay/10 text-clay" : "border-ink/15 text-ink/50 hover:border-clay hover:text-clay")}
          >
            <ThumbsDown className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {rating === "down" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3">
              <label htmlFor={`fb-${questionId}`} className="sr-only">What was confusing?</label>
              <Textarea
                id={`fb-${questionId}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What was confusing? (optional, but gold for us)"
                className="min-h-[70px] text-sm"
                maxLength={600}
              />
              <Button size="sm" className="mt-2" onClick={() => send("down", true)}>
                Send feedback
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
