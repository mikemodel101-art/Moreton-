import type { ComponentProps, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FlagEval, MatterStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

/* ------------------------------ Buttons ------------------------------ */

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "gold" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none";
  const variants: Record<string, string> = {
    primary: "bg-eucalyptus text-paper hover:bg-moss active:translate-y-px",
    secondary: "bg-ink text-paper hover:bg-ink/90 active:translate-y-px",
    gold: "bg-gold text-ink hover:brightness-105 active:translate-y-px",
    danger: "bg-danger text-white hover:brightness-110 active:translate-y-px",
    outline: "border-2 border-eucalyptus text-eucalyptus hover:bg-eucalyptus hover:text-paper",
    ghost: "text-eucalyptus hover:bg-eucalyptus/10",
  };
  const sizes: Record<string, string> = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

/* ------------------------------ Surfaces ------------------------------ */

export function Card({
  className,
  children,
  ...rest
}: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-2xl border border-ink/10 bg-paper card-shadow", className)} {...rest}>
      {children}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "green" | "gold" | "red" | "sky" | "clay";
  className?: string;
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink/8 text-ink/70",
    green: "bg-eucalyptus/12 text-eucalyptus",
    gold: "bg-gold/15 text-[#7A5C14]",
    red: "bg-danger/12 text-danger",
    sky: "bg-sky/20 text-eucalyptus",
    clay: "bg-clay/12 text-clay",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------- Status pills ---------------------------- */

export function StatusPill({ status, className }: { status: MatterStatus; className?: string }) {
  const map: Record<MatterStatus, { tone: "neutral" | "green" | "gold" | "red" | "sky" | "clay"; pulse?: boolean }> = {
    draft: { tone: "neutral" },
    awaiting_payment: { tone: "gold", pulse: true },
    in_review: { tone: "sky", pulse: true },
    changes_requested: { tone: "clay" },
    approved: { tone: "green" },
    issued: { tone: "green" },
  };
  const { tone, pulse } = map[status];
  return (
    <Badge tone={tone} className={className}>
      {pulse && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export const SEVERITY_TONE: Record<string, "red" | "clay" | "gold" | "sky"> = {
  blocker: "red",
  high: "clay",
  medium: "gold",
  info: "sky",
};

export function FlagChip({ flag, showCategory }: { flag: FlagEval; showCategory?: boolean }) {
  return (
    <Badge tone={SEVERITY_TONE[flag.severity] ?? "sky"} className="uppercase">
      <span className="font-mono text-[9px] opacity-70">{flag.severity}</span>
      {showCategory ? `${flag.category}: ` : ""}
      {flag.label}
    </Badge>
  );
}

/* ------------------------------ Avatar ------------------------------ */

export function Avatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-11 w-11 text-sm", xl: "h-16 w-16 text-lg" };
  const ini = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold text-white", sizes[size], className)}
      style={{ background: color }}
      aria-hidden
    >
      {ini}
    </span>
  );
}

/* ------------------------------ Form fields ------------------------------ */

export function FieldShell({
  label,
  htmlFor,
  help,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {help && !error && (
        <p className="mt-1.5 text-xs leading-relaxed text-ink/55" id={`${htmlFor}-help`}>
          {help}
        </p>
      )}
      {error && (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputBase =
  "w-full rounded-xl border-2 border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 transition-colors focus:border-eucalyptus focus:outline-none disabled:bg-sand/60 disabled:text-ink/50 aria-[invalid=true]:border-danger";

export function Input(props: ComponentProps<"input">) {
  return <input className={cn(inputBase, props.className)} {...props} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea className={cn(inputBase, "min-h-[90px]", props.className)} {...props} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select className={cn(inputBase, "appearance-none pr-8", props.className)} {...props} />;
}

/* ------------------------------ Misc ------------------------------ */

export function ProgressBar({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs font-semibold text-ink/60">
        <span>{label ?? "Progress"}</span>
        <span aria-live="polite">{value}%</span>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div
          className="h-full rounded-full bg-eucalyptus transition-[width] duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-ink/15 bg-paper/60 px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-eucalyptus/10 text-eucalyptus">
        {icon}
      </div>
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-ink/60">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          dark ? "bg-paper/12 text-paper" : "bg-eucalyptus text-paper"
        )}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22v-8" />
          <path d="M12 14c0-4 3.5-6.5 8-6.5 0 5-3.5 7.5-8 6.5Z" />
          <path d="M12 11C12 7 8.5 4.5 4 4.5c0 5 3.5 7.5 8 6.5Z" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className={cn("block font-display text-[17px] font-semibold tracking-tight", dark ? "text-paper" : "text-eucalyptus")}>
          Moreton &amp; Grey
        </span>
        <span className={cn("block text-[10px] font-semibold uppercase tracking-[0.18em]", dark ? "text-paper/60" : "text-fern")}>
          Wills Online · QLD
        </span>
      </span>
    </span>
  );
}

export function SectionHeading({
  kicker,
  title,
  intro,
  className,
}: {
  kicker?: string;
  title: string;
  intro?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {kicker && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-clay">{kicker}</p>
      )}
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {intro && <p className="mt-3 text-base leading-relaxed text-ink/65">{intro}</p>}
    </div>
  );
}
