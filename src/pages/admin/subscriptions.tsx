import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getAllSubscriptions } from "@/lib/db";
import type { Subscription } from "@/lib/models";

type Props = AuthedPageProps;

export default function AdminSubscriptions(_props: Props) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setSubs(await getAllSubscriptions());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminLayout title="Абонементы">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-hsc-panel">Виды абонементов</h2>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Шаблоны настраивает руководитель. Чтобы выдать абонемент клиенту, перейдите в раздел «Клиенты».
            </p>
          </div>
          <Button size="sm" href="/admin/clients">
            Выдать абонемент
          </Button>
        </div>

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка...</Card>
        ) : (
          <Card className="space-y-2">
            {subs.length === 0 && (
              <p className="text-xs text-slate-700">Нет видов абонементов.</p>
            )}
            {subs.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs"
              >
                <div>
                  <span className="mr-1 text-lg">{s.iconEmoji}</span>
                  <span className="font-semibold text-hsc-panel">{s.name}</span>
                  <span className="ml-2 text-slate-500">
                    {s.price.toLocaleString("ru-RU")} ₽ / {s.durationDays} дн.
                  </span>
                  {!s.active && (
                    <span className="ml-2 rounded bg-red-100 px-1 py-0.5 text-[10px] text-red-700">
                      Неактивен
                    </span>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["admin"]);
