import { ReactNode, useEffect, useMemo, useState } from "react";
import { BaseLayout } from "./BaseLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";
import type { TranslationKeys } from "@/lib/i18n/translations";
import { subscribeCurrentUser } from "@/lib/db";
import type { User } from "@/lib/models";

interface ClientLayoutProps {
  title?: string;
  children: ReactNode;
  /** Умещает контент в viewport без прокрутки страницы (главная клиента). */
  fillViewport?: boolean;
}

const navItems: { href: string; labelKey: TranslationKeys; icon: string }[] = [
  { href: "/client/dashboard", labelKey: "client.nav.home", icon: "🏠" },
  { href: "/client/training", labelKey: "client.nav.training", icon: "🏋️" },
  { href: "/client/subscriptions", labelKey: "client.nav.subscriptions", icon: "🎟️" },
  { href: "/client/messages", labelKey: "client.nav.chat", icon: "💬" },
  { href: "/client/profile", labelKey: "client.nav.profile", icon: "👤" }
];

function formatUserName(profile: User | null, email?: string | null): string | null {
  if (profile) {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
    if (name) return name;
  }
  return email?.trim() || null;
}

export function ClientLayout({ title, children, fillViewport }: ClientLayoutProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, language } = useTranslation();
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      return;
    }
    return subscribeCurrentUser(user.uid, setProfile);
  }, [user?.uid]);

  const displayName = useMemo(
    () => formatUserName(profile, user?.email),
    [profile, user?.email]
  );

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
    <BaseLayout title={title} fillViewport={fillViewport}>
      <div
        className={clsx(
          "flex min-h-0 flex-col",
          fillViewport ? "h-full gap-1.5 overflow-hidden" : "gap-4"
        )}
      >
        <header
          className={clsx(
            "flex shrink-0 items-center justify-between gap-2",
            fillViewport ? "py-0" : "flex-col gap-3 sm:flex-row sm:items-center"
          )}
        >
          <div className="min-w-0">
            <h1 className={clsx("font-bold text-hsc-panel", fillViewport ? "text-base leading-tight" : "text-xl")}>
              HypeSportClub
            </h1>
            {!fillViewport && <p className="text-xs text-slate-600">{subtitle}</p>}
          </div>
          <div
            className={clsx(
              "flex shrink-0 items-center gap-2",
              !fillViewport && "self-end sm:self-auto"
            )}
          >
            {displayName && (
              <span
                className={clsx(
                  "max-w-[120px] truncate font-medium text-hsc-panel sm:max-w-[180px]",
                  fillViewport ? "text-[10px]" : "text-xs sm:text-sm"
                )}
                title={displayName}
              >
                {displayName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className={clsx(
                "flex shrink-0 items-center gap-1 rounded-xl bg-red-50 font-medium text-red-700 transition-colors hover:bg-red-100",
                fillViewport ? "px-2 py-1 text-[10px]" : "gap-1.5 px-3 py-2 text-xs"
              )}
            >
              <span>🚪</span>
              {!fillViewport && <span>{t("common.logout")}</span>}
            </button>
          </div>
        </header>

        <nav
          className={clsx(
            "z-20 shrink-0 overflow-x-auto rounded-2xl bg-[color:var(--hsc-surface)] shadow-sm",
            fillViewport ? "px-1.5 py-1" : "sticky top-0 -mx-1 px-2 py-2"
          )}
        >
          <div className="flex min-w-max gap-0.5 sm:min-w-0 sm:justify-between">
            {navItems.map((item) => {
              const active = router.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex flex-1 min-w-[56px] flex-col items-center rounded-xl font-medium transition-colors",
                    fillViewport ? "px-1.5 py-1 text-[9px]" : "min-w-[72px] px-2 py-1.5 text-[10px] sm:text-xs",
                    active
                      ? "bg-[color:var(--hsc-panel)] text-white"
                      : "text-slate-700 hover:bg-emerald-100/60"
                  )}
                >
                  <span className={clsx("leading-none", fillViewport ? "text-sm" : "text-base sm:text-lg")}>
                    {item.icon}
                  </span>
                  <span className="mt-0.5 whitespace-nowrap">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <main className={fillViewport ? "min-h-0 flex-1 overflow-hidden" : undefined}>{children}</main>
      </div>
    </BaseLayout>
  );
}
