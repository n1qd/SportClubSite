import Link from "next/link";
import { useRouter } from "next/router";
import clsx from "clsx";

export interface BottomTabNavItem {
  href: string;
  label: string;
  icon: string;
}

interface BottomTabNavProps {
  items: BottomTabNavItem[];
}

/** Нижняя панель разделов, всегда прижата к низу окна браузера. */
export function BottomTabNav({ items }: BottomTabNavProps) {
  const router = useRouter();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-900/10 bg-[color:var(--hsc-surface)] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto flex max-w-5xl justify-between gap-0.5 px-2 pt-2">
        {items.map((item) => {
          const active = router.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors sm:px-2 sm:text-xs",
                active
                  ? "bg-[color:var(--hsc-panel)] text-white"
                  : "text-slate-700 hover:bg-emerald-100/60"
              )}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="mt-0.5 max-w-full truncate text-center leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Отступ контента, чтобы его не перекрывала нижняя панель. */
export const bottomTabNavSpacerClass = "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]";

export function hasBottomTabNav(pathname: string): boolean {
  return pathname.startsWith("/trainer") || pathname.startsWith("/admin");
}

/** Правый нижний угол над нижней панелью. */
export const themeToggleBottomOverNavClass =
  "bottom-[calc(max(0.55rem,env(safe-area-inset-bottom,0px)))]";
