import { ReactNode } from "react";
import { BaseLayout } from "./BaseLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";

interface TrainerLayoutProps {
  title?: string;
  children: ReactNode;
}

const navItems = [
  { href: "/trainer/dashboard", label: "Расписание", icon: "📅" },
  { href: "/trainer/requests", label: "Заявки", icon: "📝" },
  { href: "/trainer/messages", label: "Чат", icon: "💬" },
  { href: "/trainer/clients", label: "Клиенты", icon: "👥" },
  { href: "/trainer/profile", label: "Профиль", icon: "👤" }
];

export function TrainerLayout({ title, children }: TrainerLayoutProps) {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    try { await logout(); } catch {}
    window.location.href = "/auth/login";
  }

  return (
    <BaseLayout title={title}>
      <div className="flex flex-1 flex-col gap-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-hsc-panel">Панель тренера</h1>
            <p className="text-xs text-slate-600">Расписание и клиенты</p>
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

        <nav className="mt-4 rounded-2xl bg-[color:var(--hsc-surface)] px-3 py-2 shadow-sm">
          <div className="flex justify-between gap-1">
            {navItems.map((item) => {
              const active = router.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex flex-1 flex-col items-center rounded-xl px-2 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-[color:var(--hsc-panel)] text-white"
                      : "text-slate-700 hover:bg-emerald-100/60"
                  )}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
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
