import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getAvailableSubscriptions,
  getUserSubscriptions
} from "@/lib/db";
import type { Subscription, UserSubscription } from "@/lib/models";
import { useTranslation } from "@/contexts/LanguageContext";
import { toUserFacingMessage } from "@/lib/user-facing-error";

type Props = AuthedPageProps;

function formatDate(ts: any, locale: string) {
  if (!ts) return "—";
  const date = "toDate" in ts ? ts.toDate() : new Date();
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function remainingDays(ts: any): number {
  if (!ts) return 0;
  const end = "toDate" in ts ? ts.toDate() : new Date();
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatPrice(price: number, locale: string): string {
  const symbol = locale === "en-US" ? " $" : " ₽";
  return price.toLocaleString(locale) + symbol;
}

export default function SubscriptionsPage({ user }: Props) {
  const { t, language } = useTranslation();
  const locale = language === "en" ? "en-US" : "ru-RU";
  const [available, setAvailable] = useState<Subscription[]>([]);
  const [mine, setMine] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, m] = await Promise.all([
          getAvailableSubscriptions(),
          getUserSubscriptions(user.uid)
        ]);
        if (!cancelled) {
          setAvailable(a);
          setMine(m);
        }
      } catch (e: any) {
        if (!cancelled) setError(toUserFacingMessage(e, language));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.uid, t, language]);

  useEffect(() => {
    if (success) {
      const id = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(id);
    }
  }, [success]);

  const activeMine = mine.filter((s) => s.active && remainingDays(s.endDate) > 0);

  function pluralDays(n: number): string {
    if (language === "en") {
      return n === 1 ? t("client.subs.daysOne") : t("client.subs.daysMany");
    }
    if (n === 1) return t("client.subs.daysOne");
    if (n < 5) return t("client.subs.daysFew");
    return t("client.subs.daysMany");
  }

  return (
    <ClientLayout title={t("client.subs.title")}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {success}
          </div>
        )}

        {loading ? (
          <Card className="text-xs text-slate-700">{t("client.subs.loading")}</Card>
        ) : (
          <>
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">
                {activeMine.length > 0
                  ? `${t("client.subs.myActive")} (${activeMine.length})`
                  : t("client.subs.noneTitle")}
              </h2>
              {activeMine.length === 0 && (
                <p className="text-xs text-slate-700">
                  {t("client.subs.choose")}
                </p>
              )}
              <div className="space-y-2">
                {activeMine.map((s) => {
                  const days = remainingDays(s.endDate);
                  return (
                    <div
                      key={s.id}
                      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-hsc-panel to-emerald-800 px-4 py-3 text-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="text-lg">{s.subscriptionIconEmoji}</div>
                          <div className="text-sm font-bold">{s.subscriptionName}</div>
                          <div className="text-[11px] text-emerald-100">
                            {s.subscriptionDescription}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
                          <div className="text-xl font-black">{days}</div>
                          <div className="text-[10px]">
                            {pluralDays(days)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between border-t border-white/20 pt-2 text-[10px] text-emerald-100">
                        <span>{t("client.subs.fromDate")} {formatDate(s.startDate, locale)}</span>
                        <span>{t("client.subs.untilDate")} {formatDate(s.endDate, locale)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">
                {t("client.subs.available")}
              </h2>
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {t("client.subs.adminHint")}
              </p>
              <div className="space-y-3">
                {available.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-emerald-900/15 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-lg">
                          {sub.iconEmoji}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-hsc-panel">
                            {sub.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {sub.durationDays} {pluralDays(sub.durationDays)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-hsc-panel">
                          {formatPrice(sub.price, locale)}
                        </div>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-700">{sub.description}</p>

                    <ul className="mt-2 space-y-0.5">
                      {sub.features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-1 text-[11px] text-slate-700"
                        >
                          <span className="text-emerald-600">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "admin", "manager"]);
