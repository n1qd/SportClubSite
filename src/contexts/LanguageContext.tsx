import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Language } from "@/lib/models";
import { translate, type TranslationKeys } from "@/lib/i18n/translations";

const STORAGE_KEY = "hsc_lang";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys) => string;
  loaded: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readLocalLanguage(): Language {
  if (typeof window === "undefined") return "ru";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "en" ? "en" : "ru";
  } catch {
    return "ru";
  }
}

function writeLocalLanguage(lang: Language) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

const LANGUAGE_EVENT = "hsc:language-changed";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru");
  const [loaded, setLoaded] = useState(false);

  // Первичная инициализация из localStorage (только в браузере).
  useEffect(() => {
    setLanguageState(readLocalLanguage());
    setLoaded(true);
  }, []);

  // Синхронизация между вкладками и компонентами одной страницы.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setLanguageState(e.newValue === "en" ? "en" : "ru");
      }
    };
    const handleLocal = (e: Event) => {
      const lang = (e as CustomEvent<Language>).detail;
      if (lang === "ru" || lang === "en") setLanguageState(lang);
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(LANGUAGE_EVENT, handleLocal as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LANGUAGE_EVENT, handleLocal as EventListener);
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    writeLocalLanguage(lang);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<Language>(LANGUAGE_EVENT, { detail: lang }));
      try {
        document.documentElement.lang = lang;
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Поддерживаем lang-атрибут html в актуальном состоянии.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => translate(language, key),
      loaded
    }),
    [language, setLanguage, loaded]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: "ru",
      setLanguage: () => undefined,
      t: (key) => translate("ru", key),
      loaded: false
    };
  }
  return ctx;
}
