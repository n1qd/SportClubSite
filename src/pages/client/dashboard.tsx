import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { pointerToFixedPosition } from "@/components/chat/chat-utils";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getUserSubscriptions,
  getAllGroupWorkouts,
  getNutritionSummary,
  getGymVisits,
  type DailyNutritionSummary,
} from "@/lib/db";
import type { UserSubscription, GroupWorkout, GymVisit } from "@/lib/models";
import { useTranslation } from "@/contexts/LanguageContext";

type Props = AuthedPageProps;

function toDisplayDate(ts: unknown): Date {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts === "object" && "toDate" in ts && typeof (ts as { toDate: () => Date }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate();
  }
  return new Date(ts as string | number);
}

function formatDate(ts: unknown, locale: string) {
  const date = toDisplayDate(ts);
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatShortDate(ts: unknown, locale: string) {
  const date = toDisplayDate(ts);
  return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS_RU = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const WEEKDAYS_EN = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

interface CalendarCell {
  key: string;
  inMonth: boolean;
  day: number;
  isToday: boolean;
  visit?: GymVisit;
}

interface DayPopupState {
  dateKey: string;
  x: number;
  y: number;
}

function buildMonthGrid(year: number, month: number, visits: GymVisit[]): CalendarCell[] {
  const visitMap = new Map(visits.map((v) => [v.date, v]));
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayK = todayKey();
  const cells: CalendarCell[] = [];

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const py = month === 0 ? year - 1 : year;
    const pm = month === 0 ? 11 : month - 1;
    const key = `${py}-${String(pm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key, inMonth: false, day, isToday: key === todayK });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key, inMonth: true, day, isToday: key === todayK, visit: visitMap.get(key) });
  }

  while (cells.length % 7 !== 0) {
    const prev = cells[cells.length - 1];
    const [yy, mm, dd] = prev.key.split("-").map(Number);
    const next = new Date(yy, (mm ?? 1) - 1, (dd ?? 1) + 1);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    cells.push({ key, inMonth: false, day: next.getDate(), isToday: key === todayK });
  }
  return cells;
}

function remainingDays(ts: any): number {
  if (!ts) return 0;
  const end = ts && "toDate" in ts ? ts.toDate() : new Date();
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function ClientDashboard({ user }: Props) {
  const { t, language } = useTranslation();
  const months = language === "en" ? MONTHS_EN : MONTHS_RU;
  const weekdays = language === "en" ? WEEKDAYS_EN : WEEKDAYS_RU;
  const locale = language === "en" ? "en-US" : "ru-RU";

  const [subs, setSubs] = useState<UserSubscription[]>([]);
  const [workouts, setWorkouts] = useState<GroupWorkout[]>([]);
  const [foodSummary, setFoodSummary] = useState<DailyNutritionSummary[]>([]);
  const [visits, setVisits] = useState<GymVisit[]>([]);
  const [calMonth, setCalMonth] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [dayPopup, setDayPopup] = useState<DayPopupState | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, w, summary, gv] = await Promise.all([
          getUserSubscriptions(user.uid),
          getAllGroupWorkouts(),
          getNutritionSummary(user.uid, 30),
          getGymVisits(user.uid),
        ]);
        if (!cancelled) {
          setSubs(s);
          setWorkouts(w);
          setFoodSummary(summary);
          const todayK = todayKey();
          setVisits(gv.filter((v) => v.date <= todayK));
        }
      } catch {
        // soft-ignore: dashboard is non-critical
      }
    })();
    return () => { cancelled = true; };
  }, [user.uid]);

  const activeSubs = subs.filter((s) => s.active && remainingDays(s.endDate) > 0);

  const now = useMemo(() => new Date(), []);

  const upcomingMyWorkouts = useMemo(() => {
    return workouts
      .filter((w) => {
        const isIndividual = w.isIndividual || (w.maxParticipants === 1 && !!w.clientId);
        const isMineIndividual = isIndividual && w.clientId === user.uid;
        const isSignedGroup = !isIndividual && (w.participantIds ?? []).includes(user.uid);
        return (isMineIndividual || isSignedGroup) && (w.dateTime?.toDate?.() ?? new Date()) >= now;
      })
      .map((w) => ({
        id: w.id,
        date: w.dateTime?.toDate?.() ?? new Date(),
        name: w.isIndividual ? t("client.dashboard.individualWorkout") : w.name,
        trainerName: w.trainerName,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [workouts, user.uid, now, t]);

  const todayFood = useMemo(() => {
    const today = todayKey();
    return foodSummary.find((d) => d.date === today);
  }, [foodSummary]);

  // Среднее в день — считается только по дням, в которых были записи в дневнике.
  const averageDaily = useMemo(() => {
    if (foodSummary.length === 0) return null;
    const totals = foodSummary.reduce(
      (acc, d) => ({
        calories: acc.calories + d.calories,
        proteins: acc.proteins + d.proteins,
        fats: acc.fats + d.fats,
        carbs: acc.carbs + d.carbs,
      }),
      { calories: 0, proteins: 0, fats: 0, carbs: 0 }
    );
    const days = foodSummary.length;
    return {
      days,
      calories: totals.calories / days,
      proteins: totals.proteins / days,
      fats: totals.fats / days,
      carbs: totals.carbs / days,
    };
  }, [foodSummary]);

  const calendarCells = useMemo(
    () => buildMonthGrid(calMonth.year, calMonth.month, visits),
    [calMonth, visits]
  );

  const selectedVisit = useMemo(
    () => (dayPopup ? visits.find((v) => v.date === dayPopup.dateKey) : null),
    [dayPopup, visits]
  );

  useEffect(() => {
    if (!dayPopup) return;

    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      setDayPopup(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDayPopup(null);
    }
    function onScroll() {
      setDayPopup(null);
    }

    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [dayPopup]);

  useLayoutEffect(() => {
    if (!dayPopup || !popupRef.current) return;
    const el = popupRef.current;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let { x, y } = dayPopup;
    if (rect.right > window.innerWidth - pad) {
      x -= rect.right - (window.innerWidth - pad);
    }
    if (rect.bottom > window.innerHeight - pad) {
      y -= rect.bottom - (window.innerHeight - pad);
    }
    x = Math.max(pad, x);
    y = Math.max(pad, y);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [dayPopup]);

  function handleDayClick(e: React.MouseEvent, cell: CalendarCell) {
    if (!cell.visit) {
      setDayPopup(null);
      return;
    }
    e.stopPropagation();
    const { x, y } = pointerToFixedPosition(e.clientX, e.clientY);
    setDayPopup({ dateKey: cell.key, x: x + 12, y: y + 12 });
  }

  function shiftMonth(delta: number) {
    setCalMonth((cur) => {
      const d = new Date(cur.year, cur.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setDayPopup(null);
  }

  function goToToday() {
    const d = new Date();
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setDayPopup(null);
  }

  const isCurrentMonth = useMemo(() => {
    const d = new Date();
    return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month;
  }, [calMonth]);

  return (
    <ClientLayout title={t("client.dashboard.title")}>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Слева сверху: ближайшие тренировки */}
        <Card className="flex max-h-[240px] flex-col space-y-3 overflow-hidden">
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-sm font-semibold text-hsc-panel">
              {t("client.dashboard.upcomingWorkouts")}
            </h2>
            <Link href="/client/training" className="text-[11px] text-emerald-700 underline">
              {t("client.dashboard.allTrainings")}
            </Link>
          </div>
          {upcomingMyWorkouts.length === 0 ? (
            <p className="text-xs text-slate-700">{t("client.dashboard.noUpcoming")}</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="flex flex-col gap-1.5">
                {upcomingMyWorkouts.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-slate-700"
                  >
                    <span className="min-w-0 truncate font-medium text-slate-800">
                      {w.name}
                      {w.trainerName ? ` — ${w.trainerName}` : ""}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">{formatDate(w.date, locale)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Справа сверху: мои абонементы */}
        <Card className="flex max-h-[240px] flex-col space-y-3 overflow-hidden">
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-sm font-semibold text-hsc-panel">{t("client.dashboard.mySubs")}</h2>
            <Link href="/client/subscriptions" className="text-[11px] text-emerald-700 underline">
              {t("client.dashboard.allSubs")}
            </Link>
          </div>
          {activeSubs.length === 0 ? (
            <p className="text-xs text-slate-700">{t("client.dashboard.noActiveSubs")}</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="flex flex-col gap-3">
                {activeSubs.map((s) => {
                  const days = remainingDays(s.endDate);
                  return (
                    <Link
                      key={s.id}
                      href="/client/subscriptions"
                      className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-hsc-panel to-emerald-800 px-4 py-2.5 text-white transition-transform hover:scale-[1.01]"
                    >
                      <span className="shrink-0 text-2xl leading-none">{s.subscriptionIconEmoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold leading-tight">{s.subscriptionName}</div>
                        <div className="text-[10px] leading-tight text-emerald-100">
                          {t("common.until")} {formatShortDate(s.endDate, locale)}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-lg bg-white/20 px-2.5 py-1.5 text-center">
                        <div className="text-lg font-black leading-none">{days}</div>
                        <div className="text-[9px] leading-tight">{t("common.days")}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Слева снизу: БЖУ-сводка */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-hsc-panel">{t("client.dashboard.bjuSummary")}</h2>
            <Link href="/client/nutrition" className="text-[11px] text-emerald-700 underline">{t("client.dashboard.bjuMore")}</Link>
          </div>

          <div className="flex w-full flex-col gap-3">
            <div className="w-full rounded-xl bg-emerald-50 px-4 py-3.5">
              <div className="text-[11px] font-semibold uppercase text-emerald-800">{t("client.dashboard.todayDiary")}</div>
              {todayFood ? (
                <>
                  <div className="mt-2.5 grid w-full grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{Math.round(todayFood.calories)}</div>
                      <div className="text-[9px] text-slate-500">{t("client.dashboard.kcal")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{todayFood.proteins.toFixed(0)}</div>
                      <div className="text-[9px] text-slate-500">{t("client.dashboard.proteins")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{todayFood.fats.toFixed(0)}</div>
                      <div className="text-[9px] text-slate-500">{t("client.dashboard.fats")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{todayFood.carbs.toFixed(0)}</div>
                      <div className="text-[9px] text-slate-500">{t("client.dashboard.carbs")}</div>
                    </div>
                  </div>
                  <div className="mt-1.5 min-h-[14px]" aria-hidden="true" />
                </>
              ) : (
                <p className="mt-2.5 text-xs text-slate-700">
                  {t("client.dashboard.noFoodToday")}
                </p>
              )}
            </div>

            <div className="w-full rounded-xl bg-emerald-50 px-4 py-3.5">
              <div className="text-[11px] font-semibold uppercase text-emerald-800">{t("client.dashboard.avgDaily")}</div>
              {averageDaily ? (
                <>
                  <div className="mt-2.5 grid w-full grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{Math.round(averageDaily.calories)}</div>
                      <div className="text-[9px] text-slate-500">{t("client.dashboard.kcal")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{averageDaily.proteins.toFixed(0)}</div>
                      <div className="text-[9px] text-slate-500">{t("client.dashboard.proteins")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{averageDaily.fats.toFixed(0)}</div>
                      <div className="text-[9px] text-slate-500">{t("client.dashboard.fats")}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-hsc-panel">{averageDaily.carbs.toFixed(0)}</div>
                      <div className="text-[9px] text-slate-500">{t("client.dashboard.carbs")}</div>
                    </div>
                  </div>
                  <div className="mt-1.5 min-h-[14px] text-[10px] text-slate-500">
                    {t("client.dashboard.basedOnDays").replace("{n}", String(averageDaily.days))}
                  </div>
                </>
              ) : (
                <p className="mt-2.5 text-xs text-slate-700">
                  {t("client.dashboard.noFoodHistory")}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Справа снизу: календарь активности */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-hsc-panel">{t("client.dashboard.visitsCalendar")}</h2>
            <button
              type="button"
              onClick={goToToday}
              disabled={isCurrentMonth}
              className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("common.today")}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 text-xs">
            <button onClick={() => shiftMonth(-1)} className="rounded-lg px-2 py-1 hover:bg-emerald-50">‹</button>
            <span className="min-w-[130px] text-center font-medium text-hsc-panel">
              {months[calMonth.month]} {calMonth.year}
            </span>
            <button onClick={() => shiftMonth(1)} className="rounded-lg px-2 py-1 hover:bg-emerald-50">›</button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-slate-500">
            {weekdays.map((w) => (
              <div key={w} className="py-0.5 font-semibold uppercase">{w}</div>
            ))}
            {calendarCells.map((c) => {
              const visited = !!c.visit;
              const isSelected = dayPopup?.dateKey === c.key;
              let cellClass = "";
              if (isSelected) {
                cellClass = "bg-emerald-600 text-white font-semibold";
              } else if (c.isToday && c.inMonth) {
                cellClass = "bg-amber-400 text-amber-950 font-bold ring-1 ring-amber-500 hover:bg-amber-300";
              } else if (visited) {
                cellClass = "bg-emerald-100 text-emerald-900 font-semibold hover:bg-emerald-200";
              }
              const baseColor = !c.inMonth && !cellClass ? "text-slate-300" : !cellClass ? "text-slate-700" : "";
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={(e) => handleDayClick(e, c)}
                  className={`relative aspect-square rounded-md text-[10px] transition-colors ${baseColor} ${cellClass} ${!visited ? "cursor-default" : ""}`}
                >
                  <span>{c.day}</span>
                  {visited && (
                    <span
                      className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                        isSelected ? "bg-white" : c.isToday ? "bg-amber-900" : "bg-emerald-600 dark:bg-emerald-300"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

        </Card>
      </div>

      {dayPopup &&
        selectedVisit &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              left: dayPopup.x,
              top: dayPopup.y,
              zIndex: 9999,
            }}
            className="w-52 rounded-xl border border-emerald-200 bg-white p-2.5 text-xs text-slate-800 shadow-lg"
          >
            <div className="text-[11px] font-semibold text-hsc-panel">
              {new Date(`${selectedVisit.date}T12:00:00`).toLocaleDateString(locale, {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </div>
            <ul className="mt-1 space-y-0.5">
              {selectedVisit.workoutNames.map((n, i) => (
                <li key={i} className="text-[11px]">
                  • {n}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "admin", "manager"]);
