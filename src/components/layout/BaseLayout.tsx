import { ReactNode } from "react";
import Head from "next/head";

interface BaseLayoutProps {
  title?: string;
  children: ReactNode;
  fillViewport?: boolean;
}

export function BaseLayout({ title, children, fillViewport }: BaseLayoutProps) {
  const pageTitle = title ? `${title} · HypeSportClub` : "HypeSportClub";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-dvh bg-[color:var(--hsc-back)] text-slate-900 dark:text-slate-100">
        <div
          className={
            fillViewport
              ? "mx-auto flex h-dvh max-w-5xl flex-col overflow-hidden px-3 py-2 sm:px-5 sm:py-3"
              : "mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6"
          }
        >
          {children}
        </div>
      </div>
    </>
  );
}

