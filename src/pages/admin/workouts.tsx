import { useEffect, useState, useMemo } from "react";
import type { GetServerSideProps } from "next";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getAllGroupWorkouts, addGroupWorkout, deleteGroupWorkout, getAllTrainers, getAllUsers } from "@/lib/db";
import type { GroupWorkout, Trainer, User } from "@/lib/models";
import { Timestamp } from "firebase/firestore";

type Props = AuthedPageProps;
type WorkoutType = "ALL" | "INDIVIDUAL" | "GROUP";

function formatDateTime(ts: any) {
  if (!ts) return "—";
  const d = "toDate" in ts ? ts.toDate() : new Date();
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function getWeekDates(): Date[] {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function AdminWorkouts(_props: Props) {
  const [workouts, setWorkouts] = useState<GroupWorkout[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<WorkoutType>("ALL");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Form fields
  const [isIndividual, setIsIndividual] = useState(false);
  const [name, setName] = useState("");
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [duration, setDuration] = useState(60);
  const [maxP, setMaxP] = useState(20);
  const [desc, setDesc] = useState("");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [weeksCount, setWeeksCount] = useState(4);

  async function load() {
    setLoading(true);
    try {
      const [w, t, u] = await Promise.all([getAllGroupWorkouts(false), getAllTrainers(), getAllUsers()]);
      setWorkouts(w);
      setTrainers(t);
      setClients(u.filter((u) => u.role === "CLIENT"));
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const weekDates = useMemo(() => getWeekDates(), []);

  const now = useMemo(() => new Date(), []);
  const filtered = useMemo(() => {
    let list = workouts.filter((w) => {
      const dt = w.dateTime?.toDate ? w.dateTime.toDate() : new Date();
      return dt >= now;
    });
    if (typeFilter === "INDIVIDUAL") list = list.filter((w) => w.isIndividual);
    if (typeFilter === "GROUP") list = list.filter((w) => !w.isIndividual);
    if (selectedDay !== null) {
      const day = weekDates[selectedDay];
      list = list.filter((w) => {
        const dt = w.dateTime?.toDate ? w.dateTime.toDate() : new Date();
        return dt.toDateString() === day.toDateString();
      });
    }
    return list;
  }, [workouts, typeFilter, selectedDay, weekDates, now]);

  function openNewForm(individual: boolean) {
    setIsIndividual(individual);
    setName(individual ? "" : "");
    setSelectedTrainerId("");
    setSelectedClientId("");
    setDateStr("");
    setDuration(60);
    setMaxP(individual ? 1 : 20);
    setDesc("");
    setShowForm(true);
  }

  async function handleAdd() {
    if (!dateStr) return;
    setSaving(true); setError(null);
    try {
      const baseDt = new Date(dateStr);
      const trainer = trainers.find((t) => t.id === selectedTrainerId);
      const client = clients.find((c) => c.id === selectedClientId);
      const count = repeatWeekly ? Math.max(1, Math.min(52, weeksCount)) : 1;
      for (let i = 0; i < count; i++) {
        const dt = new Date(baseDt);
        dt.setDate(baseDt.getDate() + i * 7);
        await addGroupWorkout({
          name: isIndividual ? "Индивидуальная тренировка" : name,
          description: desc,
          trainerId: selectedTrainerId,
          trainerName: trainer ? [trainer.lastName, trainer.firstName].join(" ") : "",
          clientId: isIndividual ? selectedClientId : "",
          clientName: client ? [client.lastName, client.firstName].join(" ") : "",
          dateTime: Timestamp.fromDate(dt),
          durationMinutes: duration,
          maxParticipants: isIndividual ? 1 : maxP,
          currentParticipants: 0,
          participantIds: [],
          isIndividual,
          active: true
        } as any);
      }
      await load();
      setShowForm(false);
    } catch (e: any) { setError(e?.message ?? "Ошибка"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить тренировку?")) return;
    try {
      await deleteGroupWorkout(id);
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    } catch (e: any) { setError(e?.message ?? "Ошибка"); }
  }

  return (
    <AdminLayout title="Управление тренировками">
      <div className="space-y-4">
        {/* Мини-календарь недели */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-hsc-panel">Расписание</h2>
            <div className="flex gap-1">
              <Button size="sm" onClick={() => openNewForm(false)}>+ Групповая</Button>
              <Button size="sm" variant="secondary" onClick={() => openNewForm(true)}>+ Индивид.</Button>
            </div>
          </div>

          {/* Дни недели */}
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              const isSelected = selectedDay === i;
              const count = workouts.filter((w) => {
                const dt = w.dateTime?.toDate ? w.dateTime.toDate() : new Date();
                return dt.toDateString() === d.toDateString();
              }).length;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : i)}
                  className={`rounded-xl p-2 text-center text-[10px] transition-colors ${
                    isSelected
                      ? "bg-hsc-panel text-white"
                      : isToday
                      ? "bg-emerald-100 text-hsc-panel font-bold"
                      : "bg-white text-slate-700 hover:bg-emerald-50"
                  }`}
                >
                  <div className="font-semibold">{DAY_NAMES[i]}</div>
                  <div className="text-lg font-bold">{d.getDate()}</div>
                  {count > 0 && <div className={`text-[9px] ${isSelected ? "text-emerald-100" : "text-emerald-600"}`}>{count} тр.</div>}
                </button>
              );
            })}
          </div>

          {/* Фильтр по типу */}
          <div className="flex gap-1">
            {(["ALL", "GROUP", "INDIVIDUAL"] as WorkoutType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                  typeFilter === t ? "bg-hsc-panel text-white" : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                {t === "ALL" ? "Все" : t === "GROUP" ? "Групповые" : "Индивидуальные"}
              </button>
            ))}
          </div>
        </Card>

        {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка...</Card>
        ) : (
          <Card className="max-h-[420px] space-y-2 overflow-y-auto">
            {filtered.length === 0 && <p className="text-xs text-slate-700">Нет тренировок.</p>}
            {filtered.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      w.isIndividual ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {w.isIndividual ? "ИНДИ" : "ГРУП"}
                    </span>
                    <span className="font-semibold text-hsc-panel">
                      {w.isIndividual ? `${w.clientName || "Клиент"}` : w.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {formatDateTime(w.dateTime)} | {w.trainerName} | {w.durationMinutes} мин
                    {!w.isIndividual && ` | ${w.currentParticipants}/${w.maxParticipants}`}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(w.id)}>Удалить</Button>
              </div>
            ))}
          </Card>
        )}

        {/* Форма создания */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3">
              <h3 className="text-sm font-bold text-hsc-panel">
                {isIndividual ? "Индивидуальная тренировка" : "Групповая тренировка"}
              </h3>

              {!isIndividual && (
                <div>
                  <label className="text-[10px] text-slate-600">Название</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Йога, кроссфит, и т.д." />
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-600">Тренер</label>
                <select
                  value={selectedTrainerId}
                  onChange={(e) => setSelectedTrainerId(e.target.value)}
                  className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Выберите тренера</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{[t.lastName, t.firstName].join(" ")}</option>
                  ))}
                </select>
              </div>

              {isIndividual && (
                <div>
                  <label className="text-[10px] text-slate-600">Клиент</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Выберите клиента</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {[c.lastName, c.firstName].filter(Boolean).join(" ") || c.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-600">Дата и время</label>
                <Input type="datetime-local" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={repeatWeekly} onChange={(e) => setRepeatWeekly(e.target.checked)} />
                  Повторять еженедельно (тот же день и время)
                </label>
                {repeatWeekly && (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-600">Недель:</label>
                    <Input type="number" min={1} max={52} value={weeksCount} onChange={(e) => setWeeksCount(Number(e.target.value) || 4)} className="w-20" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-600">Длительность (мин)</label>
                  <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                </div>
                {!isIndividual && (
                  <div>
                    <label className="text-[10px] text-slate-600">Макс. участников</label>
                    <Input type="number" value={maxP} onChange={(e) => setMaxP(Number(e.target.value))} />
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Описание</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Отмена</Button>
                <Button size="sm" disabled={saving} onClick={handleAdd}>
                  {saving ? "Создание..." : "Создать"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["admin"]);
