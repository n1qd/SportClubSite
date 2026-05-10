import { ReactNode } from "react";
import Head from "next/head";

interface BaseLayoutProps {
  title?: string;
  children: ReactNode;
}

export function BaseLayout({ title, children }: BaseLayoutProps) {
  const pageTitle = title ? `${title} · HypeSportClub` : "HypeSportClub";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-[color:var(--hsc-back)] text-slate-900 dark:text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </>
  );
}

