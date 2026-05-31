import { ReactNode } from "react";
import { BaseLayout } from "./BaseLayout";
import { BottomTabNav, bottomTabNavSpacerClass } from "./BottomTabNav";
import { useAuth } from "@/hooks/useAuth";

interface TrainerLayoutProps {
  title?: string;
  children: ReactNode;
}

const navItems = [
  { href: "/trainer/dashboard", label: "Расписание", icon: "📅" },
  { href: "/trainer/schedule", label: "Слоты", icon: "🗓️" },
  { href: "/trainer/messages", label: "Чат", icon: "💬" },
  { href: "/trainer/clients", label: "Клиенты", icon: "👥" },
  { href: "/trainer/profile", label: "Профиль", icon: "👤" }
];

export function TrainerLayout({ title, children }: TrainerLayoutProps) {
  const { logout } = useAuth();

  async function handleLogout() {
    try { await logout(); } catch {}
    window.location.href = "/auth/login";
  }

  return (
    <BaseLayout title={title}>
      <div className={`flex flex-col gap-4 ${bottomTabNavSpacerClass}`}>
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

        <main>{children}</main>
      </div>

      <BottomTabNav items={navItems} />
    </BaseLayout>
  );
}
