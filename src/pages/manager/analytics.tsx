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
} from "@/lib/db";
import type { User, GroupWorkout, Expense, Revenue } from "@/lib/models";

type Props = AuthedPageProps;

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const GYM_CAPACITY = 50;

export default function ManagerAnalytics(_props: Props) {
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [workouts, setWorkouts] = useState<GroupWorkout[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [u, w, e, r] = await Promise.all([
          getAllUsers(),
          getAllGroupWorkouts(false),
          getExpenses(),
          getRevenues(),
        ]);
        setUsers(u);
        setWorkouts(w);
        setExpenses(e);
        setRevenues(r);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------- Пользователи ----------
  const clients = users.filter((u) => u.role === "CLIENT");
  const trainers = users.filter((u) => u.role === "TRAINER");

  // ---------- Нагрузка по дням ----------
  const workoutsByDay: number[] = Array(7).fill(0);
  workouts.forEach((w) => {
    const dt = w.dateTime?.toDate?.();
    if (!dt) return;
    // JS: 0=Вс, нам нужно 0=Пн
    const jsDay = dt.getDay();
    const day = jsDay === 0 ? 6 : jsDay - 1;
    workoutsByDay[day]++;
  });
  const maxWorkoutsPerDay = Math.max(1, ...workoutsByDay);

  // ---------- Финансовая сводка (по месяцам) ----------
  interface MonthRow {
    label: string;
    revenue: number;
    expenses: number;
    profit: number;
  }

  function monthKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthLabel(key: string) {
    const MONTHS = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];
    const [y, m] = key.split("-");
    return `${MONTHS[Number(m) - 1]} ${y}`;
  }

  const monthMap = new Map<string, { revenue: number; expenses: number }>();

  revenues.forEach((r) => {
    const dt = r.date?.toDate?.();
    if (!dt) return;
    const k = monthKey(dt);
    const cur = monthMap.get(k) ?? { revenue: 0, expenses: 0 };
    cur.revenue += r.amount;
    monthMap.set(k, cur);
  });

  expenses.forEach((e) => {
    const dt = e.date?.toDate?.();
    if (!dt) return;
    const k = monthKey(dt);
    const cur = monthMap.get(k) ?? { revenue: 0, expenses: 0 };
    cur.expenses += e.amount;
    monthMap.set(k, cur);
  });

  const monthRows: MonthRow[] = Array.from(monthMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .map(([k, v]) => ({
      label: monthLabel(k),
      revenue: v.revenue,
      expenses: v.expenses,
      profit: v.revenue - v.expenses,
    }));

  // ---------- Загрузка зала сегодня ----------
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaysWorkouts = workouts.filter((w) => {
    const dt = w.dateTime?.toDate?.();
    if (!dt) return false;
    return dt >= todayStart && dt <= todayEnd && w.active;
  });

  const todayParticipants = todaysWorkouts.reduce(
    (s, w) => s + (w.participantIds?.length ?? w.currentParticipants ?? 0),
    0
  );

  const occupancy = Math.min(
    100,
    Math.round((todayParticipants / GYM_CAPACITY) * 100)
  );

  function fmt(n: number) {
    return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  }

  return (
    <ManagerLayout title="Аналитика">
      <div className="space-y-4">
        {loading ? (
          <Card className="py-8 text-center text-xs text-slate-600">
            Загрузка данных...
          </Card>
        ) : (
          <>
            {/* Рост пользователей */}
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">
                Пользователи
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
                  <div className="text-2xl font-black text-hsc-panel">
                    {users.length}
                  </div>
                  <div className="text-[10px] font-medium text-slate-600">
                    Всего
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
                  <div className="text-2xl font-black text-hsc-panel">
                    {clients.length}
                  </div>
                  <div className="text-[10px] font-medium text-slate-600">
                    Клиентов
                  </div>
                </div>
                <div className="rounded-xl bg-blue-50 px-3 py-2 text-center">
                  <div className="text-2xl font-black text-blue-600">
                    {trainers.length}
                  </div>
                  <div className="text-[10px] font-medium text-slate-600">
                    Тренеров
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
                  <div className="text-2xl font-black text-amber-600">
                    {users.filter((u) => u.role === "ADMIN" || u.role === "MANAGER").length}
                  </div>
                  <div className="text-[10px] font-medium text-slate-600">
                    Персонал
                  </div>
                </div>
              </div>
            </Card>

            {/* Нагрузка по дням недели */}
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">
                Нагрузка тренировок по дням недели
              </h2>
              <div className="flex items-end gap-2">
                {workoutsByDay.map((count, i) => {
                  const pct = Math.round((count / maxWorkoutsPerDay) * 100);
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-hsc-panel">
                        {count}
                      </span>
                      <div className="w-full max-w-[40px] overflow-hidden rounded-t-lg bg-emerald-100">
                        <div
                          className="w-full rounded-t-lg bg-hsc-panel transition-all"
                          style={{
                            height: `${Math.max(4, pct)}px`,
                            minHeight: "4px",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-600">
                        {DAY_LABELS[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500">
                Всего тренировок в базе: {workouts.length}
              </p>
            </Card>

            {/* Финансовая сводка по месяцам */}
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">
                Финансовая сводка по месяцам
              </h2>
              {monthRows.length === 0 ? (
                <p className="text-xs text-slate-600">
                  Финансовых данных пока нет.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-emerald-900/10 text-left text-[10px] font-semibold text-slate-600">
                        <th className="pb-2 pr-4">Месяц</th>
                        <th className="pb-2 pr-4 text-right">Доходы</th>
                        <th className="pb-2 pr-4 text-right">Расходы</th>
                        <th className="pb-2 text-right">Прибыль</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((row) => (
                        <tr
                          key={row.label}
                          className="border-b border-emerald-900/5"
                        >
                          <td className="py-1.5 pr-4 font-medium text-slate-800">
                            {row.label}
                          </td>
                          <td className="py-1.5 pr-4 text-right text-emerald-600">
                            +{fmt(row.revenue)} ₽
                          </td>
                          <td className="py-1.5 pr-4 text-right text-red-500">
                            -{fmt(row.expenses)} ₽
                          </td>
                          <td
                            className={`py-1.5 text-right font-semibold ${
                              row.profit >= 0
                                ? "text-hsc-panel"
                                : "text-red-600"
                            }`}
                          >
                            {row.profit >= 0 ? "+" : ""}
                            {fmt(row.profit)} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Загрузка зала */}
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">
                Загрузка зала сегодня
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
                  <div className="text-2xl font-black text-hsc-panel">
                    {todaysWorkouts.length}
                  </div>
                  <div className="text-[10px] font-medium text-slate-600">
                    Тренировок сегодня
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
                  <div className="text-2xl font-black text-hsc-panel">
                    {todayParticipants}
                  </div>
                  <div className="text-[10px] font-medium text-slate-600">
                    Участников
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-3 text-center">
                  <div className="text-2xl font-black text-hsc-panel">
                    {occupancy}%
                  </div>
                  <div className="text-[10px] font-medium text-slate-600">
                    Заполненность
                  </div>
                  <div className="mx-auto mt-1 h-2 w-full max-w-[100px] overflow-hidden rounded-full bg-emerald-200">
                    <div
                      className="h-full rounded-full bg-hsc-panel transition-all"
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>
                </div>
              </div>

              {todaysWorkouts.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-600">
                    Расписание на сегодня:
                  </p>
                  {todaysWorkouts.map((w) => {
                    const dt = w.dateTime?.toDate?.();
                    const time = dt
                      ? dt.toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—";
                    return (
                      <div
                        key={w.id}
                        className="flex items-center justify-between rounded-xl border border-emerald-900/10 bg-white px-3 py-1.5 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-hsc-panel">
                            {time}
                          </span>
                          <span className="ml-2 text-slate-700">{w.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {w.participantIds?.length ?? w.currentParticipants ?? 0}
                          /{w.maxParticipants} чел.
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </ManagerLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["manager", "admin"]);
