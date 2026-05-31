import { useEffect, useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import { TrainerLayout } from "@/components/layout/TrainerLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getTrainerAvailability,
  addTrainerAvailability,
  deleteTrainerAvailability,
  getCurrentUser,
} from "@/lib/db";
import type { TrainerAvailability } from "@/lib/models";
import { useTranslation } from "@/contexts/LanguageContext";
import { toUserFacingMessage } from "@/lib/user-facing-error";

type Props = AuthedPageProps;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateRu(date: string): string {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "long" });
}

export default function TrainerSchedule({ user }: Props) {
  const { language } = useTranslation();
  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [trainerName, setTrainerName] = useState("");

  const [newDate, setNewDate] = useState(todayISO());
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("18:00");
  const [savingSlot, setSavingSlot] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [avail, me] = await Promise.all([
          getTrainerAvailability(user.uid),
          getCurrentUser(user.uid),
        ]);
        setAvailability(avail);
        if (me) {
          setTrainerName([me.lastName, me.firstName, me.middleName].filter(Boolean).join(" ") || me.email);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [user.uid]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  async function handleAddSlot() {
    setSaveError(null);
    if (!newDate) { setSaveError("Укажите дату"); return; }
    if (!newStart || !newEnd) { setSaveError("Укажите часы"); return; }
    if (newStart >= newEnd) { setSaveError("Начало должно быть раньше конца"); return; }
    setSavingSlot(true);
    try {
      await addTrainerAvailability(user.uid, trainerName, newDate, newStart, newEnd);
      const fresh = await getTrainerAvailability(user.uid);
      setAvailability(fresh);
      setSuccess("Слот добавлен");
    } catch (e: unknown) {
      setSaveError(toUserFacingMessage(e, language));
    } finally {
      setSavingSlot(false);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    if (!confirm("Удалить слот доступности?")) return;
    try {
      await deleteTrainerAvailability(slotId);
      setAvailability((prev) => prev.filter((s) => s.id !== slotId));
    } catch { /* ignore */ }
  }

  const futureSlots = useMemo(() => {
    const today = todayISO();
    return availability.filter((s) => s.date >= today);
  }, [availability]);

  return (
    <TrainerLayout title="Моё расписание">
      <div className="space-y-4">
        {success && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</div>}
        {saveError && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{saveError}</div>}

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка...</Card>
        ) : (
          <div className="space-y-3">
            <Card className="space-y-3">
              <h3 className="text-sm font-semibold text-hsc-panel">Добавить слот доступности</h3>
              <p className="text-xs text-slate-600">
                Выберите день и часы, в которые вы готовы провести индивидуальную тренировку.
                Клиенты сразу записываются в свободные часы — без заявок и подтверждений.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-600">Дата</label>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={todayISO()} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600">Начало</label>
                  <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600">Конец</label>
                  <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                </div>
              </div>
              <Button size="sm" onClick={handleAddSlot} disabled={savingSlot}>
                {savingSlot ? "Сохранение..." : "Добавить слот"}
              </Button>
            </Card>

            <Card className="space-y-2">
              <h3 className="text-sm font-semibold text-hsc-panel">Будущие слоты</h3>
              {futureSlots.length === 0 ? (
                <p className="text-xs text-slate-700">Слоты ещё не добавлены.</p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {futureSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs">
                      <div>
                        <div className="font-semibold text-hsc-panel">{formatDateRu(slot.date)}</div>
                        <div className="text-[11px] text-slate-600">
                          {slot.startTime} – {slot.endTime}
                          {!slot.isAvailable && <span className="ml-1 rounded bg-red-100 px-1 py-0.5 text-[9px] text-red-700">Недоступен</span>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteSlot(slot.id)}>Удалить</Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </TrainerLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["trainer", "admin"]);
