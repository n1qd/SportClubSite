import { useEffect, useState, useMemo } from "react";
import type { GetServerSideProps } from "next";
import { TrainerLayout } from "@/components/layout/TrainerLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getAllGroupWorkouts, getAllTrainers, updateGroupWorkout } from "@/lib/db";
import type { GroupWorkout } from "@/lib/models";
import { Timestamp } from "firebase/firestore";
import { Input } from "@/components/ui/Input";
import { useTranslation } from "@/contexts/LanguageContext";
import { toUserFacingMessage } from "@/lib/user-facing-error";

type Props = AuthedPageProps;

export default function TrainerDashboard({ user }: Props) {
  const { language } = useTranslation();
  const [workouts, setWorkouts] = useState<GroupWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editDateStr, setEditDateStr] = useState("");
  const [editHour, setEditHour] = useState(10);
  const [editDuration, setEditDuration] = useState(60);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [allWorkouts, trainers] = await Promise.all([
          getAllGroupWorkouts(false),
          getAllTrainers(),
        ]);
        const myTrainerDoc = trainers.find((t) => t.userId === user.uid);
        const trainerIdForFilter = myTrainerDoc?.id ?? user.uid;
        const mine = allWorkouts.filter(
          (w) => w.trainerId === user.uid || w.trainerId === trainerIdForFilter
        );
        setWorkouts(mine);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [user.uid]);

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + 7);

  const upcomingMerged = useMemo(() => {
    return workouts
      .filter((w) => {
        const dt = w.dateTime?.toDate ? w.dateTime.toDate() : new Date();
        return dt >= now && dt <= endOfWeek;
      })
      .map((w) => ({
        id: w.id,
        workout: w,
        date: w.dateTime?.toDate?.() ?? new Date(),
        name: w.isIndividual ? `Индивидуальная — ${w.clientName || "Клиент"}` : w.name,
        durationMinutes: w.durationMinutes,
        extra: !w.isIndividual ? `${w.currentParticipants}/${w.maxParticipants} чел.` : "",
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [workouts, now, endOfWeek]);

  const editingWorkout = editingWorkoutId ? workouts.find((w) => w.id === editingWorkoutId) : null;

  const openEditModal = (workout: GroupWorkout) => {
    const dt = workout.dateTime?.toDate?.() ?? new Date();
    setEditingWorkoutId(workout.id);
    setEditDateStr(dt.toISOString().slice(0, 10));
    setEditHour(dt.getHours());
    setEditDuration(workout.durationMinutes ?? 60);
    setEditError(null);
  };

  const closeEditModal = () => {
    setEditingWorkoutId(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editingWorkoutId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const d = new Date(editDateStr);
      d.setHours(editHour, 0, 0, 0);
      await updateGroupWorkout(editingWorkoutId, {
        dateTime: Timestamp.fromDate(d),
        durationMinutes: editDuration,
      });
      const [allWorkouts, trainers] = await Promise.all([
        getAllGroupWorkouts(false),
        getAllTrainers(),
      ]);
      const myTrainerDoc = trainers.find((t) => t.userId === user.uid);
      const trainerIdForFilter = myTrainerDoc?.id ?? user.uid;
      setWorkouts(allWorkouts.filter((w) => w.trainerId === user.uid || w.trainerId === trainerIdForFilter));
      closeEditModal();
    } catch (e: unknown) {
      setEditError(toUserFacingMessage(e, language));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <TrainerLayout title="Расписание">
      <div className="space-y-4">
        <Card className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Тренер</p>
          <p className="text-lg font-bold text-hsc-panel">{user.email ?? "Тренер"}</p>
          <p className="text-xs text-slate-500">
            Предстоящих на 7 дней: {upcomingMerged.length} (групповые и индивидуальные)
          </p>
          <div className="flex flex-wrap gap-2">
            <Button href="/trainer/schedule" size="sm">
              Слоты доступности
            </Button>
            <Button href="/trainer/messages" size="sm" variant="secondary">
              Чаты
            </Button>
          </div>
          <p className="text-[10px] text-slate-500">
            Клиенты записываются напрямую в свободные слоты. Общение — в разделе «Чат».
          </p>
        </Card>

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка расписания...</Card>
        ) : (
          <>
            <Card className="space-y-2">
              <h2 className="text-sm font-semibold text-hsc-panel">Предстоящие тренировки (7 дней)</h2>
              {upcomingMerged.length === 0 ? (
                <p className="text-xs text-slate-700">Нет предстоящих тренировок на ближайшие 7 дней.</p>
              ) : (
                <div className="max-h-[350px] space-y-2 overflow-y-auto pr-1">
                  {upcomingMerged.map((item) => (
                    <div key={item.id} className="rounded-xl border border-emerald-900/10 bg-emerald-50 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-hsc-panel">{item.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {item.date.toLocaleString("ru-RU", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-600">
                          {item.durationMinutes} мин
                          {item.extra && ` | ${item.extra}`}
                        </span>
                        {item.workout.isIndividual && (
                          <Button size="sm" variant="ghost" className="text-[10px]" onClick={() => openEditModal(item.workout)}>
                            Изменить
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {editingWorkoutId && editingWorkout && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <Card className="w-full max-w-md space-y-3">
                  <h3 className="text-sm font-bold text-hsc-panel">Изменить индивидуальную тренировку</h3>
                  <p className="text-[11px] text-slate-600">
                    {editingWorkout.clientName || "Клиент"} — договоритесь в чате и обновите дату/время/длительность.
                  </p>
                  <div>
                    <label className="text-[10px] text-slate-600">Дата</label>
                    <Input type="date" value={editDateStr} onChange={(e) => setEditDateStr(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600">Час (0–23)</label>
                    <Input type="number" min={0} max={23} value={editHour} onChange={(e) => setEditHour(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600">Длительность (мин)</label>
                    <select
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                    >
                      {[30, 45, 60, 90].map((m) => (
                        <option key={m} value={m}>{m} мин</option>
                      ))}
                    </select>
                  </div>
                  {editError && <div className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] text-red-700">{editError}</div>}
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={closeEditModal}>Отмена</Button>
                    <Button size="sm" disabled={editSaving} onClick={saveEdit}>{editSaving ? "Сохранение…" : "Сохранить"}</Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </TrainerLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["trainer", "admin"]);
