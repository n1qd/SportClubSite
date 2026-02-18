import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getAvailableSubscriptions,
  getUserSubscriptions
} from "@/lib/db";
import type { Subscription, UserSubscription } from "@/lib/models";

type Props = AuthedPageProps;

function formatDate(ts: any) {
  if (!ts) return "—";
  const date = "toDate" in ts ? ts.toDate() : new Date();
  return date.toLocaleDateString("ru-RU", {
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

function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU") + " ₽";
}

export default function SubscriptionsPage({ user }: Props) {
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
        if (!cancelled) setError(e?.message ?? "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.uid]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const activeMine = mine.filter((s) => s.active && remainingDays(s.endDate) > 0);

  return (
    <ClientLayout title="Абонементы">
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
          <Card className="text-xs text-slate-700">Загрузка абонементов...</Card>
        ) : (
          <>
            {/* Мои абонементы */}
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">
                {activeMine.length > 0
                  ? `Мои абонементы (${activeMine.length})`
                  : "У вас нет активных абонементов"}
              </h2>
              {activeMine.length === 0 && (
                <p className="text-xs text-slate-700">
                  Выберите подходящий абонемент ниже.
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
                            {days === 1 ? "день" : days < 5 ? "дня" : "дней"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between border-t border-white/20 pt-2 text-[10px] text-emerald-100">
                        <span>С {formatDate(s.startDate)}</span>
                        <span>До {formatDate(s.endDate)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Доступные абонементы */}
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">
                Доступные абонементы
              </h2>
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Добавить абонемент клиенту может только администратор. Обратитесь в клуб для оформления.
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
                            {sub.durationDays} дней
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-hsc-panel">
                          {formatPrice(sub.price)}
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
