"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Gavel,
  Info,
  Loader2,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { cn, inputBase } from "./ui";
import { money } from "@/lib/engine";

/* ========================= 1 · TOOL TERM ========================= */

export function Term({ tip, label }: { tip: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-describedby={id}
        aria-expanded={open}
        aria-label={`What does this mean? ${label ?? "Term"}: ${tip}`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex cursor-help items-center gap-1 border-b border-dashed border-fern/60 text-inherit"
      >
        {label && <span className="underline decoration-dotted underline-offset-4">{label}</span>}
        <CircleHelp className="h-3.5 w-3.5 text-fern" aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            id={id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-full left-1/2 z-40 mb-2 w-64 -translate-x-1/2 rounded-xl bg-ink p-3 text-left text-xs font-normal leading-relaxed text-paper card-shadow-lg"
          >
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gold">
              What does this mean?
            </span>
            {tip}
            <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-ink" aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ========================= 2 · CALLOUT ========================= */

const CALLOUT_TONES = {
  info: { icon: Info, cls: "border-sky/50 bg-sky/15 text-ink", iconCls: "text-eucalyptus", label: "Good to know" },
  warning: { icon: AlertTriangle, cls: "border-gold/50 bg-[#FFFBEC] text-ink", iconCls: "text-[#7A5C14]", label: "Please note" },
  lawyer: { icon: Gavel, cls: "border-eucalyptus/30 bg-eucalyptus/8 text-ink", iconCls: "text-eucalyptus", label: "A lawyer will look at this", pulse: true },
  danger: { icon: AlertTriangle, cls: "border-danger/40 bg-danger/8 text-ink", iconCls: "text-danger", label: "Important" },
} as const;

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof CALLOUT_TONES;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const c = CALLOUT_TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "note"}
      className={cn("flex gap-3 rounded-2xl border px-4 py-3.5", c.cls, "pulse" in c && c.pulse && "pulse-once", className)}
    >
      <c.icon className={cn("mt-0.5 h-5 w-5 shrink-0", c.iconCls)} aria-hidden />
      <div className="text-sm leading-relaxed">
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-70">{title ?? c.label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

/* ========================= 3 · OVERLAYS ========================= */

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn("relative w-full rounded-3xl bg-paper p-6 card-shadow-lg", wide ? "max-w-2xl" : "max-w-md")}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            className="absolute inset-0 bg-ink/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-paper card-shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
              <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 nice-scroll">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ========================= 4 · TOASTS ========================= */

export interface Toast {
  id: number;
  title: string;
  body?: string;
  icon?: ReactNode;
  tone?: "success" | "info" | "warning";
}

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const reduce = useReducedMotion();

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-4 z-[85] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite" role="status">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: 40 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-2xl border bg-paper p-3.5 card-shadow-lg",
                t.tone === "warning" ? "border-gold/40" : "border-ink/10"
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-eucalyptus/10 text-eucalyptus">
                {t.icon ?? <Check className="h-4 w-4" aria-hidden />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{t.title}</p>
                {t.body && <p className="text-xs leading-relaxed text-ink/60">{t.body}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ========================= 5 · SKELETONS ========================= */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} aria-hidden className="skeleton h-4" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-ink/10 bg-paper p-5", className)} aria-label="Loading">
      <div className="flex items-center gap-3">
        <div aria-hidden className="skeleton h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div aria-hidden className="skeleton h-4 w-1/3" />
          <div aria-hidden className="skeleton h-3 w-1/2" />
        </div>
      </div>
      <div aria-hidden className="skeleton mt-4 h-3 w-full" />
      <div aria-hidden className="skeleton mt-2 h-3 w-4/5" />
    </div>
  );
}

/* ========================= 6 · COMBOBOX ========================= */

export function ComboBox({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Type to search…",
  allowFreeText = true,
}: {
  id: string;
  label?: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowFreeText?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const listId = `${id}-listbox`;
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [value, options]);

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[hi] ? `${id}-opt-${hi}` : undefined}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(inputBase, "pr-9")}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter" && open && filtered[hi]) { e.preventDefault(); onChange(filtered[hi]); setOpen(false); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden />
      </div>
      <AnimatePresence>
        {open && (filtered.length > 0 || (!allowFreeText && value)) && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute z-40 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-ink/10 bg-paper p-1.5 card-shadow-lg nice-scroll"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-ink/50" role="option" aria-selected={false}>
                No matches
              </li>
            )}
            {filtered.map((opt, i) => (
              <li key={opt} id={`${id}-opt-${i}`} role="option" aria-selected={i === hi}>
                <button
                  type="button"
                  className={cn("w-full rounded-lg px-3 py-2 text-left text-sm", i === hi ? "bg-eucalyptus text-paper" : "hover:bg-sand")}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => { onChange(opt); setOpen(false); }}
                >
                  {opt}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================= 7 · DONUT + PERCENT ALLOCATOR ========================= */

const SEG_COLORS = ["var(--color-eucalyptus)", "var(--color-gold)", "var(--color-sky)", "var(--color-clay)", "var(--color-fern)", "var(--color-moss)", "#D08C60", "#7B7C72"];

export function Donut({
  segments,
  size = 128,
  thickness = 18,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <div className="relative inline-flex items-center justify-center" role="img" aria-label={`Allocation chart: ${segments.map((s) => `${s.label} ${s.value}%`).join(", ")}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(20,28,38,.08)" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((s, i) => {
            const frac = s.value / (total || 1);
            const dash = frac * C;
            const offset = -acc;
            acc += dash;
            if (s.value <= 0) return null;
            return (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={SEG_COLORS[i % SEG_COLORS.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                style={{ transition: "stroke-dashoffset .35s ease-out, stroke-dasharray .35s ease-out" }}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-2xl font-semibold text-ink">{centerValue ?? `${total}%`}</span>
        {centerLabel && <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">{centerLabel}</span>}
      </div>
    </div>
  );
}

export function PercentAllocator({
  items,
  onChange,
  onAdd,
  onRemove,
  addLabel = "Add beneficiary",
  className,
}: {
  items: { id: string; label: string; sub?: string; value: number }[];
  onChange: (id: string, v: number) => void;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  addLabel?: string;
  className?: string;
}) {
  const total = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
  const valid = total === 100;
  const [shakeKey, setShakeKey] = useState(0);
  const wasValid = useRef(valid);
  useEffect(() => {
    if (wasValid.current && !valid) setShakeKey((k) => k + 1);
    wasValid.current = valid;
  }, [valid]);

  return (
    <div className={cn("grid items-start gap-6 sm:grid-cols-[1fr_auto]", className)}>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={item.id} className="rounded-2xl border border-ink/10 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: SEG_COLORS[i % SEG_COLORS.length] }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.label || "Unnamed"}</p>
                  {item.sub && <p className="text-xs text-ink/50">{item.sub}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" aria-label={`Decrease ${item.label} share`} className="rounded-lg border border-ink/15 p-1 hover:bg-sand" onClick={() => onChange(item.id, Math.max(0, item.value - 1))}>
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="w-12 text-center font-mono text-sm font-bold" aria-live="polite">{item.value}%</span>
                <button type="button" aria-label={`Increase ${item.label} share`} className="rounded-lg border border-ink/15 p-1 hover:bg-sand" onClick={() => onChange(item.id, Math.min(100, item.value + 1))}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
                {onRemove && (
                  <button type="button" aria-label={`Remove ${item.label}`} className="ml-1 rounded-lg p-1 text-ink/35 hover:bg-danger/10 hover:text-danger" onClick={() => onRemove(item.id)}>
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={item.value}
              aria-label={`Share percentage for ${item.label}`}
              className="range mt-3"
              style={{ ["--fill" as string]: `${item.value}%` }}
              onChange={(e) => onChange(item.id, Number(e.target.value))}
            />
          </div>
        ))}
        {onAdd && (
          <button type="button" onClick={onAdd} className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-ink/20 px-4 py-2 text-sm font-semibold text-ink/55 hover:border-eucalyptus hover:text-eucalyptus">
            <Plus className="h-4 w-4" aria-hidden /> {addLabel}
          </button>
        )}
      </div>
      <motion.div
        key={shakeKey}
        animate={shakeKey > 0 ? { x: [0, -5, 5, -3, 3, 0] } : undefined}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center gap-2 justify-self-center"
      >
        <Donut segments={items.map((i) => ({ label: i.label || "Unnamed", value: Math.max(0, i.value) }))} centerValue={`${total}%`} centerLabel={valid ? "allocated" : "must be 100%"} />
        <p role="status" className={cn("rounded-full px-3 py-1 text-xs font-bold", valid ? "bg-eucalyptus/10 text-eucalyptus" : "bg-gold/15 text-[#7A5C14]")}>
          {valid ? "Perfect — shares total 100%" : `Shares total ${total}% — adjust to reach 100%`}
        </p>
      </motion.div>
    </div>
  );
}

/* ========================= 8 · DATA TABLE ========================= */

export interface ColumnDef<T extends Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  searchPlaceholder = "Search…",
  pageSize = 8,
  caption,
  emptyText = "Nothing matches.",
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  searchPlaceholder?: string;
  pageSize?: number;
  caption: string;
  emptyText?: string;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows;
    if (needle) out = out.filter((r) => JSON.stringify(r).toLowerCase().includes(needle));
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      out = [...out].sort((a, b) => {
        const av = col?.sortValue ? col.sortValue(a) : String(a[sortKey] ?? "");
        const bv = col?.sortValue ? col.sortValue(b) : String(b[sortKey] ?? "");
        return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * dir;
      });
    }
    return out;
  }, [rows, q, sortKey, dir, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper card-shadow">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 p-3.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" aria-hidden />
          <input
            type="search"
            value={q}
            aria-label="Filter table"
            placeholder={searchPlaceholder}
            className={cn(inputBase, "py-2 pl-9")}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
          />
        </div>
        <p className="text-xs font-semibold text-ink/50">{filtered.length} row{filtered.length === 1 ? "" : "s"}</p>
      </div>
      <div className="overflow-x-auto nice-scroll">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-ink/10 bg-sand/70 text-xs uppercase tracking-wider text-fern">
              {columns.map((c) => {
                const active = sortKey === c.key;
                return (
                  <th key={c.key} scope="col" className={cn("px-4 py-3 font-bold", c.align === "right" && "text-right")} aria-sort={active ? (dir === 1 ? "ascending" : "descending") : undefined}>
                    {c.sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-ink"
                        onClick={() => {
                          if (active) setDir((d) => (d === 1 ? -1 : 1));
                          else { setSortKey(c.key); setDir(1); }
                        }}
                      >
                        {c.label}
                        <span aria-hidden className={cn("text-[9px]", active ? "opacity-100" : "opacity-30")}>{active && dir === -1 ? "▼" : "▲"}</span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {slice.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-ink/50">
                  {emptyText}
                </td>
              </tr>
            )}
            {slice.map((row, i) => (
              <tr key={String(row.id ?? i)} className="align-top hover:bg-sand/40">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3", c.align === "right" && "text-right")}>
                    {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-ink/10 px-4 py-2.5 text-sm">
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold disabled:opacity-40">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Prev
          </button>
          <span className="text-xs text-ink/55" aria-live="polite">
            Page {safePage + 1} of {pages}
          </span>
          <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={safePage >= pages - 1} className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold disabled:opacity-40">
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

/* ========================= 9 · KANBAN ========================= */

export interface KanbanItem {
  id: string;
  title: string;
  sub?: string;
  meta?: ReactNode;
}

export function KanbanBoard({
  columns,
  onDropItem,
  className,
}: {
  columns: { id: string; title: string; tone?: string; items: KanbanItem[] }[];
  onDropItem: (itemId: string, toColumn: string) => Promise<boolean> | boolean;
  className?: string;
}) {
  const [board, setBoard] = useState(columns);
  const [dragId, setDragId] = useState<string | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => setBoard(columns), [columns]);

  async function drop(toColumn: string) {
    if (!dragId) return;
    const from = board.find((c) => c.items.some((i) => i.id === dragId));
    if (!from || from.id === toColumn) return;
    const item = from.items.find((i) => i.id === dragId)!;
    const next = board.map((c) => ({ ...c, items: c.items.filter((i) => i.id !== dragId) }));
    next.find((c) => c.id === toColumn)!.items.push(item);
    setBoard(next);
    const ok = await onDropItem(dragId, toColumn);
    if (ok === false) setBoard(board); // spring snap-back
    setDragId(null);
  }

  return (
    <div className={cn("grid gap-3 overflow-x-auto pb-2 sm:grid-cols-2 lg:grid-cols-[repeat(var(--cols,4),minmax(240px,1fr))]", className)} style={{ ["--cols" as string]: board.length }}>
      {board.map((col) => (
        <section
          key={col.id}
          aria-label={col.title}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => drop(col.id)}
          className={cn("flex min-h-[200px] flex-col rounded-2xl border p-3 transition-colors", dragId ? "border-dashed border-eucalyptus/40 bg-eucalyptus/5" : "border-ink/10 bg-sand/60")}
        >
          <h3 className="mb-3 flex items-center justify-between px-1.5 text-xs font-bold uppercase tracking-widest text-ink/55">
            {col.title}
            <span className="rounded-full bg-ink/8 px-2 py-0.5 text-[10px]">{col.items.length}</span>
          </h3>
          <ul className="flex flex-1 flex-col gap-2">
            {col.items.map((item) => (
              <motion.li
                key={item.id}
                layout={!reduce}
                layoutId={item.id}
                draggable
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => setDragId(null)}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                whileDrag={reduce ? undefined : { scale: 1.03, boxShadow: "0 12px 32px -8px rgba(20,28,38,.35)", cursor: "grabbing" }}
                className={cn("cursor-grab rounded-xl border border-ink/10 bg-paper p-3.5 card-shadow", dragId === item.id && "opacity-70")}
              >
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.sub && <p className="mt-0.5 text-xs text-ink/55">{item.sub}</p>}
                {item.meta && <div className="mt-2">{item.meta}</div>}
              </motion.li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ========================= 10 · DIFF VIEWER ========================= */

type DiffToken = { t: "=" | "+" | "-"; w: string };

export function wordDiff(before: string, after: string): DiffToken[] {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  const n = Math.min(a.length, 400), m = Math.min(b.length, 400);
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffToken[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ t: "=", w: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: "-", w: a[i] }); i++; }
    else { out.push({ t: "+", w: b[j] }); j++; }
  }
  while (i < n) out.push({ t: "-", w: a[i++] });
  while (j < m) out.push({ t: "+", w: b[j++] });
  return out;
}

export function DiffViewer({ before, after, mode = "inline" }: { before: string; after: string; mode?: "inline" | "split" }) {
  const diff = wordDiff(before, after);
  if (mode === "split") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-sand p-3.5 text-sm leading-relaxed">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-fern">Clause bank</p>
          {diff.filter((d) => d.t !== "+").map((d, i) => (
            <span key={i} className={d.t === "-" ? "rounded bg-danger/15 line-through decoration-danger/60" : ""}>{d.w}</span>
          ))}
        </div>
        <div className="rounded-xl bg-eucalyptus/5 p-3.5 text-sm leading-relaxed">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-eucalyptus">Matter override</p>
          {diff.filter((d) => d.t !== "-").map((d, i) => (
            <span key={i} className={d.t === "+" ? "rounded bg-eucalyptus/15 font-medium" : ""}>{d.w}</span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <p className="rounded-xl bg-sand p-3.5 text-sm leading-relaxed">
      {diff.map((d, i) => (
        <span key={i} className={d.t === "-" ? "rounded bg-danger/15 line-through decoration-danger/60" : d.t === "+" ? "rounded bg-eucalyptus/15 font-medium" : ""}>
          {d.w}
        </span>
      ))}
    </p>
  );
}

/* ========================= 11 · RICH TEXT EDITOR ========================= */

export function RichTextEditor({
  value,
  onChange,
  variables = [],
  placeholder = "Start typing…",
  minHeight = 110,
}: {
  value: string;
  onChange: (v: string) => void;
  variables?: string[];
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerText !== value && document.activeElement !== el) {
      el.innerText = value;
    }
  }, [value]);

  const cmd = (c: string) => {
    ref.current?.focus();
    document.execCommand(c, false);
    onChange(ref.current?.innerText ?? "");
  };

  return (
    <div className="rounded-xl border-2 border-ink/15 bg-white focus-within:border-eucalyptus">
      <div className="flex flex-wrap items-center gap-1 border-b border-ink/10 px-2.5 py-1.5" role="toolbar" aria-label="Formatting">
        <button type="button" onClick={() => cmd("bold")} aria-label="Bold" className="rounded px-2 py-1 text-xs font-bold hover:bg-sand">B</button>
        <button type="button" onClick={() => cmd("italic")} aria-label="Italic" className="rounded px-2 py-1 text-xs italic hover:bg-sand">I</button>
        <span className="mx-1 h-4 w-px bg-ink/15" aria-hidden />
        {variables.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => { ref.current?.focus(); document.execCommand("insertText", false, `{{${v}}}`); onChange(ref.current?.innerText ?? ""); }}
            className="rounded-full bg-eucalyptus/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-eucalyptus hover:bg-eucalyptus/20"
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        id={`${id}-editor`}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="rich-editor whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed outline-none"
        style={{ minHeight }}
        onInput={() => onChange(ref.current?.innerText ?? "")}
        onBlur={() => onChange(ref.current?.innerText ?? "")}
      />
    </div>
  );
}

/* ========================= 12 · TIMELINE ========================= */

export function Timeline({
  items,
  className,
}: {
  items: { title: string; body?: string; time?: string; state: "done" | "current" | "upcoming" }[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <ol className={cn("relative space-y-5 pl-8", className)}>
      <motion.span
        aria-hidden
        className="absolute left-[9px] top-1 h-[calc(100%-8px)] w-0.5 origin-top bg-ink/12"
        initial={reduce ? false : { scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {items.map((item) => (
        <li key={item.title} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute -left-8 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2",
              item.state === "done" && "border-eucalyptus bg-eucalyptus text-paper",
              item.state === "current" && "border-gold bg-gold/20",
              item.state === "upcoming" && "border-ink/20 bg-paper"
            )}
          >
            {item.state === "done" && <Check className="h-3 w-3" />}
          </span>
          <p className={cn("text-sm font-semibold", item.state === "upcoming" ? "text-ink/45" : "text-ink")}>
            {item.title}
            {item.time && <span className="ml-2 text-xs font-normal text-ink/50">{item.time}</span>}
          </p>
          {item.body && <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{item.body}</p>}
        </li>
      ))}
    </ol>
  );
}

/* ========================= 13 · ANIMATED BITS ========================= */

export function CompletionRing({ done = false, current = false, size = 22 }: { done?: boolean; current?: boolean; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 22 22" width={size} height={size}>
        <circle cx="11" cy="11" r="9" fill="none" strokeWidth="2.5" className={done || current ? "stroke-eucalyptus" : "stroke-ink/15"} />
        {done && (
          <motion.path
            d="M6.5 11.5l3 3 6-6.5"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-eucalyptus"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}
      </svg>
      {!done && current && <span className="absolute inset-[6px] rounded-full bg-gold" />}
    </span>
  );
}

export function AnimatedCheck({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <motion.circle cx="32" cy="32" r="28" fill="none" strokeWidth="3" className="stroke-eucalyptus" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} />
      <motion.path d="M20 33l8 8 16-17" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="stroke-eucalyptus" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }} />
    </svg>
  );
}

export function CountUp({
  value,
  format,
  suffix,
  prefix,
  className,
}: {
  value: number;
  /** client-to-client only — never pass a function from a Server Component */
  format?: (v: number) => string;
  /** server-safe alternative to format */
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const fmt = format ?? ((v: number) => `${prefix ?? ""}${Math.round(v).toLocaleString()}${suffix ?? ""}`);
  const [text, setText] = useState(fmt(value));
  const prev = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (reduce || from === value) {
      setText(fmt(value));
      return;
    }
    const controls = animate(from, value, {
      duration: 0.5,
      ease: "easeOut",
      onUpdate: (v) => setText(fmt(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);
  return <span className={className}>{text}</span>;
}

export function AnimatedMoney({ value, className }: { value: number; className?: string }) {
  return <CountUp value={value} format={(v) => money(Math.round(v * 100) / 100)} className={className} />;
}

/* ========================= 14 · STAGGER ========================= */

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } }}>
      {children}
    </motion.div>
  );
}

/* ========================= 15 · DIRECTION-AWARE SLIDE ========================= */

const dirVariants = {
  enter: (d: number) => ({ opacity: 0, x: 24 * d }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: -24 * d }),
};

export function DirSlide({ k, dir, children }: { k: string; dir: 1 | -1; children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div
        key={k}
        custom={dir}
        variants={dirVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ========================= 16 · COMPLETION OVERLAY ========================= */

export function CompletionOverlay({
  open,
  title,
  body,
  ctaLabel,
  onCta,
}: {
  open: boolean;
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-eucalyptus p-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute h-[60vmin] w-[60vmin] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(194,155,60,.28), transparent 65%)" }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 1 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
          )}
          <div className="relative">
            <motion.div initial={reduce ? false : { scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }} className="mx-auto w-fit rounded-full bg-paper p-5">
              <AnimatedCheck size={72} />
            </motion.div>
            <motion.h2
              className="mt-7 font-display text-4xl font-semibold text-paper"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {title}
            </motion.h2>
            <motion.p className="mx-auto mt-3 max-w-md text-paper/75" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
              {body}
            </motion.p>
            <motion.button
              type="button"
              onClick={onCta}
              className="mt-8 rounded-full bg-gold px-8 py-3.5 font-bold text-ink hover:brightness-105"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              {ctaLabel}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ========================= 17 · HOOKS ========================= */

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export { Loader2 as Spinner };
