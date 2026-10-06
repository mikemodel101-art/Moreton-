"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StampIcon } from "lucide-react";
import { KanbanBoard, Modal, useToast, type KanbanItem } from "@/components/design-system";
import { Button } from "@/components/ui";
import {
  assignToMeAction,
  approveMatterAction,
  issueMatterAction,
  signOffMatterAction,
} from "@/lib/actions/lawyer";

export interface BoardColumn {
  id: string;
  title: string;
  items: KanbanItem[];
}

type PendingMove = { itemId: string; toColumn: string; title: string } | null;

/**
 * Kanban over the review workflow. Drops map to the same audited actions as the
 * decision rail; anything else springs back (returns false).
 */
export function LawyerBoard({
  columns,
  canAct,
  isSenior,
}: {
  columns: BoardColumn[];
  canAct: boolean;
  isSenior: boolean;
}) {
  const [pendingMove, setPendingMove] = useState<PendingMove>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function describe(itemId: string, toColumn: string): { allowed: boolean; needsConfirm: boolean; action?: () => Promise<{ ok: boolean; error?: string; data?: { needsSignOff?: boolean } }> } {
    if (!canAct) return { allowed: false, needsConfirm: false };
    const matterId = itemId.replace("kb-", "");
    const from = columns.find((c) => c.items.some((i) => i.id === itemId))?.id;

    if (from === "unassigned" && (toColumn === "review" || toColumn === "signoff")) {
      return { allowed: true, needsConfirm: false, action: () => assignToMeAction(matterId) };
    }
    if (from === "review" && toColumn === "signoff" && isSenior) {
      return { allowed: true, needsConfirm: true, action: () => signOffMatterAction(matterId) };
    }
    if (from === "review" && toColumn === "approved") {
      return { allowed: true, needsConfirm: true, action: () => approveMatterAction(matterId) };
    }
    if (from === "approved" && toColumn === "issued") {
      return { allowed: true, needsConfirm: true, action: () => issueMatterAction(matterId) };
    }
    if (from === "unassigned" && toColumn === "approved") {
      return { allowed: false, needsConfirm: false };
    }
    return { allowed: from === toColumn, needsConfirm: false };
  }

  async function handleDrop(itemId: string, toColumn: string): Promise<boolean> {
    const d = describe(itemId, toColumn);
    if (!d.allowed) {
      toast.push({ title: "That move isn't part of the workflow", body: "Use the decision rail on the matter for changes and rejections.", tone: "warning" });
      return false;
    }
    const item = columns.flatMap((c) => c.items).find((i) => i.id === itemId);
    if (d.needsConfirm) {
      setPendingMove({ itemId, toColumn, title: item?.title ?? itemId });
      return false; // revert until confirmed
    }
    if (d.action) {
      const r = await d.action();
      if (!r.ok) {
        toast.push({ title: "Move rejected", body: r.error, tone: "warning" });
        return false;
      }
      toast.push({ title: "Matter moved", body: "Audit log updated.", tone: "success" });
      router.refresh();
      return true;
    }
    return false;
  }

  function confirm() {
    if (!pendingMove) return;
    const d = describe(pendingMove.itemId, pendingMove.toColumn);
    if (!d.action) { setPendingMove(null); return; }
    start(async () => {
      const r = await d.action!();
      if (!r.ok) toast.push({ title: "Action failed", body: r.error, tone: "warning" });
      else if (r.data?.needsSignOff) toast.push({ title: "Senior sign-off requested", body: "The principal has been emailed (preview).", tone: "info" });
      else toast.push({ title: "Done", body: "Status updated and audit-logged.", tone: "success" });
      setPendingMove(null);
      router.refresh();
    });
  }

  return (
    <>
      <KanbanBoard columns={columns} onDropItem={handleDrop} />
      <Modal open={!!pendingMove} onClose={() => setPendingMove(null)} title="Confirm status change">
        <p className="text-sm text-ink/70">
          Move <strong>{pendingMove?.title}</strong> forward? The client (and the audit log) will see the
          new status immediately.
        </p>
        <div className="mt-5 flex gap-2">
          <Button onClick={confirm} loading={pending}>
            <StampIcon className="h-4 w-4" aria-hidden /> Confirm move
          </Button>
          <Button variant="ghost" onClick={() => setPendingMove(null)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
}
