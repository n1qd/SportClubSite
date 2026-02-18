import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getAllUsers, getAllSubscriptions, getAllGroupWorkouts, getAllTrainers } from "@/lib/db";

type Props = AuthedPageProps;

export default function AdminDashboard({ user }: Props) {
  const [stats, setStats] = useState({ users: 0, clients: 0, trainers: 0, admins: 0, subs: 0, workouts: 0, trainersCount: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [u, s, w, t] = await Promise.all([
          getAllUsers(), getAllSubscriptions(), getAllGroupWorkouts(), getAllTrainers()
        ]);
        setStats({
          users: u.length,
          clients: u.filter((x) => x.role === "CLIENT").length,
          trainers: u.filter((x) => x.role === "TRAINER").length,
          admins: u.filter((x) => x.role === "ADMIN").length,
          subs: s.length,
          workouts: w.length,
          trainersCount: t.length
        });
      } catch { /* ignore */ }
    })();
  }, []);

  return (
    <AdminLayout title="Дашборд">
      <div className="space-y-4">
        <Card className="space-y-1">
          <p className="text-xs font-medium text-slate-600">Добро пожаловать, администратор</p>
          <p className="text-lg font-bold text-hsc-panel">{user.email ?? user.uid}</p>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="space-y-1 text-center">
            <div className="text-3xl font-black text-hsc-panel">{stats.users}</div>
            <div className="text-[11px] font-medium text-slate-600">Пользователей</div>
            <div className="text-[10px] text-slate-500">
              {stats.clients} кл. / {stats.trainers} тр. / {stats.admins} адм.
            </div>
          </Card>
          <Card className="space-y-1 text-center">
            <div className="text-3xl font-black text-hsc-panel">{stats.subs}</div>
            <div className="text-[11px] font-medium text-slate-600">Абонементов</div>
          </Card>
          <Card className="space-y-1 text-center">
            <div className="text-3xl font-black text-hsc-panel">{stats.workouts}</div>
            <div className="text-[11px] font-medium text-slate-600">Тренировок</div>
          </Card>
          <Card className="space-y-1 text-center">
            <div className="text-3xl font-black text-hsc-panel">{stats.trainersCount}</div>
            <div className="text-[11px] font-medium text-slate-600">Тренеров</div>
          </Card>
        </div>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-hsc-panel">Быстрые действия</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" href="/admin/clients">Управление пользователями</Button>
            <Button size="sm" variant="secondary" href="/admin/subscriptions">Абонементы</Button>
            <Button size="sm" variant="secondary" href="/admin/workouts">Тренировки</Button>
            <Button size="sm" variant="secondary" href="/admin/trainers">Тренеры</Button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["admin"]);
