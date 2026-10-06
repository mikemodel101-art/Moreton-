"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, LogOut, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui";
import { Modal } from "@/components/design-system";

const IDLE_MS = 30 * 60 * 1000; // 30 minutes idle
const WARN_MS = 2 * 60 * 1000; // warn 2 minutes before
const REMEMBER_KEY = "mgw-remember-device";

/**
 * Idle session timeout with a warning modal.
 * "Remember this device" extends the idle window to 12 hours.
 */
export function SessionGuard({ signedIn }: { signedIn: boolean }) {
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const lastActivity = useRef(Date.now());
  const router = useRouter();

  const idleWindow = useCallback(() => {
    if (typeof window === "undefined") return IDLE_MS;
    return window.localStorage.getItem(REMEMBER_KEY) === "1" ? 12 * 60 * 60 * 1000 : IDLE_MS;
  }, []);

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();
    setWarning(false);
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    const events = ["mousedown", "keydown", "scroll", "touchstart", "focus"];
    const onActivity = () => {
      if (!warning) lastActivity.current = Date.now();
    };
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, [signedIn, warning]);

  useEffect(() => {
    if (!signedIn) return;
    const tick = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      const limit = idleWindow();
      if (idle > limit) {
        void logoutAction();
        return;
      }
      if (idle > limit - WARN_MS) {
        setWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((limit - idle) / 1000)));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [signedIn, idleWindow]);

  if (!signedIn) return null;

  return (
    <Modal open={warning} onClose={resetTimer} title="Still there?">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-[#7A5C14]" aria-hidden>
          <Clock3 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm leading-relaxed text-ink/75">
            For your security we&rsquo;ll sign you out in{" "}
            <strong className="font-mono text-ink">{secondsLeft}s</strong> because of inactivity. Your
            answers are already saved.
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink/65">
            <input
              type="checkbox"
              className="h-4 w-4 accent-eucalyptus"
              defaultChecked={typeof window !== "undefined" && window.localStorage.getItem(REMEMBER_KEY) === "1"}
              onChange={(e) => {
                if (e.target.checked) window.localStorage.setItem(REMEMBER_KEY, "1");
                else window.localStorage.removeItem(REMEMBER_KEY);
              }}
            />
            Remember this device (stay signed in for 12 hours)
          </label>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Button onClick={resetTimer}>
          <ShieldCheck className="h-4 w-4" aria-hidden /> Keep me signed in
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            void logoutAction();
            router.push("/");
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden /> Sign out now
        </Button>
      </div>
    </Modal>
  );
}
