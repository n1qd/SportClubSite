import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { ManagerLayout } from "@/components/layout/ManagerLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getExpenses,
  addExpense,
  deleteExpense,
  getRevenues,
  addRevenue,
  getAllUserSubscriptions,
  getAllSubscriptions,
} from "@/lib/db";
import type { Expense, Revenue, ExpenseCategory } from "@/lib/models";
import { Timestamp } from "firebase/firestore";

type Props = AuthedPageProps;
type Tab = "expenses" | "revenue";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  salary: "Зарплата",
  marketing: "Маркетинг",
  repair: "Ремонт",
  equipment: "Оборудование",
  rent: "Аренда",
  other: "Прочее",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  salary: "bg-blue-100 text-blue-800",
  marketing: "bg-purple-100 text-purple-800",
  repair: "bg-orange-100 text-orange-800",
  equipment: "bg-cyan-100 text-cyan-800",
  rent: "bg-amber-100 text-amber-800",
  other: "bg-slate-100 text-slate-700",
};

export default function ManagerFinance({ user }: Props) {
  const [tab, setTab] = useState<Tab>("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [subscriptionIncome, setSubscriptionIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Модалка добавления расхода
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expForm, setExpForm] = useState({
    category: "other" as ExpenseCategory,
    amount: "",
    description: "",
  });

  // Модалка добавления дохода
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revForm, setRevForm] = useState({
    source: "",
    amount: "",
    description: "",
  });

  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [exp, rev, userSubs, subTemplates] = await Promise.all([
        getExpenses(),
        getRevenues(),
        getAllUserSubscriptions(),
        getAllSubscriptions(),
      ]);
      setExpenses(exp);
      setRevenues(rev);
      const byId = new Map(subTemplates.map((s) => [s.id, s.price]));
      const totalFromSubs = userSubs.reduce((sum, us) => sum + (byId.get(us.subscriptionId) ?? 0), 0);
      setSubscriptionIncome(totalFromSubs);
    } catch (e: any) {
      setError(e?.message ?? "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const totalWithSubscriptions = totalRevenue + subscriptionIncome;
  const profit = totalWithSubscriptions - totalExpenses;

  function fmt(n: number) {
    return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  }

  function fmtDate(ts: Timestamp | undefined) {
    if (!ts?.toDate) return "—";
    return ts.toDate().toLocaleDateString("ru-RU");
  }

  async function handleAddExpense() {
    if (!expForm.amount || Number(expForm.amount) <= 0) return;
    setSaving(true);
    try {
      await addExpense({
        category: expForm.category,
        amount: Number(expForm.amount),
        description: expForm.description,
        date: Timestamp.now(),
        createdBy: user.uid,
      });
      setExpForm({ category: "other", amount: "", description: "" });
      setShowExpenseModal(false);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Ошибка добавления расхода");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm("Удалить расход?")) return;
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (e: any) {
      setError(e?.message ?? "Ошибка удаления");
    }
  }

  async function handleAddRevenue() {
    if (!revForm.amount || Number(revForm.amount) <= 0 || !revForm.source) return;
    setSaving(true);
    try {
      await addRevenue({
        source: revForm.source,
        amount: Number(revForm.amount),
        description: revForm.description,
        date: Timestamp.now(),
      });
      setRevForm({ source: "", amount: "", description: "" });
      setShowRevenueModal(false);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Ошибка добавления дохода");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ManagerLayout title="Финансы">
      <div className="space-y-4">
        {/* Сводка */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="space-y-1 text-center">
            <div className="text-2xl font-black text-red-500">
              {fmt(totalExpenses)} ₽
            </div>
            <div className="text-[11px] font-medium text-slate-600">
              Расходы
            </div>
          </Card>
          <Card className="space-y-1 text-center">
            <div className="text-2xl font-black text-emerald-600">
              {fmt(totalRevenue)} ₽
            </div>
            <div className="text-[11px] font-medium text-slate-600">
              Доходы (ручные)
            </div>
          </Card>
          <Card className="space-y-1 text-center">
            <div className="text-2xl font-black text-emerald-600">
              {fmt(subscriptionIncome)} ₽
            </div>
            <div className="text-[11px] font-medium text-slate-600">
              От абонементов (выданных админом/руководителем)
            </div>
          </Card>
          <Card className="space-y-1 text-center">
            <div
              className={`text-2xl font-black ${
                profit >= 0 ? "text-hsc-panel" : "text-red-600"
              }`}
            >
              {profit >= 0 ? "+" : ""}
              {fmt(profit)} ₽
            </div>
            <div className="text-[11px] font-medium text-slate-600">
              Прибыль (доходы + абонементы − расходы)
            </div>
          </Card>
        </div>

        {/* Табы */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setTab("expenses")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tab === "expenses"
                    ? "bg-hsc-panel text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                Расходы ({expenses.length})
              </button>
              <button
                onClick={() => setTab("revenue")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tab === "revenue"
                    ? "bg-hsc-panel text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                Доходы ({revenues.length})
              </button>
            </div>
            <Button
              size="sm"
              onClick={() =>
                tab === "expenses"
                  ? setShowExpenseModal(true)
                  : setShowRevenueModal(true)
              }
            >
              + Добавить
            </Button>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="py-4 text-center text-xs text-slate-600">
              Загрузка...
            </p>
          ) : tab === "expenses" ? (
            <div className="max-h-[440px] space-y-2 overflow-y-auto">
              {expenses.length === 0 && (
                <p className="text-xs text-slate-600">Расходов пока нет.</p>
              )}
              {expenses.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-emerald-900/10 bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                        CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.other
                      }`}
                    >
                      {CATEGORY_LABELS[e.category] ?? e.category}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-hsc-panel">
                        {fmt(e.amount)} ₽
                      </div>
                      {e.description && (
                        <div className="text-[11px] text-slate-600">
                          {e.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">
                      {fmtDate(e.date)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteExpense(e.id)}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-[440px] space-y-2 overflow-y-auto">
              {revenues.length === 0 && (
                <p className="text-xs text-slate-600">Доходов пока нет.</p>
              )}
              {revenues.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-emerald-900/10 bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      {r.source || "Прочее"}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-emerald-700">
                        +{fmt(r.amount)} ₽
                      </div>
                      {r.description && (
                        <div className="text-[11px] text-slate-600">
                          {r.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {fmtDate(r.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Модалка: добавление расхода */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md space-y-3">
              <h3 className="text-sm font-bold text-hsc-panel">
                Новый расход
              </h3>
              <div>
                <label className="text-[10px] text-slate-600">Категория</label>
                <select
                  value={expForm.category}
                  onChange={(e) =>
                    setExpForm({
                      ...expForm,
                      category: e.target.value as ExpenseCategory,
                    })
                  }
                  className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                >
                  {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Сумма (₽)</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="10000"
                  value={expForm.amount}
                  onChange={(e) =>
                    setExpForm({ ...expForm, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Описание</label>
                <Input
                  placeholder="Описание расхода..."
                  value={expForm.description}
                  onChange={(e) =>
                    setExpForm({ ...expForm, description: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowExpenseModal(false)}
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={handleAddExpense}
                >
                  {saving ? "Сохранение..." : "Добавить"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Модалка: добавление дохода */}
        {showRevenueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md space-y-3">
              <h3 className="text-sm font-bold text-hsc-panel">
                Новый доход
              </h3>
              <div>
                <label className="text-[10px] text-slate-600">Источник</label>
                <select
                  value={revForm.source}
                  onChange={(e) =>
                    setRevForm({ ...revForm, source: e.target.value })
                  }
                  className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Выберите —</option>
                  <option value="subscription">Абонемент</option>
                  <option value="individual_training">
                    Индивидуальная тренировка
                  </option>
                  <option value="other">Прочее</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Сумма (₽)</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="5000"
                  value={revForm.amount}
                  onChange={(e) =>
                    setRevForm({ ...revForm, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Описание</label>
                <Input
                  placeholder="Описание дохода..."
                  value={revForm.description}
                  onChange={(e) =>
                    setRevForm({ ...revForm, description: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRevenueModal(false)}
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={handleAddRevenue}
                >
                  {saving ? "Сохранение..." : "Добавить"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["manager", "admin"]);
