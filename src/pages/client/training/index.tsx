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
} from "@/lib/db";
import type { GroupWorkout } from "@/lib/models";
import { useTranslation } from "@/contexts/LanguageContext";
import { toUserFacingMessage } from "@/lib/user-facing-error";

type Props = AuthedPageProps;

type Tab = "MY" | "BOOK";
type BookSub = "GROUP" | "INDIVIDUAL";

function formatDate(ts: any, locale: string) {
  const date = ts && "toDate" in ts ? ts.toDate() : new Date();
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function TrainingPage({ user }: Props) {
  const { t, language } = useTranslation();
  const locale = language === "en" ? "en-US" : "ru-RU";
  const [tab, setTab] = useState<Tab>("MY");
  const [bookSub, setBookSub] = useState<BookSub>("GROUP");
  const [workouts, setWorkouts] = useState<GroupWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function reload() {
    const list = await getAllGroupWorkouts();
    setWorkouts(list);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (e: unknown) {
        if (!cancelled) setError(toUserFacingMessage(e, language));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid, language]);

  const now = useMemo(() => new Date(), []);

  const myWorkouts = useMemo(() => {
    return workouts
      .filter((w) => {
        const isIndividual = w.isIndividual || (w.maxParticipants === 1 && !!w.clientId);
        const isMineIndividual = isIndividual && w.clientId === user.uid;
        const isSignedGroup = !isIndividual && (w.participantIds ?? []).includes(user.uid);
        return (isMineIndividual || isSignedGroup) && (w.dateTime?.toDate?.() ?? new Date()) >= now;
      })
      .sort((a, b) => a.dateTime.toMillis() - b.dateTime.toMillis());
  }, [workouts, user.uid, now]);

  const groupWorkouts = useMemo(() => {
    const in14Days = new Date(now);
    in14Days.setDate(in14Days.getDate() + 14);
    return workouts
      .filter((w) => {
        if (w.isIndividual) return false;
        const dt = w.dateTime?.toDate?.() ?? new Date();
        return dt >= now && dt <= in14Days;
      })
      .sort((a, b) => a.dateTime.toMillis() - b.dateTime.toMillis());
  }, [workouts, now]);

  async function handleSignUp(w: GroupWorkout) {
    setActionLoadingId(w.id);
    setError(null);
    try {
      await signUpForWorkout(w.id, user.uid);
      await reload();
    } catch (e: unknown) {
      setError(toUserFacingMessage(e, language));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(w: GroupWorkout) {
    setActionLoadingId(w.id);
    setError(null);
    try {
      await cancelWorkoutSignUp(w.id, user.uid);
      await reload();
    } catch (e: unknown) {
      setError(toUserFacingMessage(e, language));
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <ClientLayout title={t("client.training.title")}>
      <div className="space-y-4">
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-hsc-panel">{t("client.training.title")}</h2>
          <p className="text-xs text-slate-700">{t("client.training.intro")}</p>
        </Card>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[color:var(--hsc-surface)] p-1">
          <button
            type="button"
            onClick={() => setTab("MY")}
            className={`rounded-lg py-2 text-xs font-semibold ${
              tab === "MY" ? "bg-[color:var(--hsc-panel)] text-white shadow" : "text-slate-700"
            }`}
          >
            {t("client.training.tabMy")} ({myWorkouts.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("BOOK")}
            className={`rounded-lg py-2 text-xs font-semibold ${
              tab === "BOOK" ? "bg-[color:var(--hsc-panel)] text-white shadow" : "text-slate-700"
            }`}
          >
            {t("client.training.tabBook")}
          </button>
        </div>

        {tab === "BOOK" && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-emerald-50 p-1">
            <button
              type="button"
              onClick={() => setBookSub("GROUP")}
              className={`rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                bookSub === "GROUP" ? "bg-white text-hsc-panel shadow-sm" : "text-slate-600"
              }`}
            >
              {t("client.training.subTabGroup")}
            </button>
            <button
              type="button"
              onClick={() => setBookSub("INDIVIDUAL")}
              className={`rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                bookSub === "INDIVIDUAL" ? "bg-white text-hsc-panel shadow-sm" : "text-slate-600"
              }`}
            >
              {t("client.training.subTabIndividual")}
            </button>
          </div>
        )}

        {error && (
          <Card className="border border-red-200 bg-red-50 text-xs text-red-700">{error}</Card>
        )}

        {loading ? (
          <Card className="text-xs text-slate-700">{t("client.training.loading")}</Card>
        ) : tab === "MY" ? (
          <Card className="space-y-2">
            <h3 className="text-sm font-semibold text-hsc-panel">{t("client.training.upcoming")}</h3>
            {myWorkouts.length === 0 ? (
              <p className="text-xs text-slate-700">{t("client.training.noUpcoming")}</p>
            ) : (
              <div className="space-y-2">
                {myWorkouts.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl border border-emerald-900/15 bg-emerald-50 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-hsc-panel">
                        {w.isIndividual ? t("client.training.individualWorkout") : w.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatDate(w.dateTime, locale)}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-700">
                      <span>{t("common.trainer")}: {w.trainerName}</span>
                      <span>{t("common.duration")}: {w.durationMinutes} {t("common.minutes")}</span>
                    </div>
                    {!w.isIndividual && (
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionLoadingId === w.id}
                          onClick={() => handleCancel(w)}
                        >
                          {actionLoadingId === w.id ? t("client.training.cancelling") : t("client.training.cancel")}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : bookSub === "INDIVIDUAL" ? (
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-hsc-panel">{t("client.training.individualHeader")}</h3>
            <p className="text-xs text-slate-700">{t("client.training.individualIntro")}</p>
            <Button href="/client/booking" size="sm">
              {t("client.training.bookTrainer")}
            </Button>
          </Card>
        ) : (
          <Card className="space-y-2">
            <h3 className="text-sm font-semibold text-hsc-panel">{t("client.training.groupHeader")}</h3>
            {groupWorkouts.length === 0 ? (
              <p className="text-xs text-slate-700">{t("client.training.groupEmpty")}</p>
            ) : (
              <div className="space-y-2">
                {groupWorkouts.map((w) => {
                  const signedUp = (w.participantIds ?? []).includes(user.uid);
                  const isFull = (w.currentParticipants ?? 0) >= (w.maxParticipants ?? 20);
                  const cls = signedUp
                    ? "rounded-xl border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-xs"
                    : "rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-xs";
                  return (
                    <div key={w.id} className={cls}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-hsc-panel">
                          {w.name}
                          {signedUp && (
                            <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-medium text-white">
                              {t("client.training.signedUp")}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{formatDate(w.dateTime, locale)}</div>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-700">{w.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-700">
                        <span>{t("common.trainer")}: {w.trainerName}</span>
                        <span>{t("common.duration")}: {w.durationMinutes} {t("common.minutes")}</span>
                        <span>
                          {t("client.training.participants")}: {w.currentParticipants}/{w.maxParticipants}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-end">
                        {signedUp ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={actionLoadingId === w.id}
                            onClick={() => handleCancel(w)}
                          >
                            {actionLoadingId === w.id ? t("client.training.cancelling") : t("client.training.cancel")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isFull || actionLoadingId === w.id}
                            onClick={() => handleSignUp(w)}
                          >
                            {isFull
                              ? t("client.training.full")
                              : actionLoadingId === w.id
                                ? t("client.training.signingUp")
                                : t("client.training.signUp")}
                          </Button>
                        )}
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
