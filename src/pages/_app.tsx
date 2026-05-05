import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function HypeSportApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Component {...pageProps} />
      </LanguageProvider>
    </AuthProvider>
  );
}


