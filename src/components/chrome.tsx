import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, LogOut, RotateCcw } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/store";
import { BRAND } from "@/lib/config";
import { Avatar, Logo, cn } from "@/components/ui";
import { NotificationBell, type Notice } from "@/components/extras";
import { timeAgo } from "@/lib/engine";
import { logoutAction } from "@/lib/actions/auth";
import type { ReactNode } from "react";
import type { Role } from "@/lib/types";

const ROLE_LABEL: Record<Role, string> = {
  client: "Client",
  lawyer: "Lawyer",
  senior_lawyer: "Senior Lawyer",
  admin: "Admin",
  observer: "Demo Observer (read-only)",
};

/** Status changes, lawyer messages and documents, newest first. */
function buildNotices(user: { id: string; email: string; role: Role }): Notice[] {
  const visible = db().matters.filter((m) => (user.role === "client" ? m.clientId === user.id : true));
  const ids = new Set(visible.map((m) => m.id));
  const out: Notice[] = [];

  for (const m of visible) {
    if (m.issuedAt) out.push({ id: `n-iss-${m.id}`, kind: "document", title: "Your will has been issued", body: `${m.ref} is ready to download and sign.`, when: timeAgo(m.issuedAt), href: `/app/documents/${m.id}` });
    else if (m.approvedAt) out.push({ id: `n-app-${m.id}`, kind: "status", title: "Your will was approved", body: `${m.ref} passed lawyer review.`, when: timeAgo(m.approvedAt), href: `/status?m=${m.id}` });
    if (m.status === "changes_requested") out.push({ id: `n-chg-${m.id}`, kind: "status", title: "A change was requested", body: `Your lawyer needs a clarification on ${m.ref}.`, when: timeAgo(m.updatedAt), href: `/app/messages/${m.id}` });
    if (m.status === "awaiting_payment") out.push({ id: `n-pay-${m.id}`, kind: "payment", title: "Payment outstanding", body: `${m.ref} is ready for checkout.`, when: timeAgo(m.updatedAt), href: `/checkout?m=${m.id}` });
    if (m.payment) out.push({ id: `n-rcpt-${m.id}`, kind: "payment", title: "Payment received", body: `Receipt for ${m.ref} is available.`, when: timeAgo(m.payment.paidAt), href: `/api/invoice/${m.id}` });
  }

  for (const msg of db().messages.filter((x) => ids.has(x.matterId) && !x.internal && x.fromId !== user.id).slice(-5)) {
    const from = db().users.find((u) => u.id === msg.fromId);
    out.push({
      id: `n-msg-${msg.id}`,
      kind: "message",
      title: `Message from ${from?.name ?? "your lawyer"}`,
      body: msg.body.slice(0, 90),
      when: timeAgo(msg.createdAt),
      href: `/app/messages/${msg.matterId}`,
    });
  }

  return out.slice(0, 12);
}

export async function SiteHeader({ active }: { active?: "home" | "pricing" }) {
  const user = await getSessionUser();
  const home =
    user?.role === "lawyer" || user?.role === "senior_lawyer"
      ? "/lawyer"
      : user?.role === "admin"
        ? "/admin"
        : "/app";
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-sand/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={`${BRAND.firmName} home`}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-ink/70 md:flex" aria-label="Primary">
          <Link href="/#how" className={cn("hover:text-eucalyptus", active === "home" && "text-eucalyptus underline underline-offset-8 decoration-gold decoration-2")}>
            How it works
          </Link>
          <Link href="/pricing" className={cn("hover:text-eucalyptus", active === "pricing" && "text-eucalyptus underline underline-offset-8 decoration-gold decoration-2")}>
            Pricing
          </Link>
          <Link href="/mail" className="inline-flex items-center gap-1.5 hover:text-eucalyptus">
            <Mail className="h-4 w-4" aria-hidden /> Email previews
          </Link>
        </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-ink">
                  <NotificationBell notices={buildNotices(user)} />
                </span>
                <Link
                  href={home}
                className="inline-flex items-center gap-2 rounded-full bg-eucalyptus px-4 py-2 text-sm font-semibold text-paper hover:bg-moss"
              >
                <Avatar name={user.name} color={user.color} size="sm" />
                <span className="hidden sm:inline">{user.name.split(" ")[0]}'s portal</span>
                <span className="sm:hidden">Portal</span>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="rounded-full border border-ink/15 p-2 text-ink/60 hover:bg-ink/5"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-eucalyptus hover:bg-eucalyptus/10">
                Sign in
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-eucalyptus px-4 py-2 text-sm font-semibold text-paper hover:bg-moss"
              >
                Start your will
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export interface ConsoleNavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  exact?: boolean;
}

export async function ConsoleShell({
  title,
  subtitle,
  nav,
  currentPath,
  children,
  allowedRoles,
}: {
  title: string;
  subtitle?: string;
  nav: ConsoleNavItem[];
  currentPath: string;
  children: ReactNode;
  allowedRoles: Role[];
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!allowedRoles.includes(user.role)) {
    redirect(`/403?from=${encodeURIComponent(currentPath)}`);
  }
  const unread = db().mail.filter((m) => m.toEmail === user.email).length;
  const allMail = user.role !== "client";

  return (
    <div className="min-h-screen bg-sand">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-eucalyptus text-paper">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="Back to site">
              <Logo dark />
            </Link>
            <span className="hidden h-6 w-px bg-paper/25 sm:block" aria-hidden />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold leading-tight">{title}</p>
              {subtitle && <p className="truncate text-xs text-paper/60">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <NotificationBell notices={buildNotices(user)} />
            <Link
              href={allMail ? "/mail?all=1" : "/mail"}
              className="relative rounded-full bg-paper/12 p-2.5 hover:bg-paper/20"
              aria-label={`Email previews${unread ? ` (${unread} for you)` : ""}`}
            >
              <Mail className="h-4 w-4" aria-hidden />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">
                  {unread}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2.5 rounded-full bg-paper/12 py-1.5 pl-1.5 pr-4">
              <Avatar name={user.name} color={user.color} size="sm" />
              <div className="leading-tight">
                <p className="text-xs font-bold">{user.name}</p>
                <p className="text-[10px] text-paper/60">{ROLE_LABEL[user.role]}</p>
              </div>
            </div>
            <form action={logoutAction}>
              <button type="submit" aria-label="Sign out" className="rounded-full bg-paper/12 p-2.5 hover:bg-paper/20">
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
        <nav className="border-t border-paper/10" aria-label="Console">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 nice-scroll">
            {nav.map((item) => {
              const active = item.exact ? currentPath === item.href : currentPath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-semibold transition-colors",
                    active
                      ? "border-gold text-paper"
                      : "border-transparent text-paper/60 hover:text-paper"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6">{children}</main>
    </div>
  );
}

export function ResetDemoButton() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink/50">
      <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Admin can reset all demo data from the Admin console.
    </span>
  );
}
