import { useEffect, useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getUserSubscriptions,
  getAllGroupWorkouts,
  getTrainingRequests,
} from "@/lib/db";
import type { UserSubscription, GroupWorkout } from "@/lib/models";
import type { TrainingRequest } from "@/lib/models";

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

export default function ClientDashboard({ user }: Props) {
  const [subs, setSubs] = useState<UserSubscription[]>([]);
  const [workouts, setWorkouts] = useState<GroupWorkout[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<TrainingRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, w, reqs] = await Promise.all([
          getUserSubscriptions(user.uid),
          getAllGroupWorkouts(),
          getTrainingRequests({ clientId: user.uid, status: "approved" }),
        ]);
        if (!cancelled) {
          setSubs(s);
          setWorkouts(w);
          setApprovedRequests(reqs);
        }
      } catch {
        // мягко игнорируем, дашборд не критичен
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  const activeSubs = subs.filter((s) => s.active);

  const now = useMemo(() => new Date(), []);

  const upcomingMyWorkouts = useMemo(() => {
    const fromGroup = workouts
      .filter((w) => {
        const isIndividual = w.isIndividual || (w.maxParticipants === 1 && !!w.clientId);
        const isMineIndividual = isIndividual && w.clientId === user.uid;
        const isSignedGroup = !isIndividual && (w.participantIds ?? []).includes(user.uid);
        return (isMineIndividual || isSignedGroup) && (w.dateTime?.toDate?.() ?? new Date()) >= now;
      })
      .map((w) => ({ type: "group" as const, id: w.id, date: w.dateTime?.toDate?.() ?? new Date(), name: w.isIndividual ? "Индивидуальная" : w.name, trainerName: w.trainerName, durationMinutes: w.durationMinutes }));
    const rTime = (r: TrainingRequest) => (r.requestedDateTime?.toDate?.() ?? new Date()).getTime();
    const hasMatchingWorkout = (r: TrainingRequest) =>
      workouts.some(
        (w) =>
          w.isIndividual &&
          w.clientId === r.clientId &&
          w.trainerId === r.trainerId &&
          (w.dateTime?.toDate?.() ?? new Date()).getTime() === rTime(r)
      );
    const fromIndividual = approvedRequests
      .filter((r) => (r.requestedDateTime?.toDate?.() ?? new Date()) >= now && !hasMatchingWorkout(r))
      .map((r) => ({ type: "individual" as const, id: r.id, date: r.requestedDateTime?.toDate?.() ?? new Date(), name: "Индивидуальная", trainerName: r.trainerName, durationMinutes: r.durationMinutes ?? 60 }));
    return [...fromGroup, ...fromIndividual].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [workouts, user.uid, approvedRequests, now]);

  return (
    <ClientLayout title="Кабинет клиента">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
            Добро пожаловать
          </p>
          <p className="text-lg font-semibold text-hsc-panel">
            {user.email ?? "Клиент HypeSportClub"}
          </p>
          <p className="text-xs text-slate-700">
            Управляйте тренировками, абонементами и следите за своим прогрессом.
          </p>
        </Card>

        <Card variant="panel" className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">
            Быстрые действия
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" href="/client/training">
              Тренировки и запись
            </Button>
            <Button size="sm" variant="secondary" href="/client/profile">
              Обновить профиль
            </Button>
            <Button size="sm" variant="secondary" href="/client/nutrition">
              История БЖУ
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-hsc-panel">Мои абонементы</h2>
          {activeSubs.length === 0 ? (
            <p className="mt-2 text-xs text-slate-700">
              У вас пока нет активных абонементов. Оформите их в разделе профиля на
              мобильном или через администратора.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {activeSubs.map((s) => (
                <li key={s.id} className="rounded-lg bg-emerald-50 px-2 py-1">
                  <span className="font-semibold">{s.subscriptionName}</span>{" "}
                  <span className="text-[10px] text-slate-500">
                    до {formatDate(s.endDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-hsc-panel">
            Ближайшие тренировки (все, на которые вы записаны)
          </h2>
          {upcomingMyWorkouts.length === 0 ? (
            <p className="mt-2 text-xs text-slate-700">
              Запланированных тренировок пока нет. Запишитесь в разделе «Тренировки».
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {upcomingMyWorkouts.map((w) => (
                <li key={`${w.type}-${w.id}`} className="rounded-lg bg-emerald-50 px-2 py-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{w.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {w.date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Тренер: {w.trainerName}, {w.durationMinutes} мин
                  </div>
                </li>
              ))}
            </ul>
          )}
          {upcomingMyWorkouts.length > 0 && (
            <Button size="sm" variant="secondary" href="/client/training" className="mt-2">
              Все тренировки
            </Button>
          )}
        </Card>
      </div>
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "admin", "manager"]);

