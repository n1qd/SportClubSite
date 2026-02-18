import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { TrainerLayout } from "@/components/layout/TrainerLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getTrainingRequests, updateTrainingRequestStatus, setTrainerAvailability, getTrainerAvailability, getOrCreateChat } from "@/lib/db";
import type { TrainingRequest, TrainerAvailability } from "@/lib/models";

type Props = AuthedPageProps;
type Tab = "requests" | "availability";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const STATUS_LABELS: Record<string, string> = { pending: "Ожидает", approved: "Одобрена", rejected: "Отклонена" };
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800"
};

function formatDateTime(ts: any) {
  if (!ts) return "—";
  const d = "toDate" in ts ? ts.toDate() : new Date();
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function TrainerRequests({ user }: Props) {
  const [tab, setTab] = useState<Tab>("requests");
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Availability editor state
  const [editSlots, setEditSlots] = useState<{ day: number; start: number; end: number }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [reqs, avail] = await Promise.all([
          getTrainingRequests({ trainerId: user.uid }),
          getTrainerAvailability(user.uid)
        ]);
        setRequests(reqs);
        setAvailability(avail);
        setEditSlots(avail.map((a) => ({ day: a.dayOfWeek, start: a.startHour, end: a.endHour })));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [user.uid]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  async function handleAction(id: string, status: "approved" | "rejected") {
    const req = requests.find((r) => r.id === id);
    setActionId(id);
    try {
      await updateTrainingRequestStatus(id, status);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      if (status === "approved" && req) {
        try {
          await getOrCreateChat(
            [req.clientId, req.trainerId].sort(),
            { [req.clientId]: req.clientName, [req.trainerId]: req.trainerName ?? "Тренер" }
          );
        } catch { /* чат уже есть или ошибка — не блокируем */ }
      }
      setSuccess(status === "approved" ? "Тренировка одобрена. Чат с клиентом доступен в разделе «Сообщения»." : "Тренировка отклонена");
    } catch { /* ignore */ }
    setActionId(null);
  }

  async function saveAvailability() {
    setSaving(true);
    setSaveError(null);
    try {
      await setTrainerAvailability(user.uid, editSlots.map((s) => ({
        trainerId: user.uid,
        dayOfWeek: s.day,
        startHour: s.start,
        endHour: s.end
      })));
      setSuccess("Расписание сохранено");
    } catch (e: any) {
      setSaveError(e?.message ?? "Не удалось сохранить расписание. Проверьте правила Firestore (trainer_availability create).");
    }
    setSaving(false);
  }

  function toggleDay(day: number) {
    if (editSlots.some((s) => s.day === day)) {
      setEditSlots((prev) => prev.filter((s) => s.day !== day));
    } else {
      setEditSlots((prev) => [...prev, { day, start: 9, end: 18 }]);
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <TrainerLayout title="Заявки и расписание">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--hsc-surface)] p-1">
          {(["requests", "availability"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-2 text-xs font-semibold transition-colors ${tab === t ? "bg-[color:var(--hsc-panel)] text-white shadow" : "text-slate-700"}`}>
              {t === "requests" ? `Заявки (${pendingRequests.length})` : "Моё расписание"}
            </button>
          ))}
        </div>

        {success && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</div>}
        {saveError && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{saveError}</div>}

        {loading ? <Card className="text-xs text-slate-700">Загрузка...</Card> : tab === "requests" ? (
          <Card className="space-y-2 max-h-[500px] overflow-y-auto">
            {requests.length === 0 ? <p className="text-xs text-slate-700">Нет заявок.</p> : (
              requests.map((r) => (
                <div key={r.id} className="rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-hsc-panel">{r.clientName}</span>
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">{formatDateTime(r.requestedDateTime)}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    {r.durationMinutes} мин {r.message && `| ${r.message}`}
                  </div>
                  {r.status === "pending" && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" disabled={actionId === r.id} onClick={() => handleAction(r.id, "approved")}>
                        {actionId === r.id ? "..." : "Одобрить"}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={actionId === r.id} onClick={() => handleAction(r.id, "rejected")}>
                        Отклонить
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </Card>
        ) : (
          <Card className="space-y-4">
            <h3 className="text-sm font-semibold text-hsc-panel">Рабочие дни и часы</h3>
            <p className="text-xs text-slate-600">Отметьте дни, когда вы доступны, и укажите рабочие часы. Клиенты смогут записаться только в эти временные слоты.</p>
            <div className="space-y-2">
              {DAY_NAMES.map((name, i) => {
                const slot = editSlots.find((s) => s.day === i);
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-emerald-900/10 bg-white px-3 py-2">
                    <button
                      onClick={() => toggleDay(i)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        slot ? "bg-hsc-panel text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {name}
                    </button>
                    {slot ? (
                      <div className="flex items-center gap-2 text-xs">
                        <select
                          value={slot.start}
                          onChange={(e) => setEditSlots((prev) => prev.map((s) => s.day === i ? { ...s, start: Number(e.target.value) } : s))}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        >
                          {Array.from({ length: 16 }, (_, h) => h + 6).map((h) => (
                            <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                        <span className="text-slate-400">—</span>
                        <select
                          value={slot.end}
                          onChange={(e) => setEditSlots((prev) => prev.map((s) => s.day === i ? { ...s, end: Number(e.target.value) } : s))}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        >
                          {Array.from({ length: 16 }, (_, h) => h + 6).map((h) => (
                            <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Выходной</span>
                    )}
                  </div>
                );
              })}
            </div>
            <Button size="sm" onClick={saveAvailability} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить расписание"}
            </Button>
          </Card>
        )}
      </div>
    </TrainerLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["trainer", "admin"]);
