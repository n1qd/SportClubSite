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
  buildChatId,
  sendChatMessage,
} from "@/lib/db";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import type {
  Trainer,
  TrainerAvailability,
  TrainingRequest,
  GroupWorkout,
} from "@/lib/models";
import { Timestamp } from "firebase/firestore";
import { useTranslation } from "@/contexts/LanguageContext";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import type { TranslationKeys } from "@/lib/i18n/translations";

type Props = AuthedPageProps;

type Step = "SELECT_TRAINER" | "VIEW_AVAILABILITY" | "PICK_TIME" | "MY_REQUESTS";

const SPEC_KEYS: Record<string, TranslationKeys> = {
  FITNESS: "client.profile.specFitness",
  BODYBUILDING: "client.profile.specBodybuilding",
  CROSSFIT: "client.profile.specCrossfit",
  YOGA: "client.profile.specYoga",
  PILATES: "client.profile.specPilates",
  BOXING: "client.profile.specBoxing",
  SWIMMING: "client.profile.specSwimming",
  CARDIO: "client.profile.specCardio",
};

function formatPrice(price: number, locale: string): string {
  const symbol = locale === "en-US" ? " $" : " ₽";
  return price.toLocaleString(locale) + symbol;
}

function formatDateTime(ts: any, locale: string): string {
  if (!ts) return "—";
  const date = "toDate" in ts ? ts.toDate() : new Date();
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(date: string, locale: string): string {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "long" });
}

