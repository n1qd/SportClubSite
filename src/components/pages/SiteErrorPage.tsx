import Link from "next/link";
import { BaseLayout } from "@/components/layout/BaseLayout";

type Props = {
  statusCode?: number;
  title: string;
  description: string;
  homeHref?: string;
  homeLabel?: string;
};

export function SiteErrorPage({
  statusCode,
  title,
  description,
  homeHref = "/",
  homeLabel = "На главную",
}: Props) {
  return (
    <BaseLayout title={title}>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-hsc-panel to-emerald-900 text-4xl shadow-lg">
          {statusCode === 404 ? "🔍" : "⚠️"}
        </div>
        {statusCode != null && (
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-emerald-700/80">
            {statusCode}
          </p>
        )}
        <h1 className="mb-3 text-2xl font-black text-hsc-panel sm:text-3xl">{title}</h1>
        <p className="mb-8 max-w-md text-sm leading-relaxed text-slate-600">{description}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={homeHref}
            className="rounded-xl bg-hsc-panel px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-800"
          >
            {homeLabel}
          </Link>
          <Link
            href="/auth/login"
            className="rounded-xl border-2 border-emerald-900/20 bg-white px-6 py-3 text-sm font-semibold text-hsc-panel transition hover:bg-emerald-50"
          >
            Вход
          </Link>
        </div>
      </div>
    </BaseLayout>
  );
}
