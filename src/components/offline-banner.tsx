"use client";

import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOnline } from "@/components/design-system";

export function OfflineBanner() {
  const online = useOnline();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: 60 }}
          animate={{ y: 0 }}
          exit={{ y: 60 }}
          role="status"
          aria-live="assertive"
          className="fixed bottom-0 left-0 right-0 z-[90] flex items-center justify-center gap-2.5 bg-clay px-4 py-2.5 text-sm font-semibold text-white no-print"
        >
          <WifiOff className="h-4 w-4" aria-hidden />
          You&rsquo;re offline — your answers are saved locally and will sync when you&rsquo;re back.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
