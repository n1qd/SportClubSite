import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

const STORAGE_KEY = "hsc_theme";
const THEME_EVENT = "hsc:theme-changed";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  loaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readLocalTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function writeLocalTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = readLocalTheme();
    setThemeState(t);
    applyTheme(t);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const t = e.newValue === "dark" ? "dark" : "light";
        setThemeState(t);
        applyTheme(t);
      }
    };
    const handleLocal = (e: Event) => {
      const t = (e as CustomEvent<Theme>).detail;
      if (t === "dark" || t === "light") {
        setThemeState(t);
        applyTheme(t);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(THEME_EVENT, handleLocal as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(THEME_EVENT, handleLocal as EventListener);
    };
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    writeLocalTheme(t);
    applyTheme(t);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: t }));
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      writeLocalTheme(next);
      applyTheme(next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: next }));
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme, loaded }),
    [theme, setTheme, toggleTheme, loaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "light",
      setTheme: () => undefined,
      toggleTheme: () => undefined,
      loaded: false
    };
  }
  return ctx;
}
