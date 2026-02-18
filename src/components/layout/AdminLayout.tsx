import { ReactNode } from "react";
import { BaseLayout } from "./BaseLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";

interface AdminLayoutProps {
  title?: string;
  children: ReactNode;
}

const navItems = [
  { href: "/admin/dashboard", label: "Дашборд", icon: "📊" },
  { href: "/admin/clients", label: "Клиенты", icon: "👥" },
  { href: "/admin/subscriptions", label: "Абонементы", icon: "🎫" },
  { href: "/admin/workouts", label: "Тренировки", icon: "📅" },
  { href: "/admin/trainers", label: "Тренеры", icon: "🏃" }
];

export function AdminLayout({ title, children }: AdminLayoutProps) {
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
            <h1 className="text-xl font-bold text-hsc-panel">Панель администратора</h1>
            <p className="text-xs text-slate-600">
              Управление клиентами, абонементами и расписанием
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

        <div className="flex flex-1 flex-col gap-4 md:flex-row">
          <aside className="w-full md:w-56">
            <div className="rounded-2xl bg-[color:var(--hsc-surface)] p-2 shadow-sm">
              {navItems.map((item) => {
                const active = router.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[color:var(--hsc-panel)] text-white"
                        : "text-slate-800 hover:bg-emerald-100/60"
                    )}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </aside>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </BaseLayout>
  );
}
