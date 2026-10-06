import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import "./globals.css";
import { BRAND, FLAGS } from "@/lib/config";
import { PrototypeBanner } from "@/components/proto-banner";
import { PersonaSwitcher } from "@/components/persona-switcher";
import { MotionProviders } from "@/components/motion";
import { ToastProvider } from "@/components/design-system";
import { SessionGuard } from "@/components/session-guard";
import { AccessibilityToolbar } from "@/components/extras";
import { OfflineBanner } from "@/components/offline-banner";
import { db } from "@/lib/store";
import { getSessionUser } from "@/lib/auth";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.firmName} — ${BRAND.productName}`,
    template: `%s · ${BRAND.firmName}`,
  },
  description: `${BRAND.tagline} A prototype online wills service for ${BRAND.jurisdiction}.`,
  robots: { index: false, follow: false }, // prototype — never indexable
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const c = BRAND.colors;
  const t = BRAND.tokens;
  const n = t.neutral;
  const personas = db().users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.title ?? null,
    color: u.color,
  }));
  const me = await getSessionUser();

  return (
    <html lang="en-AU" className={`${fraunces.variable} ${publicSans.variable}`}>
      <head>
        {/* Brand tokens injected from config/brand.json — components never hard-code colours */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{
--color-ink:${c.ink};--color-eucalyptus:${c.eucalyptus};--color-moss:${c.moss};--color-fern:${c.fern};
--color-sand:${c.sand};--color-paper:${c.paper};--color-gold:${c.gold};--color-clay:${c.clay};
--color-sky:${c.sky};--color-danger:${c.danger};
--color-primary:${t.primary};--color-primary-hover:${t.primaryHover};--color-secondary:${t.secondary};
--color-accent:${t.accent};--color-success:${t.success};--color-warning:${t.warning};
--color-surface:${t.surface};--color-background:${t.background};
--n50:${n["50"]};--n100:${n["100"]};--n200:${n["200"]};--n300:${n["300"]};--n400:${n["400"]};
--n500:${n["500"]};--n600:${n["600"]};--n700:${n["700"]};--n800:${n["800"]};--n900:${n["900"]};
--radius-sm:${t.radius.sm};--radius-md:${t.radius.md};--radius-lg:${t.radius.lg};--radius-xl:${t.radius.xl};
--shadow-card:${t.shadow.md};--shadow-card-lg:${t.shadow.lg};
--sp-xs:${t.spacing.xs};--sp-sm:${t.spacing.sm};--sp-md:${t.spacing.md};--sp-lg:${t.spacing.lg};--sp-xl:${t.spacing.xl};
}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <MotionProviders>
          <ToastProvider>
            <SessionGuard signedIn={Boolean(me)} />
            <PrototypeBanner />
            <div id="main">{children}</div>
            {FLAGS.demoPersonaSwitcher && (
              <PersonaSwitcher personas={personas} currentUserId={me?.id ?? null} />
            )}
            <AccessibilityToolbar />
            <OfflineBanner />
          </ToastProvider>
        </MotionProviders>
      </body>
    </html>
  );
}
