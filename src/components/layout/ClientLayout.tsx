import { ReactNode } from "react";
import { BaseLayout } from "./BaseLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";
import type { TranslationKeys } from "@/lib/i18n/translations";

interface ClientLayoutProps {
  title?: string;
  children: ReactNode;
}

const navItems: { href: string; labelKey: TranslationKeys; icon: string }[] = [
  { href: "/client/dashboard", labelKey: "client.nav.home", icon: "🏠" },
  { href: "/client/training", labelKey: "client.nav.training", icon: "🏋️" },
  { href: "/client/subscriptions", labelKey: "client.nav.subscriptions", icon: "🎟️" },
  { href: "/client/messages", labelKey: "client.nav.chat", icon: "💬" },
  { href: "/client/profile", labelKey: "client.nav.profile", icon: "👤" }
];

export function ClientLayout({ title, children }: ClientLayoutProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const { t, language } = useTranslation();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // даже при ошибке — перенаправляем
    }
    window.location.href = "/auth/login";
  }

  const subtitle = t("client.dashboard.headerSubtitle");
  // language is observed so component re-renders on language change; ESLint/TS pacification.
  void language;

  return (
    <BaseLayout title={title}>
      <div className="flex flex-1 flex-col gap-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-hsc-panel">HypeSportClub</h1>
            <p className="text-xs text-slate-600">{subtitle}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 self-end rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 sm:self-auto"
          >
            <span>🚪</span>
            <span>{t("common.logout")}</span>
          </button>
        </header>

        <nav className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-2xl bg-[color:var(--hsc-surface)] px-2 py-2 shadow-sm">
          <div className="flex min-w-max gap-1 sm:min-w-0 sm:justify-between sm:gap-0.5">
            {navItems.map((item) => {
              const active = router.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex flex-1 min-w-[72px] flex-col items-center rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors sm:text-xs",
                    active
                      ? "bg-[color:var(--hsc-panel)] text-white"
                      : "text-slate-700 hover:bg-emerald-100/60"
                  )}
                >
                  <span className="text-base leading-none sm:text-lg">{item.icon}</span>
                  <span className="mt-0.5 whitespace-nowrap">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="flex-1">{children}</main>
      </div>
    </BaseLayout>
  );
}
