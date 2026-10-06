/** Checklist a reviewing lawyer must complete before a will can be approved. */
export const APPROVAL_CHECKLIST = [
  { key: "identity", label: "Client identity verified (mock VOI)" },
  { key: "capacity", label: "Testamentary capacity considered and noted" },
  { key: "flags", label: "All blocking flags acknowledged or resolved" },
  { key: "execution", label: "Execution instructions attached to the issue pack" },
];

export const QUEUE_TABS = [
  { id: "new", label: "New" },
  { id: "in_review", label: "In review" },
  { id: "awaiting_client", label: "Awaiting client" },
  { id: "ready", label: "Ready to approve" },
  { id: "approved", label: "Approved" },
  { id: "all", label: "All" },
] as const;

export type QueueTab = (typeof QUEUE_TABS)[number]["id"];
