import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { SiteHeader } from "@/components/chrome";
import { cn } from "@/components/ui";

const NAV = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/will", label: "My will (7 steps)" },
  { href: "/signing-guide", label: "Signing guide" },
  { href: "/referrals", label: "Refer a friend" },
  { href: "/security", label: "Security" },
  { href: "/mail", label: "Email previews" },
  { href: "/extras/storage", label: "Vault (mock)" },
  { href: "/extras/reminders", label: "Reminders (mock)" },
  { href: "/extras/executor-contact", label: "Executor contact (mock)" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/app");

  return (
    <div className="min-h-screen bg-sand">
      <SiteHeader />
      <nav className="border-b border-ink/10 bg-paper" aria-label="Client portal">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 nice-scroll">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap border-b-2 border-transparent px-3.5 py-3 text-sm font-semibold text-ink/60 transition-colors hover:text-eucalyptus"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6">{children}</main>
    </div>
  );
}
