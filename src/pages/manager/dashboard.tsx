import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { ManagerLayout } from "@/components/layout/ManagerLayout";
import { Card } from "@/components/ui/Card";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getAllUsers,
  getAllGroupWorkouts,
  getExpenses,
  getRevenues,
  getAllUserSubscriptions,
} from "@/lib/db";
import type { UserSubscription, GroupWorkout } from "@/lib/models";
import { Timestamp } from "firebase/firestore";

type Props = AuthedPageProps;

const GYM_CAPACITY = 50; // условная вместимость зала

export default function ManagerDashboard({ user }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    profit: 0,
    activeSubs: 0,
    upcomingWorkouts: 0,
    occupancyPercent: 0,
    todayParticipants: 0,
    clients: 0,
    trainers: 0,
  });

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadError(null);
        const now = Timestamp.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      let users: Awaited<ReturnType<typeof getAllUsers>> = [];
      let workouts: GroupWorkout[] = [];
      let expenses: Awaited<ReturnType<typeof getExpenses>> = [];
      let revenues: Awaited<ReturnType<typeof getRevenues>> = [];
      let subs: UserSubscription[] = [];

      try {
        users = await getAllUsers();
      } catch (e: any) {
        if (e?.message?.includes("permission") || e?.code === "permission-denied") {
          setLoadError("Нет доступа к списку пользователей. Разверните правила Firestore с правами для роли Руководитель.");
        }
      }
      try {
        workouts = await getAllGroupWorkouts(false);
      } catch {
        /* частичная загрузка */
      }
      try {
        expenses = await getExpenses();
      } catch {
        /* частичная загрузка */
      }
      try {
        revenues = await getRevenues();
      } catch {
        /* частичная загрузка */
      }
      try {
        subs = await getAllUserSubscriptions();
      } catch {
        /* частичная загрузка */
      }

      const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      const activeSubs = subs.filter(
        (s: UserSubscription) => s.active && s.endDate.toMillis() > now.toMillis()
      ).length;
      const upcomingWorkouts = workouts.filter((w: GroupWorkout) => {
        const dt = w.dateTime?.toMillis?.() ?? 0;
        return dt > now.toMillis() && w.active;
      }).length;
      const todaysWorkouts = workouts.filter((w: GroupWorkout) => {
        const dt = w.dateTime?.toDate?.();
        if (!dt) return false;
        return dt >= todayStart && dt <= todayEnd && w.active;
      });
      const todayParticipants = todaysWorkouts.reduce(
        (s, w) => s + (w.participantIds?.length ?? w.currentParticipants ?? 0),
        0
      );
      const occupancyPercent = Math.min(
        100,
        Math.round((todayParticipants / GYM_CAPACITY) * 100)
      );

      setStats({
        totalUsers: users.length,
        totalRevenue,
        totalExpenses,
        profit: totalRevenue - totalExpenses,
        activeSubs,
        upcomingWorkouts,
        occupancyPercent,
        todayParticipants,
        clients: users.filter((u) => u.role === "CLIENT").length,
        trainers: users.filter((u) => u.role === "TRAINER").length,
      });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function fmt(n: number) {
    return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  }

  return (
    <ManagerLayout title="Обзор клуба">
      <div className="space-y-4">
        {/* Приветствие */}
        <Card className="space-y-1">
          <p className="text-xs font-medium text-slate-600">Добро пожаловать</p>
          <p className="text-lg font-bold text-hsc-panel">
            {user.email ?? user.uid}
          </p>
          <p className="text-[11px] text-slate-500">
            Панель управления клубом — актуальные данные из базы
          </p>
        </Card>

        {loadError && (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {loadError}
          </div>
        )}
        {loading ? (
          <Card className="py-8 text-center text-xs text-slate-600">
            Загрузка данных...
          </Card>
        ) : (
          <>
            {/* Финансовые показатели */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="space-y-1 text-center">
                <div className="text-3xl font-black text-hsc-panel">
                  {fmt(stats.totalUsers)}
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  Всего пользователей
                </div>
                <div className="text-[10px] text-slate-500">
                  {stats.clients} кл. / {stats.trainers} тр.
                </div>
              </Card>

              <Card className="space-y-1 text-center">
                <div className="text-3xl font-black text-emerald-600">
                  {fmt(stats.totalRevenue)} ₽
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  Общий доход
                </div>
              </Card>

              <Card className="space-y-1 text-center">
                <div className="text-3xl font-black text-red-500">
                  {fmt(stats.totalExpenses)} ₽
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  Общие расходы
                </div>
              </Card>

              <Card className="space-y-1 text-center">
                <div
                  className={`text-3xl font-black ${
                    stats.profit >= 0 ? "text-hsc-panel" : "text-red-600"
                  }`}
                >
                  {stats.profit >= 0 ? "+" : ""}
                  {fmt(stats.profit)} ₽
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  Прибыль
                </div>
              </Card>
            </div>

            {/* Операционные показатели */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="space-y-1 text-center">
                <div className="text-3xl font-black text-hsc-panel">
                  {stats.activeSubs}
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  Активных абонементов
                </div>
              </Card>

              <Card className="space-y-1 text-center">
                <div className="text-3xl font-black text-hsc-panel">
                  {stats.upcomingWorkouts}
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  Предстоящих тренировок
                </div>
              </Card>

              <Card className="space-y-2 text-center">
                <div className="text-3xl font-black text-hsc-panel">
                  {stats.occupancyPercent}%
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  Загрузка зала сегодня
                </div>
                <div className="mx-auto h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-hsc-panel transition-all"
                    style={{ width: `${stats.occupancyPercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500">
                  {stats.todayParticipants} из {GYM_CAPACITY} мест
                </div>
              </Card>
            </div>

            {/* Быстрые действия */}
            <Card className="space-y-2">
              <h2 className="text-sm font-semibold text-hsc-panel">
                Разделы управления
              </h2>
              <div className="grid gap-2 sm:grid-cols-3">
                <a
                  href="/manager/finance"
                  className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-3 py-2.5 text-xs font-semibold text-hsc-panel transition-colors hover:bg-emerald-50"
                >
                  <span>💰</span> Финансы
                </a>
                <a
                  href="/manager/analytics"
                  className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-3 py-2.5 text-xs font-semibold text-hsc-panel transition-colors hover:bg-emerald-50"
                >
                  <span>📊</span> Аналитика
                </a>
                <a
                  href="/manager/staff"
                  className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white px-3 py-2.5 text-xs font-semibold text-hsc-panel transition-colors hover:bg-emerald-50"
                >
                  <span>👥</span> Персонал
                </a>
              </div>
            </Card>
          </>
        )}
      </div>
    </ManagerLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["manager", "admin"]);