export default function BookingPage({ user }: Props) {
  const router = useRouter();
  const { t, language } = useTranslation();
  const locale = language === "en" ? "en-US" : "ru-RU";
  const [step, setStep] = useState<Step>("SELECT_TRAINER");

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [trainerBookedWorkouts, setTrainerBookedWorkouts] = useState<GroupWorkout[]>([]);
  const [myRequests, setMyRequests] = useState<TrainingRequest[]>([]);
  const [clientName, setClientName] = useState("");
  const [authReady, setAuthReady] = useState(false);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const duration = 60;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Дожидаемся, пока Firebase JS SDK подхватит сессию из IndexedDB —
  // иначе addDoc с правилом `clientId == auth.uid` может вернуть permission denied.
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (router.query.step === "requests") setStep("MY_REQUESTS");
  }, [router.query.step]);

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
          setTrainers(profilesList.filter((tr) => tr.userId));
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
        if (!cancelled) setError(toUserFacingMessage(e, language));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid, user.email, t, language]);

  useEffect(() => {
    if (success) {
      const id = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(id);
    }
  }, [success]);

  async function handleSelectTrainer(trainer: Trainer) {
    setSelectedTrainer(trainer);
    setAvailability([]);
    setTrainerBookedWorkouts([]);
    setSelectedSlotId(null);
    setSelectedHour(null);
    setError(null);
    setStep("VIEW_AVAILABILITY");
    const trainerUid = (trainer.userId || trainer.id || "").trim();
    if (!trainerUid) {
      setError(t("client.booking.loadFailed"));
      return;
    }
    try {
      const avail = await getTrainerAvailability(trainerUid);
      const today = todayISO();
      setAvailability(avail.filter((s) => s.date >= today && s.isAvailable));
      let booked: GroupWorkout[] = [];
      try {
        booked = await getTrainerIndividualWorkouts([trainer.userId, trainer.id].filter(Boolean) as string[]);
      } catch {
        booked = [];
      }
      setTrainerBookedWorkouts(booked);
    } catch {
      setError(t("client.booking.loadFailed"));
    }
  }

  function getHoursForSlot(slot: TrainerAvailability): number[] {
    const startH = parseInt(slot.startTime.split(":")[0] ?? "9", 10);
    const endH = parseInt(slot.endTime.split(":")[0] ?? "18", 10);
    const bookedHours = new Set<number>();
    trainerBookedWorkouts.forEach((w) => {
      const dt = w.dateTime.toDate();
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (dateStr === slot.date) bookedHours.add(dt.getHours());
    });
    const now = new Date();
    const [sy, sm, sd] = slot.date.split("-").map(Number);
    const result: number[] = [];
    for (let h = startH; h < endH; h++) {
      if (bookedHours.has(h)) continue;
      const slotStart = new Date(sy, (sm ?? 1) - 1, sd ?? 1, h, 0, 0, 0);
      if (slotStart.getTime() <= now.getTime()) continue;
      result.push(h);
    }
    return result;
  }

  const selectedSlot = useMemo(
    () => availability.find((s) => s.id === selectedSlotId) ?? null,
    [availability, selectedSlotId]
  );

  function backToAvailability() {
    setSelectedHour(null);
    setStep("VIEW_AVAILABILITY");
  }

  async function handleSubmit() {
    if (!selectedTrainer || !selectedSlot || selectedHour === null) return;

    if (!authReady) {
      setError(t("client.booking.loadFailed"));
      return;
    }

    const auth = getFirebaseAuth();
    const fbUid = auth.currentUser?.uid;
    if (!fbUid || fbUid !== user.uid) {
      setError(t("client.booking.loadFailed"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const [y, m, d] = selectedSlot.date.split("-").map(Number);
      const targetDate = new Date(y, (m ?? 1) - 1, d ?? 1);
      targetDate.setHours(selectedHour, 0, 0, 0);

      if (targetDate.getTime() <= Date.now()) {
        setError(t("client.booking.slotPast"));
        setSubmitting(false);
        return;
      }

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

      const trainerUid = (selectedTrainer.userId ?? selectedTrainer.id).trim();
      if (trainerUid) {
        try {
          const chatId = buildChatId(user.uid, trainerUid);
          const whenStr = `${formatDateLabel(selectedSlot.date, locale)}, ${String(selectedHour).padStart(2, "0")}:00`;
          const openMsg =
            language === "en"
              ? `Individual workout request with ${trainerFullName}. Time: ${whenStr}.`
              : `Заявка на индивидуальную тренировку с ${trainerFullName}. Время: ${whenStr}.`;
          const fullMsg = message.trim() ? `${openMsg}\n\n${message.trim()}` : openMsg;
          await sendChatMessage(chatId, user.uid, clientName, fullMsg);
        } catch {
          /* заявка уже создана */
        }
      }

      const updated = await getTrainingRequests({ clientId: user.uid });
      setMyRequests(updated);

      setSuccess(t("client.booking.success"));
      setSelectedSlotId(null);
      setSelectedHour(null);
      setMessage("");
      setStep("MY_REQUESTS");
    } catch (e: any) {
      setError(toUserFacingMessage(e, language));
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (step === "PICK_TIME") {
      backToAvailability();
    } else if (step === "VIEW_AVAILABILITY") {
      setSelectedSlotId(null);
      setSelectedTrainer(null);
      setStep("SELECT_TRAINER");
    } else if (step === "MY_REQUESTS") {
      setStep("SELECT_TRAINER");
    }
  }

  const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
    pending: { text: t("client.booking.statusPending"), cls: "bg-amber-100 text-amber-800" },
    approved: { text: t("client.booking.statusApproved"), cls: "bg-emerald-100 text-emerald-800" },
    rejected: { text: t("client.booking.statusRejected"), cls: "bg-red-100 text-red-700" },
  };

  return (
    <ClientLayout title={t("client.booking.title")}>
      <div className="space-y-4">
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-hsc-panel">
              {t("client.booking.individualHeader")}
            </h2>
            <Button
              size="sm"
              variant={step === "MY_REQUESTS" ? "primary" : "ghost"}
              onClick={() => setStep("MY_REQUESTS")}
            >
              {t("client.booking.myRequests")} ({myRequests.length})
            </Button>
          </div>
          <p className="text-xs text-slate-700">
            {t("client.booking.intro")}
          </p>
        </Card>

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

        {step !== "MY_REQUESTS" && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
            <span
              className={step === "SELECT_TRAINER" ? "text-hsc-panel font-bold" : "cursor-pointer hover:text-hsc-panel"}
              onClick={() => {
                setSelectedTrainer(null);
                setStep("SELECT_TRAINER");
              }}
            >
              {t("client.booking.step1")}
            </span>
            <span>→</span>
            <span
              className={`${step === "VIEW_AVAILABILITY" ? "text-hsc-panel font-bold" : ""} ${selectedTrainer ? "cursor-pointer hover:text-hsc-panel" : ""}`}
              onClick={() => { if (selectedTrainer) setStep("VIEW_AVAILABILITY"); }}
            >
              {t("client.booking.step2")}
            </span>
            <span>→</span>
            <span className={step === "PICK_TIME" ? "text-hsc-panel font-bold" : ""}>{t("client.booking.step3")}</span>
          </div>
        )}

        {loading ? (
          <Card className="text-xs text-slate-700">{t("client.booking.loading")}</Card>
        ) : step === "SELECT_TRAINER" ? (
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-hsc-panel">
              {t("client.booking.selectTrainer")}
            </h3>
            {trainers.length === 0 ? (
              <p className="text-xs text-slate-700">
                {t("client.booking.noTrainers")}
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {trainers.map((tr) => {
                  const fullName = [tr.lastName, tr.firstName, tr.middleName]
                    .filter(Boolean)
                    .join(" ");
                  const specLabelKey = SPEC_KEYS[tr.specialization];
                  const specLabel = specLabelKey ? t(specLabelKey) : tr.specialization;
                  const allSpecs = tr.specializations?.length
                    ? tr.specializations.map((s) => (SPEC_KEYS[s] ? t(SPEC_KEYS[s]) : s)).join(", ")
                    : specLabel;
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => handleSelectTrainer(tr)}
                      className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-left transition-colors hover:bg-emerald-50 hover:border-emerald-500/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            photoUrl={tr.photoUrl}
                            name={[tr.lastName, tr.firstName].filter(Boolean).join(" ")}
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
                            {formatPrice(tr.pricePerTraining, locale)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {t("client.booking.perTraining")}
                          </div>
                        </div>
                      </div>
                      {tr.experience > 0 && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          {t("client.booking.experience")}: {tr.experience} {t("client.booking.years")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        ) : step === "VIEW_AVAILABILITY" ? (
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={goBack}
                className="rounded-lg p-1 text-slate-500 hover:bg-emerald-50 hover:text-hsc-panel transition-colors"
              >
                ← {t("common.back")}
              </button>
              <h3 className="text-sm font-semibold text-hsc-panel">
                {t("client.booking.scheduleHeader")}: {selectedTrainer?.lastName} {selectedTrainer?.firstName}
              </h3>
            </div>

            {availability.length === 0 ? (
              <p className="text-xs text-slate-700">
                {t("client.booking.noSlots")}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  {t("client.booking.scheduleHint")}
                </p>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {availability.map((slot) => {
                    const isOpen = selectedSlotId === slot.id;
                    const hours = getHoursForSlot(slot);
                    return (
                      <div key={slot.id} className="rounded-xl border border-emerald-900/15 bg-white">
                        <button
                          type="button"
                          onClick={() => setSelectedSlotId(isOpen ? null : slot.id)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
                            isOpen ? "bg-emerald-50 rounded-t-xl" : "hover:bg-emerald-50/60 rounded-xl"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-hsc-panel">{formatDateLabel(slot.date, locale)}</div>
                            <div className="text-[11px] text-slate-600">
                              {slot.startTime} – {slot.endTime}{" "}
                              <span className="text-slate-400">| {t("client.booking.free")}: {hours.length}</span>
                            </div>
                          </div>
                          <span className="text-slate-400">{isOpen ? "▴" : "▾"}</span>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3">
                            {hours.length === 0 ? (
                              <p className="text-[11px] text-slate-500">{t("client.booking.noFreeHours")}</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {hours.map((hour) => (
                                  <button
                                    key={hour}
                                    type="button"
                                    onClick={() => {
                                      setSelectedHour(hour);
                                      setStep("PICK_TIME");
                                    }}
                                    className="rounded-xl px-3 py-2 text-xs font-semibold bg-white border border-emerald-900/15 text-hsc-panel hover:bg-emerald-50 transition-colors"
                                  >
                                    {String(hour).padStart(2, "0")}:00
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        ) : step === "PICK_TIME" ? (
          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={backToAvailability}
                className="rounded-lg p-1 text-slate-500 hover:bg-emerald-50 hover:text-hsc-panel transition-colors"
              >
                {t("client.booking.backToSchedule")}
              </button>
              <h3 className="text-sm font-semibold text-hsc-panel">
                {t("client.booking.confirmHeader")}
              </h3>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">{t("client.booking.trainer")}:</span>
                <span className="font-semibold text-hsc-panel">
                  {selectedTrainer?.lastName} {selectedTrainer?.firstName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("client.booking.specialization")}:</span>
                <span className="font-medium text-slate-800">
                  {selectedTrainer?.specialization && SPEC_KEYS[selectedTrainer.specialization]
                    ? t(SPEC_KEYS[selectedTrainer.specialization])
                    : selectedTrainer?.specialization}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("client.booking.dateTime")}:</span>
                <span className="font-medium text-slate-800">
                  {selectedSlot && selectedHour !== null
                    ? `${formatDateLabel(selectedSlot.date, locale)}, ${String(selectedHour).padStart(2, "0")}:00`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("client.booking.duration")}:</span>
                <span className="font-medium text-slate-800">60 {t("common.minutes")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("client.booking.price")}:</span>
                <span className="font-bold text-hsc-panel">
                  {formatPrice(selectedTrainer?.pricePerTraining ?? 0, locale)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                {t("client.booking.commentLabel")}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder={t("client.booking.commentPlaceholder")}
                className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hsc-panel focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--hsc-back)]"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={backToAvailability}
                className="flex-1"
              >
                {t("client.booking.toSchedule")}
              </Button>
              <Button
                disabled={submitting || !authReady}
                onClick={handleSubmit}
                className="flex-1"
              >
                {submitting ? t("client.booking.submitting") : t("client.booking.submit")}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={goBack}
                className="rounded-lg p-1 text-slate-500 hover:bg-emerald-50 hover:text-hsc-panel transition-colors"
              >
                ← {t("common.back")}
              </button>
              <h3 className="text-sm font-semibold text-hsc-panel">{t("client.booking.requestsHeader")}</h3>
            </div>

            {myRequests.length === 0 ? (
              <p className="text-xs text-slate-700">
                {t("client.booking.noRequests")}
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
                        <span>{formatDateTime(req.requestedDateTime, locale)}</span>
                        <span>{req.durationMinutes} {t("common.minutes")}</span>
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
              {t("client.booking.newRequest")}
            </Button>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "trainer", "admin", "manager"]);
