import { useEffect, useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getAllGroupWorkouts,
  signUpForWorkout,
  cancelWorkoutSignUp,
  getTrainingRequests,
} from "@/lib/db";
import type { GroupWorkout } from "@/lib/models";
import type { TrainingRequest } from "@/lib/models";

type Props = AuthedPageProps;

type Tab = "MY" | "GROUP" | "INDIVIDUAL";

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

export default function TrainingPage({ user }: Props) {
  const [tab, setTab] = useState<Tab>("MY");
  const [workouts, setWorkouts] = useState<GroupWorkout[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<TrainingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [list, reqs] = await Promise.all([
          getAllGroupWorkouts(),
          getTrainingRequests({ clientId: user.uid, status: "approved" }),
        ]);
        if (!cancelled) {
          setWorkouts(list);
          setApprovedRequests(reqs);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Не удалось загрузить тренировки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  const now = useMemo(() => new Date(), []);

  const myWorkoutsMerged = useMemo(() => {
    const fromGroup = workouts
      .filter((w) => {
        const isIndividual = w.isIndividual || (w.maxParticipants === 1 && !!w.clientId);
        const isMineIndividual = isIndividual && w.clientId === user.uid;
        const isSignedGroup = !isIndividual && (w.participantIds ?? []).includes(user.uid);
        return (isMineIndividual || isSignedGroup) && (w.dateTime?.toDate?.() ?? new Date()) >= now;
      })
      .map((w) => ({ type: "group" as const, workout: w, date: w.dateTime?.toDate?.() ?? new Date() }));
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
      .map((r) => ({ type: "individual" as const, request: r, date: r.requestedDateTime?.toDate?.() ?? new Date() }));
    return [...fromGroup, ...fromIndividual].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [workouts, user.uid, approvedRequests, now]);

  const myWorkouts = useMemo(
    () =>
      workouts.filter((w) => {
        const dt = w.dateTime?.toDate?.() ?? new Date();
        if (dt < now) return false;
        const isIndividual = w.isIndividual || (w.maxParticipants === 1 && !!w.clientId);
        const isMineIndividual = isIndividual && w.clientId === user.uid;
        const isSignedGroup = !isIndividual && (w.participantIds ?? []).includes(user.uid);
        return isMineIndividual || isSignedGroup;
      }),
    [workouts, user.uid, now]
  );

  // Групповые тренировки: только будущие и на следующие 7 дней; без тех, на которые уже записан
  const groupWorkouts = useMemo(() => {
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    return workouts.filter((w) => {
      if (w.isIndividual || (w.participantIds ?? []).includes(user.uid)) return false;
      const dt = w.dateTime?.toDate?.() ?? new Date();
      return dt >= now && dt <= in7Days;
    });
  }, [workouts, user.uid, now]);

  async function handleSignUp(w: GroupWorkout) {
    setActionLoadingId(w.id);
    setError(null);
    try {
      await signUpForWorkout(w.id, user.uid);
      const updated = await getAllGroupWorkouts();
      setWorkouts(updated);
    } catch (e: any) {
      setError(e?.message ?? "Не удалось записаться на тренировку");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(w: GroupWorkout) {
    setActionLoadingId(w.id);
    setError(null);
    try {
      await cancelWorkoutSignUp(w.id, user.uid);
      const updated = await getAllGroupWorkouts();
      setWorkouts(updated);
    } catch (e: any) {
      setError(e?.message ?? "Не удалось отменить запись");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <ClientLayout title="Тренировки">
      <div className="space-y-4">
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-hsc-panel">Тренировки</h2>
          <p className="text-xs text-slate-700">
            Как и в мобильном приложении, здесь доступны ваши тренировки и список
            групповых занятий, на которые можно записаться.
          </p>
        </Card>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[color:var(--hsc-surface)] p-1">
          <button
            type="button"
            onClick={() => setTab("MY")}
            className={`rounded-lg py-2 text-[10px] font-semibold sm:text-xs ${
              tab === "MY"
                ? "bg-[color:var(--hsc-panel)] text-white shadow"
                : "text-slate-700"
            }`}
          >
            Мои ближайшие
          </button>
          <button
            type="button"
            onClick={() => setTab("GROUP")}
            className={`rounded-lg py-2 text-[10px] font-semibold sm:text-xs ${
              tab === "GROUP"
                ? "bg-[color:var(--hsc-panel)] text-white shadow"
                : "text-slate-700"
            }`}
          >
            Групповые
          </button>
          <button
            type="button"
            onClick={() => setTab("INDIVIDUAL")}
            className={`rounded-lg py-2 text-[10px] font-semibold sm:text-xs ${
              tab === "INDIVIDUAL"
                ? "bg-[color:var(--hsc-panel)] text-white shadow"
                : "text-slate-700"
            }`}
          >
            Индивидуальные
          </button>
        </div>

        {error && (
          <Card className="border border-red-200 bg-red-50 text-xs text-red-700">
            {error}
          </Card>
        )}

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка расписания...</Card>
        ) : tab === "MY" ? (
          <Card className="space-y-2">
            <h3 className="text-sm font-semibold text-hsc-panel">Ближайшие тренировки (групповые и индивидуальные)</h3>
            {myWorkoutsMerged.length === 0 ? (
              <p className="text-xs text-slate-700">
                У вас пока нет запланированных тренировок. Запишитесь на групповое или индивидуальное занятие.
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {myWorkoutsMerged.map((item) =>
                  item.type === "group" ? (
                    <div
                      key={`g-${item.workout.id}`}
                      className="rounded-xl border border-emerald-900/15 bg-emerald-50 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-hsc-panel">
                          {item.workout.isIndividual ? "Индивидуальная тренировка" : item.workout.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatDate(item.workout.dateTime)}
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-700">
                        <span>Тренер: {item.workout.trainerName}</span>
                        <span>Длительность: {item.workout.durationMinutes} мин</span>
                      </div>
                      {!item.workout.isIndividual && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={actionLoadingId === item.workout.id}
                            onClick={() => handleCancel(item.workout)}
                          >
                            {actionLoadingId === item.workout.id ? "Отмена..." : "Отменить запись"}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      key={`i-${item.request.id}`}
                      className="rounded-xl border border-emerald-900/15 bg-emerald-50 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-hsc-panel">Индивидуальная тренировка</div>
                        <div className="text-[10px] text-slate-500">
                          {formatDate(item.request.requestedDateTime)}
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-700">
                        <span>Тренер: {item.request.trainerName}</span>
                        <span>Длительность: {item.request.durationMinutes} мин</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </Card>
        ) : tab === "INDIVIDUAL" ? (
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-hsc-panel">Индивидуальная запись</h3>
            <p className="text-xs text-slate-700">
              Выберите тренера, удобное время и отправьте заявку. После одобрения тренировка появится в «Мои ближайшие».
            </p>
            <div className="flex flex-wrap gap-2">
              <Button href="/client/booking" size="sm">
                Записаться на индивидуальную тренировку
              </Button>
              <Button href="/client/booking?step=requests" size="sm" variant="secondary">
                Мои заявки
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="space-y-2">
            {groupWorkouts.length === 0 ? (
              <p className="text-xs text-slate-700">
                Пока нет доступных групповых тренировок. Загляните позже.
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {groupWorkouts.map((w) => {
                  const isFull = (w.currentParticipants ?? 0) >= (w.maxParticipants ?? 20);
                  return (
                    <div
                      key={w.id}
                      className="rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-hsc-panel">{w.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {formatDate(w.dateTime)}
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-700">{w.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-700">
                        <span>Тренер: {w.trainerName}</span>
                        <span>Длительность: {w.durationMinutes} мин</span>
                        <span>
                          Участники: {w.currentParticipants}/{w.maxParticipants}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          disabled={isFull || actionLoadingId === w.id}
                          onClick={() => handleSignUp(w)}
                        >
                          {isFull
                            ? "Мест нет"
                            : actionLoadingId === w.id
                            ? "Запись..."
                            : "Записаться"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "admin", "manager"]);

