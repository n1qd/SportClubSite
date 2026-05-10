import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/contexts/LanguageContext";

export function ThemeToggleButton() {
  const { theme, toggleTheme, loaded } = useTheme();
  const { t } = useTranslation();

  if (!loaded) return null;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("common.themeLight") : t("common.themeDark")}
      title={isDark ? t("common.themeLight") : t("common.themeDark")}
      className="fixed bottom-4 right-4 z-[100] flex h-12 w-12 items-center justify-center rounded-full border border-emerald-900/15 bg-[color:var(--hsc-surface)] text-lg shadow-lg shadow-emerald-900/10 transition hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hsc-panel focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--hsc-back)] dark:border-white/15 dark:shadow-black/40"
    >
      <span className="sr-only">{isDark ? t("common.themeLight") : t("common.themeDark")}</span>
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
