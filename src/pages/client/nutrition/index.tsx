import { useEffect, useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getNutritionSummary, type DailyNutritionSummary } from "@/lib/db";
import { useTranslation } from "@/contexts/LanguageContext";

type Props = AuthedPageProps;

type Range = "7" | "30";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NutritionPage({ user }: Props) {
  const { t, language } = useTranslation();
  const locale = language === "en" ? "en-US" : "ru-RU";

  const [allSummary, setAllSummary] = useState<DailyNutritionSummary[]>([]);
  const [range, setRange] = useState<Range>("7");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await getNutritionSummary(user.uid, 30);
        if (!cancelled) setAllSummary(summary);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? t("common.error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid, t]);

  const days = parseInt(range, 10);

  const summary = useMemo(() => {
    return allSummary.slice(0, days);
  }, [allSummary, days]);

  const todaySummary = useMemo(() => {
    const tk = todayKey();
    return summary.find((d) => d.date === tk);
  }, [summary]);

  const average = useMemo(() => {
    if (summary.length === 0) return null;
    const totals = summary.reduce(
      (acc, d) => ({
        calories: acc.calories + d.calories,
        proteins: acc.proteins + d.proteins,
        fats: acc.fats + d.fats,
        carbs: acc.carbs + d.carbs,
      }),
      { calories: 0, proteins: 0, fats: 0, carbs: 0 }
    );
    const n = summary.length;
    return {
      days: n,
      calories: totals.calories / n,
      proteins: totals.proteins / n,
      fats: totals.fats / n,
      carbs: totals.carbs / n,
    };
  }, [summary]);

  function formatDayLabel(date: string): string {
    const [y, m, d] = date.split("-").map((s) => parseInt(s, 10));
    if (!y || !m || !d) return date;
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(locale, { day: "2-digit", month: "short", weekday: "short" });
  }

  return (
    <ClientLayout title={t("client.nutrition.title")}>
      <div className="space-y-4">
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-hsc-panel">{t("client.nutrition.diaryTitle")}</h2>
          <p className="text-xs text-slate-700">
            {t("client.nutrition.diaryHint")}
          </p>
        </Card>

        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        {loading ? (
          <Card className="text-xs text-slate-700">{t("client.nutrition.loading")}</Card>
        ) : (
          <>
            {/* Среднее в день */}
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-hsc-panel">
                  {t("client.nutrition.avgTitle")}
                </h3>
                <div className="inline-flex rounded-xl bg-emerald-50 p-1 text-[11px] font-semibold">
                  {(["7", "30"] as Range[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className={`rounded-lg px-3 py-1 transition-colors ${
                        range === r
                          ? "bg-white text-hsc-panel shadow-sm"
                          : "text-slate-600 hover:text-hsc-panel"
                      }`}
                    >
                      {r === "7" ? t("client.nutrition.last7days") : t("client.nutrition.last30days")}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-500">{t("client.nutrition.avgHint")}</p>

              {average ? (
                <div className="rounded-xl bg-gradient-to-r from-hsc-panel to-emerald-800 px-4 py-3 text-white">
                  <div className="text-[11px] uppercase text-emerald-100">
                    {t("client.nutrition.avgTitle")} · {average.days} {t("client.nutrition.daysTracked")}
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-2xl font-black leading-none">{Math.round(average.calories)}</div>
                      <div className="text-[10px] text-emerald-100">{t("common.kcal")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black leading-none">{average.proteins.toFixed(0)}</div>
                      <div className="text-[10px] text-emerald-100">{t("common.proteins")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black leading-none">{average.fats.toFixed(0)}</div>
                      <div className="text-[10px] text-emerald-100">{t("common.fats")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black leading-none">{average.carbs.toFixed(0)}</div>
                      <div className="text-[10px] text-emerald-100">{t("common.carbs")}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl bg-emerald-50 px-3 py-3 text-xs text-slate-700">
                  {t("client.nutrition.noDiaryEntries")}
                </p>
              )}

              {todaySummary && (
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-[11px] font-semibold uppercase text-emerald-800">
                    {t("client.nutrition.todayTotal")}
                  </div>
                  <div className="mt-1 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{Math.round(todaySummary.calories)}</div>
                      <div className="text-[9px] text-slate-500">{t("common.kcal")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{todaySummary.proteins.toFixed(0)}</div>
                      <div className="text-[9px] text-slate-500">{t("common.proteins")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{todaySummary.fats.toFixed(0)}</div>
                      <div className="text-[9px] text-slate-500">{t("common.fats")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{todaySummary.carbs.toFixed(0)}</div>
                      <div className="text-[9px] text-slate-500">{t("common.carbs")}</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* История по дням */}
            <Card className="space-y-2">
              <h3 className="text-sm font-semibold text-hsc-panel">{t("client.nutrition.history")}</h3>

              {summary.length === 0 ? (
                <p className="rounded-xl bg-emerald-50 px-3 py-3 text-xs text-slate-700">
                  {t("client.nutrition.historyEmpty")}
                </p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {summary.map((d) => (
                    <div
                      key={d.date}
                      className="rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-hsc-panel">
                          {Math.round(d.calories)} {t("common.kcal")}
                        </span>
                        <span className="text-[10px] text-slate-500">{formatDayLabel(d.date)}</span>
                      </div>
                      <div className="mt-1 grid grid-cols-4 gap-2 text-[10px]">
                        <div>
                          <div className="text-slate-500">{t("common.proteins")}</div>
                          <div className="font-semibold">{d.proteins.toFixed(0)} {t("common.gramShort")}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">{t("common.fats")}</div>
                          <div className="font-semibold">{d.fats.toFixed(0)} {t("common.gramShort")}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">{t("common.carbs")}</div>
                          <div className="font-semibold">{d.carbs.toFixed(0)} {t("common.gramShort")}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">{t("client.nutrition.entries")}</div>
                          <div className="font-semibold">{d.entries.length}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        <Button size="sm" variant="secondary" href="/client/training">
          {t("client.nutrition.toTraining")}
        </Button>
      </div>
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "admin", "manager"]);
