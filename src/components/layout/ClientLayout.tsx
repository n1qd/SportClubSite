import { ReactNode } from "react";
import { BaseLayout } from "./BaseLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";

interface ClientLayoutProps {
  title?: string;
  children: ReactNode;
}

const navItems = [
  { href: "/client/dashboard", label: "Главная", icon: "🏋️" },
  { href: "/client/training", label: "Тренировки", icon: "📅" },
  { href: "/client/messages", label: "Чат", icon: "💬" },
  { href: "/client/profile", label: "Профиль", icon: "👤" }
];

export function ClientLayout({ title, children }: ClientLayoutProps) {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // даже при ошибке — перенаправляем
    }
    window.location.href = "/auth/login";
  }

  return (
    <BaseLayout title={title}>
      <div className="flex flex-1 flex-col gap-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-hsc-panel">HypeSportClub</h1>
            <p className="text-xs text-slate-600">
              Управляйте тренировками, БЖУ и абонементами
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            <span>🚪</span>
            <span>Выйти</span>
          </button>
        </header>

        <main className="flex-1">{children}</main>

        <nav className="mt-4 rounded-2xl bg-[color:var(--hsc-surface)] px-2 py-2 shadow-sm">
          <div className="flex justify-between gap-0.5">
            {navItems.map((item) => {
              const active = router.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex flex-1 flex-col items-center rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors sm:text-xs",
                    active
                      ? "bg-[color:var(--hsc-panel)] text-white"
                      : "text-slate-700 hover:bg-emerald-100/60"
                  )}
                >
                  <span className="text-base leading-none sm:text-lg">{item.icon}</span>
                  <span className="mt-0.5">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </BaseLayout>
  );
}
