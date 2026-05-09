import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getAllUsers, updateUserData, deleteUser, getAllSubscriptions, purchaseSubscription, addRevenue } from "@/lib/db";
import { adminChangeUserPassword } from "@/lib/auth-client";
import type { User, UserRole } from "@/lib/models";
import { formatRuDateInput, formatRuPhoneInput } from "@/lib/input-masks";
import type { Subscription } from "@/lib/models";
import { Timestamp } from "firebase/firestore";
import { useTranslation } from "@/contexts/LanguageContext";
import { toUserFacingMessage } from "@/lib/user-facing-error";

type Props = AuthedPageProps;
type SortField = "name" | "role" | "email";

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Клиент",
  TRAINER: "Тренер",
  ADMIN: "Администратор",
  MANAGER: "Руководитель"
};

const ROLE_COLORS: Record<string, string> = {
  CLIENT: "bg-emerald-100 text-emerald-800",
  TRAINER: "bg-blue-100 text-blue-800",
  ADMIN: "bg-amber-100 text-amber-800",
  MANAGER: "bg-violet-100 text-violet-800"
};

export default function AdminClients(_props: Props) {
  const { language } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<User | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addSubToUser, setAddSubToUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [addingSubId, setAddingSubId] = useState<string | null>(null);
  const [pwUser, setPwUser] = useState<User | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setUsers(await getAllUsers()); } catch (e: any) { setError(toUserFacingMessage(e, language)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (addSubToUser) {
      getAllSubscriptions().then(setSubscriptions).catch(() => setSubscriptions([]));
    }
  }, [addSubToUser]);

  const filtered = users
    .filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = [u.lastName, u.firstName, u.middleName].join(" ").toLowerCase();
      return name.includes(q) || u.email.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortField === "role") return a.role.localeCompare(b.role);
      if (sortField === "email") return a.email.localeCompare(b.email);
      const na = [a.lastName, a.firstName].join(" ");
      const nb = [b.lastName, b.firstName].join(" ");
      return na.localeCompare(nb);
    });

  const stats = {
    clients: users.filter((u) => u.role === "CLIENT").length,
    trainers: users.filter((u) => u.role === "TRAINER").length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    managers: users.filter((u) => u.role === "MANAGER").length
  };

  // Администратор может редактировать и удалять только клиентов
  const canEditUser = (role: UserRole) => role === "CLIENT";

  async function handleDelete(uid: string) {
    const user = users.find((u) => u.id === uid);
    if (!user || !canEditUser(user.role)) return;
    if (!confirm("Удалить пользователя?")) return;
    try {
      await deleteUser(uid);
      setUsers((prev) => prev.filter((u) => u.id !== uid));
    } catch (e: any) { setError(toUserFacingMessage(e, language)); }
  }

  async function handleAddSubscription(client: User, sub: Subscription) {
    setAddingSubId(sub.id);
    setError(null);
    try {
      await purchaseSubscription(client.id, sub);
      await addRevenue({
        source: "Абонемент",
        amount: sub.price,
        description: `${sub.name} (клиенту)`,
        date: Timestamp.now(),
      });
      setAddSubToUser(null);
    } catch (e: any) {
      setError(toUserFacingMessage(e, language));
    } finally {
      setAddingSubId(null);
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSavingId(editing.id);
    try {
      await updateUserData(editing.id, {
        lastName: editing.lastName,
        firstName: editing.firstName,
        middleName: editing.middleName,
        phone: editing.phone,
        email: editing.email,
        birthDate: editing.birthDate,
        role: editing.role,
        gender: editing.gender
      });
      setUsers((prev) => prev.map((u) => (u.id === editing.id ? editing : u)));
      setEditing(null);
    } catch (e: any) { setError(toUserFacingMessage(e, language)); }
    finally { setSavingId(null); }
  }

  return (
    <AdminLayout title="Управление пользователями">
      <div className="space-y-4">
        {/* Статистика */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="space-y-0.5 text-center">
            <div className="text-xl font-black text-hsc-panel">{stats.clients}</div>
            <div className="text-[10px] font-medium text-slate-600">Клиентов</div>
          </Card>
          <Card className="space-y-0.5 text-center">
            <div className="text-xl font-black text-hsc-panel">{stats.trainers}</div>
            <div className="text-[10px] font-medium text-slate-600">Тренеров</div>
          </Card>
          <Card className="space-y-0.5 text-center">
            <div className="text-xl font-black text-hsc-panel">{stats.admins}</div>
            <div className="text-[10px] font-medium text-slate-600">Админов</div>
          </Card>
          <Card className="space-y-0.5 text-center">
            <div className="text-xl font-black text-hsc-panel">{stats.managers}</div>
            <div className="text-[10px] font-medium text-slate-600">Руководителей</div>
          </Card>
        </div>

        {/* Фильтры */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-hsc-panel">Пользователи ({filtered.length})</h2>
          </div>
          <Input placeholder="Поиск по ФИО или email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1">
              {(["ALL", "CLIENT", "TRAINER", "ADMIN", "MANAGER"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                    roleFilter === r ? "bg-hsc-panel text-white" : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {r === "ALL" ? "Все" : ROLE_LABELS[r]}
                </button>
              ))}
            </div>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px]"
            >
              <option value="name">По имени</option>
              <option value="role">По роли</option>
              <option value="email">По email</option>
            </select>
          </div>
        </Card>

        {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка...</Card>
        ) : (
          <Card className="max-h-[480px] space-y-2 overflow-y-auto">
            {filtered.length === 0 && <p className="text-xs text-slate-700">Не найдено.</p>}
            {filtered.map((u) => (
              <div key={u.id} className="rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar
                      photoUrl={u.photoUrl}
                      name={[u.lastName, u.firstName, u.middleName].filter(Boolean).join(" ") || undefined}
                      size="sm"
                    />
                    <div>
                      <span className="font-semibold text-hsc-panel">
                        {[u.lastName, u.firstName, u.middleName].filter(Boolean).join(" ") || "Без имени"}
                      </span>
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-700"}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {u.role === "CLIENT" && (
                      <Button size="sm" variant="ghost" onClick={() => setAddSubToUser(u)} className="text-xs whitespace-nowrap shrink-0">
                        + Абонемент
                      </Button>
                    )}
                    {canEditUser(u.role) ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setEditing({
                              ...u,
                              phone: u.phone ? formatRuPhoneInput(u.phone) : "",
                              birthDate: u.birthDate ? formatRuDateInput(u.birthDate) : "",
                            })
                          }
                        >
                          Изменить
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPwUser(u);
                            setPwValue("");
                            setPwConfirm("");
                            setPwError(null);
                            setPwSuccess(false);
                          }}
                        >
                          Пароль
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)}>Удалить</Button>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400">Только просмотр</span>
                    )}
                  </div>
                </div>
                <div className="mt-1 ml-10 text-[11px] text-slate-600">
                  {u.email} {u.phone ? `| ${u.phone}` : ""} {u.birthDate ? `| ${u.birthDate}` : ""}
                  {u.gender && ` | ${u.gender === "MALE" ? "М" : "Ж"}`}
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Модалка редактирования */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3">
              <h3 className="text-sm font-bold text-hsc-panel">Редактирование пользователя</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-600">Фамилия</label>
                  <Input value={editing.lastName} onChange={(e) => setEditing({ ...editing, lastName: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600">Имя</label>
                  <Input value={editing.firstName} onChange={(e) => setEditing({ ...editing, firstName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Отчество</label>
                <Input value={editing.middleName} onChange={(e) => setEditing({ ...editing, middleName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-600">Email</label>
                  <Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600">Телефон</label>
                  <Input
                    value={editing.phone}
                    onChange={(e) => setEditing({ ...editing, phone: formatRuPhoneInput(e.target.value) })}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-600">Дата рождения</label>
                  <Input
                    value={editing.birthDate}
                    onChange={(e) => setEditing({ ...editing, birthDate: formatRuDateInput(e.target.value) })}
                    placeholder="ДД.ММ.ГГГГ"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600">Пол</label>
                  <select
                    value={editing.gender ?? "MALE"}
                    onChange={(e) => setEditing({ ...editing, gender: e.target.value as any })}
                    className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                  >
                    <option value="MALE">Мужской</option>
                    <option value="FEMALE">Женский</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Роль</label>
                <select
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value as any })}
                  className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                >
                  <option value="CLIENT">Клиент</option>
                  <option value="TRAINER">Тренер</option>
                  <option value="ADMIN">Администратор</option>
                  <option value="MANAGER">Руководитель</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Отмена</Button>
                <Button size="sm" disabled={savingId === editing.id} onClick={handleSaveEdit}>
                  {savingId === editing.id ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Модалка: добавить абонемент клиенту */}
        {addSubToUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3">
              <h3 className="text-sm font-bold text-hsc-panel">
                Добавить абонемент: {[addSubToUser.lastName, addSubToUser.firstName].filter(Boolean).join(" ") || addSubToUser.email}
              </h3>
              {subscriptions.length === 0 ? (
                <p className="text-xs text-slate-600">Нет доступных шаблонов абонементов.</p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="mr-1">{sub.iconEmoji}</span>
                        <span className="font-semibold text-hsc-panel">{sub.name}</span>
                        <span className="ml-2 text-slate-500">{sub.price.toLocaleString("ru-RU")} ₽ / {sub.durationDays} дн.</span>
                      </div>
                      <Button
                        size="sm"
                        disabled={addingSubId === sub.id}
                        onClick={() => handleAddSubscription(addSubToUser, sub)}
                        className="text-xs whitespace-nowrap shrink-0 min-w-0"
                      >
                        {addingSubId === sub.id ? "..." : "Добавить"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button size="sm" variant="ghost" onClick={() => { setAddSubToUser(null); setError(null); }}>
                  Закрыть
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Модалка: смена пароля клиента */}
        {pwUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3">
              <h3 className="text-sm font-bold text-hsc-panel">
                Сменить пароль: {[pwUser.lastName, pwUser.firstName].filter(Boolean).join(" ") || pwUser.email}
              </h3>
              <p className="text-[11px] text-slate-600">
                Внимание: пароль будет немедленно изменён в Firebase Auth. Сообщите его пользователю безопасным способом.
              </p>
              <div>
                <label className="text-[10px] text-slate-600">Новый пароль</label>
                <Input
                  type="password"
                  value={pwValue}
                  onChange={(e) => { setPwValue(e.target.value); setPwError(null); }}
                  placeholder="не менее 6 символов"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Подтверждение</label>
                <Input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => { setPwConfirm(e.target.value); setPwError(null); }}
                  placeholder="повторите пароль"
                />
              </div>
              {pwError && <div className="text-[11px] text-red-600">{pwError}</div>}
              {pwSuccess && <div className="text-[11px] text-emerald-600">Пароль успешно изменён.</div>}
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => { setPwUser(null); setPwError(null); setPwSuccess(false); }}>
                  Закрыть
                </Button>
                <Button
                  size="sm"
                  disabled={pwSaving || pwValue.length < 6 || pwValue !== pwConfirm}
                  onClick={async () => {
                    if (!pwUser) return;
                    setPwSaving(true);
                    setPwError(null);
                    setPwSuccess(false);
                    try {
                      await adminChangeUserPassword(pwUser.id, pwValue);
                      setPwSuccess(true);
                      setPwValue("");
                      setPwConfirm("");
                    } catch (e: unknown) {
                      setPwError(e instanceof Error ? e.message : "Не удалось сменить пароль.");
                    } finally {
                      setPwSaving(false);
                    }
                  }}
                >
                  {pwSaving ? "Сохранение..." : "Сменить пароль"}
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
