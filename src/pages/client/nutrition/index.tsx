import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getNutritionHistory } from "@/lib/db";
import type { NutritionHistoryEntry } from "@/lib/models";

type Props = AuthedPageProps;

function formatDate(ts: any) {
  const date = "toDate" in ts ? ts.toDate() : new Date();
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function NutritionPage({ user }: Props) {
  const [items, setItems] = useState<NutritionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getNutritionHistory(user.uid);
        if (!cancelled) setItems(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  return (
    <ClientLayout title="История БЖУ">
      <div className="space-y-4">
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-hsc-panel">
            История расчётов БЖУ
          </h2>
          <p className="text-xs text-slate-700">
            Здесь отображаются результаты, рассчитанные в приложении (Cloud Function
            <code className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-[10px]">
              calculateBMR
            </code>
            ). Веб-версия даёт только просмотр истории, без нового расчёта.
          </p>
        </Card>

        <Card variant="panel" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
            Записи
          </p>

          {loading && (
            <p className="text-xs text-emerald-50">Загрузка истории...</p>
          )}

          {!loading && items.length === 0 && (
            <p className="rounded-xl bg-emerald-950/20 px-3 py-3 text-xs text-emerald-50">
              История пока пуста. Сделайте расчёт в приложении, чтобы увидеть здесь
              результаты.
            </p>
          )}

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {items.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-emerald-50/30 bg-emerald-950/20 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {entry.result.calories} ккал / день
                  </span>
                  <span className="text-[10px] text-emerald-100/80">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <div className="text-emerald-100/70">Белки</div>
                    <div className="font-semibold">
                      {entry.result.protein} г
                    </div>
                  </div>
                  <div>
                    <div className="text-emerald-100/70">Жиры</div>
                    <div className="font-semibold">{entry.result.fat} г</div>
                  </div>
                  <div>
                    <div className="text-emerald-100/70">Углеводы</div>
                    <div className="font-semibold">
                      {entry.result.carbs} г
                    </div>
                  </div>
                  <div>
                    <div className="text-emerald-100/70">BMR</div>
                    <div className="font-semibold">
                      {entry.result.bmr} ккал
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Button size="sm" variant="secondary" href="/client/training">
          Перейти к тренировкам
        </Button>
      </div>
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "admin", "manager"]);

