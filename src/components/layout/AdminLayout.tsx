import { ReactNode } from "react";
import { BaseLayout } from "./BaseLayout";
import { BottomTabNav, bottomTabNavSpacerClass } from "./BottomTabNav";
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
      <div className={`flex flex-col gap-4 ${bottomTabNavSpacerClass}`}>
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

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <BottomTabNav items={navItems} />
    </BaseLayout>
  );
}
