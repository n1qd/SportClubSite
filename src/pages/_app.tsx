import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";

export default function HypeSportApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <Component {...pageProps} />
          <ThemeToggleButton />
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}


