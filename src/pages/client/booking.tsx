import { useEffect, useState, useMemo } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getAllTrainers,
  getTrainerAvailability,
  getTrainerIndividualWorkouts,
  createTrainingRequest,
  getTrainingRequests,
  getCurrentUser,
} from "@/lib/db";
import type {
  Trainer,
  TrainerAvailability,
  TrainingRequest,
  GroupWorkout,
} from "@/lib/models";
import { Timestamp } from "firebase/firestore";

type Props = AuthedPageProps;

type Step = "SELECT_TRAINER" | "VIEW_AVAILABILITY" | "PICK_TIME" | "MY_REQUESTS";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const SPEC_LABELS: Record<string, string> = {
  FITNESS: "Фитнес",
  BODYBUILDING: "Бодибилдинг",
  CROSSFIT: "Кроссфит",
  YOGA: "Йога",
  PILATES: "Пилатес",
  BOXING: "Бокс",
  SWIMMING: "Плавание",
  CARDIO: "Кардио",
};

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  pending: { text: "Ожидает", cls: "bg-amber-100 text-amber-800" },
  approved: { text: "Одобрено", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { text: "Отклонено", cls: "bg-red-100 text-red-700" },
};

function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU") + " ₽";
}

function formatDateTime(ts: any): string {
  if (!ts) return "—";
  const date = "toDate" in ts ? ts.toDate() : new Date();
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Returns the next occurrence of `dayOfWeek` (0=Mon..6=Sun) starting from today. */
function getNextDateForDay(dayOfWeek: number): Date {
  const now = new Date();
  // JS getDay(): 0=Sun,1=Mon...6=Sat → convert to our 0=Mon...6=Sun
  const jsDay = now.getDay();
  const currentDay = jsDay === 0 ? 6 : jsDay - 1; // now 0=Mon...6=Sun
  let diff = dayOfWeek - currentDay;
  if (diff <= 0) diff += 7;
  const target = new Date(now);
  target.setDate(target.getDate() + diff);
  target.setHours(0, 0, 0, 0);
  return target;
}

export default function BookingPage({ user }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("SELECT_TRAINER");

  // Data
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [trainerBookedWorkouts, setTrainerBookedWorkouts] = useState<GroupWorkout[]>([]);
  const [myRequests, setMyRequests] = useState<TrainingRequest[]>([]);
  const [clientName, setClientName] = useState("");

  // Booking form: выбор из ближайших 7 дней и часа
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const duration = 60;

  const next7Days = useMemo(() => {
    const days: Date[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  }, []);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Открыть вкладку «Мои заявки» по ссылке /client/booking?step=requests
  useEffect(() => {
    if (router.query.step === "requests") setStep("MY_REQUESTS");
  }, [router.query.step]);

  // Список тренеров — только из коллекции trainers (клиент не имеет доступа к users)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [profilesList, requests, currentUser] = await Promise.all([
          getAllTrainers(),
          getTrainingRequests({ clientId: user.uid }),
          getCurrentUser(user.uid),
        ]);
        if (!cancelled) {
          setTrainers(profilesList.filter((t) => t.userId));
          setMyRequests(requests);
          if (currentUser) {
            setClientName(
              [currentUser.lastName, currentUser.firstName].filter(Boolean).join(" ") || user.email || "Клиент"
            );
          } else {
            setClientName(user.email || "Клиент");
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Не удалось загрузить данные");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid, user.email]);

  // Clear success after 4s
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Load availability and booked slots when trainer selected
  async function handleSelectTrainer(trainer: Trainer) {
    setSelectedTrainer(trainer);
    setAvailability([]);
    setTrainerBookedWorkouts([]);
    setSelectedDate(null);
    setSelectedHour(null);
    setError(null);
    setStep("VIEW_AVAILABILITY");
    const trainerUid = (trainer.userId || trainer.id || "").trim();
    if (!trainerUid) {
      setError("Не удалось определить тренера");
      return;
    }
    try {
      const avail = await getTrainerAvailability(trainerUid);
      setAvailability(avail);
      let booked: GroupWorkout[] = [];
      try {
        booked = await getTrainerIndividualWorkouts([trainer.userId, trainer.id].filter(Boolean) as string[]);
      } catch {
        booked = [];
      }
      setTrainerBookedWorkouts(booked);
    } catch {
      setError("Не удалось загрузить расписание тренера");
    }
  }

  // Submit booking request
  async function handleSubmit() {
    if (!selectedTrainer || !selectedDate || selectedHour === null) return;

    setSubmitting(true);
    setError(null);
    try {
      const targetDate = new Date(selectedDate);
      targetDate.setHours(selectedHour, 0, 0, 0);

      const trainerFullName = [selectedTrainer.lastName, selectedTrainer.firstName]
        .filter(Boolean)
        .join(" ");
      await createTrainingRequest({
        clientId: user.uid,
        clientName,
        trainerId: selectedTrainer.userId ?? selectedTrainer.id,
        trainerName: trainerFullName,
        requestedDateTime: Timestamp.fromDate(targetDate),
        durationMinutes: duration,
        status: "pending",
        message: (message || "").trim() || "",
        createdAt: Timestamp.now(),
      });

      // Refresh my requests
      const updated = await getTrainingRequests({ clientId: user.uid });
      setMyRequests(updated);

      setSuccess("Заявка на тренировку успешно отправлена!");
      setSelectedDate(null);
      setSelectedHour(null);
      setMessage("");
      setStep("MY_REQUESTS");
    } catch (e: any) {
      setError(e?.message ?? "Не удалось отправить заявку");
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (step === "PICK_TIME") {
      setSelectedHour(null);
      setStep("VIEW_AVAILABILITY");
    } else if (step === "VIEW_AVAILABILITY") {
      setSelectedDate(null);
      setSelectedTrainer(null);
      setStep("SELECT_TRAINER");
    } else if (step === "MY_REQUESTS") {
      setStep("SELECT_TRAINER");
    }
  }

  /** День недели 0=Пн..6=Вс для нашей логики. */
  function getDayOfWeek(d: Date): number {
    const js = d.getDay();
    return js === 0 ? 6 : js - 1;
  }

  function workoutToDate(ts: unknown): Date {
    if (!ts) return new Date(0);
    const t = ts as { toDate?: () => Date; seconds?: number };
    if (typeof t.toDate === "function") return t.toDate();
    if (typeof t.seconds === "number") return new Date(t.seconds * 1000);
    return new Date(0);
  }

  /** Свободные часы на конкретную дату (по расписанию тренера и без уже занятых). */
  function getHoursForDate(date: Date): number[] {
    const dayOfWeek = getDayOfWeek(date);
    const slot = availability.find((a) => a.dayOfWeek === dayOfWeek);
    if (!slot) return [];
    const bookedHours = new Set<number>();
    trainerBookedWorkouts.forEach((w) => {
      const dt = workoutToDate(w.dateTime);
      if (dt.getDate() === date.getDate() && dt.getMonth() === date.getMonth() && dt.getFullYear() === date.getFullYear()) {
        bookedHours.add(dt.getHours());
      }
    });
    const hours: number[] = [];
    for (let h = slot.startHour; h < slot.endHour; h++) {
      if (!bookedHours.has(h)) hours.push(h);
    }
    return hours;
  }

  /** Есть ли у тренера окно в этот день (по дню недели). */
  function isDateAvailable(date: Date): boolean {
    return availability.some((a) => a.dayOfWeek === getDayOfWeek(date));
  }

  return (
    <ClientLayout title="Запись на тренировку">
      <div className="space-y-4">
        {/* Header */}
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-hsc-panel">
              Индивидуальная тренировка
            </h2>
            <Button
              size="sm"
              variant={step === "MY_REQUESTS" ? "primary" : "ghost"}
              onClick={() => setStep("MY_REQUESTS")}
            >
              Мои заявки ({myRequests.length})
            </Button>
          </div>
          <p className="text-xs text-slate-700">
            Выберите тренера, удобное время и отправьте заявку на индивидуальную тренировку.
          </p>
        </Card>

        {/* Notifications */}
        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* Step indicator */}
        {step !== "MY_REQUESTS" && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
            <span
              className={step === "SELECT_TRAINER" ? "text-hsc-panel font-bold" : "cursor-pointer hover:text-hsc-panel"}
              onClick={() => {
                setSelectedTrainer(null);
                setStep("SELECT_TRAINER");
              }}
            >
              1. Тренер
            </span>
            <span>→</span>
            <span
              className={step === "VIEW_AVAILABILITY" ? "text-hsc-panel font-bold" : ""}
            >
              2. Расписание
            </span>
            <span>→</span>
            <span
              className={step === "PICK_TIME" ? "text-hsc-panel font-bold" : ""}
            >
              3. Запись
            </span>
          </div>
        )}

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка данных...</Card>
        ) : step === "SELECT_TRAINER" ? (
          /* =========== STEP 1: SELECT TRAINER =========== */
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-hsc-panel">
              Выберите тренера
            </h3>
            {trainers.length === 0 ? (
              <p className="text-xs text-slate-700">
                Тренеры пока не добавлены. Обратитесь к администратору.
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {trainers.map((t) => {
                  const fullName = [t.lastName, t.firstName, t.middleName]
                    .filter(Boolean)
                    .join(" ");
                  const specLabel = SPEC_LABELS[t.specialization] ?? t.specialization;
                  const allSpecs = t.specializations?.length
                    ? t.specializations.map((s) => SPEC_LABELS[s] ?? s).join(", ")
                    : specLabel;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTrainer(t)}
                      className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-left transition-colors hover:bg-emerald-50 hover:border-emerald-500/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            photoUrl={t.photoUrl}
                            name={[t.lastName, t.firstName].filter(Boolean).join(" ")}
                            size="md"
                          />
                          <div>
                            <div className="text-sm font-semibold text-hsc-panel">
                              {fullName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {allSpecs}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-hsc-panel">
                            {formatPrice(t.pricePerTraining)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            за тренировку
                          </div>
                        </div>
                      </div>
                      {t.experience > 0 && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          Опыт: {t.experience}{" "}
                          {t.experience === 1
                            ? "год"
                            : t.experience < 5
                            ? "года"
                            : "лет"}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        ) : step === "VIEW_AVAILABILITY" ? (
          /* =========== STEP 2: VIEW AVAILABILITY =========== */
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={goBack}
                className="rounded-lg p-1 text-slate-500 hover:bg-emerald-50 hover:text-hsc-panel transition-colors"
              >
                ← Назад
              </button>
              <h3 className="text-sm font-semibold text-hsc-panel">
                Расписание: {selectedTrainer?.lastName} {selectedTrainer?.firstName}
              </h3>
            </div>

            {availability.length === 0 ? (
              <p className="text-xs text-slate-700">
                Тренер пока не указал своё расписание. Попробуйте позже.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-600">
                  Выберите дату из ближайших 7 дней, затем свободный час.
                </p>

                {/* 7 кнопок с датами */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {next7Days.map((d) => {
                    const available = isDateAvailable(d);
                    const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
                    const dayLabel = DAY_LABELS[getDayOfWeek(d)];
                    const dateStr = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
                    return (
                      <button
                        key={d.getTime()}
                        type="button"
                        disabled={!available}
                        onClick={() => {
                          setSelectedDate(d);
                          setSelectedHour(null);
                        }}
                        className={`rounded-xl py-2.5 text-center text-xs font-semibold transition-colors ${
                          isSelected
                            ? "bg-hsc-panel text-white shadow"
                            : available
                            ? "bg-emerald-50 text-hsc-panel hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <span className="block">{dayLabel}</span>
                        <span className="block text-[10px] opacity-90">{dateStr}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Часы на выбранную дату */}
                {selectedDate && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600">
                      Свободные часы на {selectedDate.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "2-digit" })}:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {getHoursForDate(selectedDate).length === 0 ? (
                        <p className="text-[11px] text-slate-500">На эту дату нет свободных слотов.</p>
                      ) : (
                        getHoursForDate(selectedDate).map((hour) => {
                          const isSelected = selectedHour === hour;
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => {
                                setSelectedHour(hour);
                                setStep("PICK_TIME");
                              }}
                              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                                isSelected
                                  ? "bg-hsc-panel text-white shadow"
                                  : "bg-white border border-emerald-900/15 text-hsc-panel hover:bg-emerald-50"
                              }`}
                            >
                              {String(hour).padStart(2, "0")}:00
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        ) : step === "PICK_TIME" ? (
          /* =========== STEP 3: CONFIRM & SEND =========== */
          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goBack}
                className="rounded-lg p-1 text-slate-500 hover:bg-emerald-50 hover:text-hsc-panel transition-colors"
              >
                ← Назад
              </button>
              <h3 className="text-sm font-semibold text-hsc-panel">
                Подтверждение записи
              </h3>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-emerald-50 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Тренер:</span>
                <span className="font-semibold text-hsc-panel">
                  {selectedTrainer?.lastName} {selectedTrainer?.firstName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Специализация:</span>
                <span className="font-medium text-slate-800">
                  {SPEC_LABELS[selectedTrainer?.specialization ?? ""] ?? selectedTrainer?.specialization}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Дата и время:</span>
                <span className="font-medium text-slate-800">
                  {selectedDate && selectedHour !== null
                    ? selectedDate.toLocaleDateString("ru-RU") + ", " + String(selectedHour).padStart(2, "0") + ":00"
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Время:</span>
                <span className="font-medium text-slate-800">
                  {selectedHour !== null ? `${String(selectedHour).padStart(2, "0")}:00` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Длительность:</span>
                <span className="font-medium text-slate-800">60 мин</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Стоимость:</span>
                <span className="font-bold text-hsc-panel">
                  {formatPrice(selectedTrainer?.pricePerTraining ?? 0)}
                </span>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Комментарий (необязательно):
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Опишите ваши цели или пожелания..."
                className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hsc-panel focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--hsc-back)]"
              />
            </div>

            {/* Submit */}
            <Button
              fullWidth
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Отправка заявки..." : "Отправить заявку"}
            </Button>
          </Card>
        ) : (
          /* =========== STEP 4: MY REQUESTS =========== */
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={goBack}
                className="rounded-lg p-1 text-slate-500 hover:bg-emerald-50 hover:text-hsc-panel transition-colors"
              >
                ← Назад
              </button>
              <h3 className="text-sm font-semibold text-hsc-panel">
                Мои заявки
              </h3>
            </div>

            {myRequests.length === 0 ? (
              <p className="text-xs text-slate-700">
                У вас пока нет заявок. Выберите тренера и удобное время, чтобы записаться.
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {myRequests.map((req) => {
                  const st = STATUS_LABELS[req.status] ?? STATUS_LABELS.pending;
                  return (
                    <div
                      key={req.id}
                      className="rounded-xl border border-emerald-900/15 bg-white px-3 py-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-hsc-panel">
                          {req.trainerName}
                        </div>
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}
                        >
                          {st.text}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                        <span>{formatDateTime(req.requestedDateTime)}</span>
                        <span>{req.durationMinutes} мин</span>
                      </div>
                      {req.message && (
                        <p className="mt-1 text-[11px] text-slate-500 italic">
                          «{req.message}»
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              size="sm"
              variant="secondary"
              fullWidth
              onClick={() => setStep("SELECT_TRAINER")}
            >
              Новая заявка
            </Button>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "trainer", "admin", "manager"]);
