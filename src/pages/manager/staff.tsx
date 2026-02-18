import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { ManagerLayout } from "@/components/layout/ManagerLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getAllUsers, updateUserData } from "@/lib/db";
import { changeOwnPassword, getCsrfToken } from "@/lib/auth-client";
import type { User, UserRole } from "@/lib/models";

type Props = AuthedPageProps;

const STAFF_ROLES: UserRole[] = ["TRAINER", "ADMIN", "MANAGER"];

const ROLE_LABELS: Record<string, string> = {
  TRAINER: "Тренер",
  ADMIN: "Администратор",
  MANAGER: "Руководитель",
  CLIENT: "Клиент",
};

type Section = "staff" | "clients";

const ROLE_COLORS: Record<string, string> = {
  TRAINER: "bg-blue-100 text-blue-800",
  ADMIN: "bg-amber-100 text-amber-800",
  MANAGER: "bg-emerald-100 text-emerald-800",
};

type RoleFilter = "ALL" | UserRole;

export default function ManagerStaff({ user }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [section, setSection] = useState<Section>("staff");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<User | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", role: "TRAINER" as UserRole, lastName: "", firstName: "", middleName: "", phone: "" });
  const [creatingSaving, setCreatingSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllUsers();
      setUsers(all);
    } catch (e: any) {
      const msg = e?.message ?? "Ошибка загрузки";
      const isPermission = msg.toLowerCase().includes("permission") || e?.code === "permission-denied";
      setError(
        isPermission
          ? "Нет доступа к списку сотрудников. Разверните правила Firestore с правами для роли Руководитель (users: read для isManager)."
          : msg
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sourceUsers = section === "staff"
    ? users.filter((u) => STAFF_ROLES.includes(u.role))
    : users.filter((u) => u.role === "CLIENT");

  const filtered = sourceUsers
    .filter((u) => {
      if (section === "staff" && roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = [u.lastName, u.firstName, u.middleName]
        .join(" ")
        .toLowerCase();
      return name.includes(q) || u.email.toLowerCase().includes(q) || (u.phone ?? "").includes(q);
    })
    .sort((a, b) => {
      const na = [a.lastName, a.firstName].join(" ");
      const nb = [b.lastName, b.firstName].join(" ");
      return na.localeCompare(nb);
    });

  const stats = {
    trainers: users.filter((u) => u.role === "TRAINER").length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    managers: users.filter((u) => u.role === "MANAGER").length,
    clients: users.filter((u) => u.role === "CLIENT").length,
  };

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
        role: editing.role,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === editing.id ? editing : u))
      );
      setEditing(null);
    } catch (e: any) {
      setError(e?.message ?? "Ошибка сохранения");
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreateEmployee() {
    setCreatingSaving(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({
          email: createForm.email.trim(),
          password: createForm.password,
          role: createForm.role,
          lastName: createForm.lastName.trim(),
          firstName: createForm.firstName.trim(),
          middleName: createForm.middleName.trim(),
          phone: createForm.phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Ошибка создания");
      setCreating(false);
      setCreateForm({ email: "", password: "", role: "TRAINER", lastName: "", firstName: "", middleName: "", phone: "" });
      await load();
    } catch (e: any) {
      setCreateError(e?.message ?? "Ошибка создания сотрудника");
    } finally {
      setCreatingSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!passwordUser) return;
    const isSelf = passwordUser.id === user.uid;
    if (isSelf) {
      if (!passwordCurrent || !passwordNew || passwordNew !== passwordConfirm || passwordNew.length < 6) return;
      setPasswordSaving(true);
      setPasswordError(null);
      try {
        await changeOwnPassword(passwordCurrent, passwordNew, user.email ?? undefined);
        setPasswordUser(null);
        setPasswordCurrent("");
        setPasswordNew("");
        setPasswordConfirm("");
      } catch (e: any) {
        setPasswordError(e?.message ?? "Не удалось сменить пароль");
      } finally {
        setPasswordSaving(false);
      }
      return;
    }
    if (!passwordNew || passwordNew !== passwordConfirm || passwordNew.length < 6) return;
    setPasswordSaving(true);
    setPasswordError(null);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify({ targetUserId: passwordUser.id, newPassword: passwordNew }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Ошибка смены пароля");
      setPasswordUser(null);
      setPasswordNew("");
      setPasswordConfirm("");
    } catch (e: any) {
      setPasswordError(e?.message ?? "Ошибка смены пароля");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <ManagerLayout title="Персонал">
      <div className="space-y-4">
        {/* Вкладки: Сотрудники / Клиенты */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSection("staff")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              section === "staff" ? "bg-hsc-panel text-white" : "bg-white text-slate-700 border border-slate-200"
            }`}
          >
            Сотрудники
          </button>
          <button
            type="button"
            onClick={() => setSection("clients")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              section === "clients" ? "bg-hsc-panel text-white" : "bg-white text-slate-700 border border-slate-200"
            }`}
          >
            Клиенты
          </button>
        </div>

        {/* Статистика */}
        <div className={`grid gap-3 ${section === "staff" ? "grid-cols-3" : "grid-cols-1"}`}>
          {section === "staff" && (
            <>
              <Card className="space-y-0.5 text-center">
                <div className="text-xl font-black text-blue-600">{stats.trainers}</div>
                <div className="text-[10px] font-medium text-slate-600">Тренеров</div>
              </Card>
              <Card className="space-y-0.5 text-center">
                <div className="text-xl font-black text-amber-600">{stats.admins}</div>
                <div className="text-[10px] font-medium text-slate-600">Администраторов</div>
              </Card>
              <Card className="space-y-0.5 text-center">
                <div className="text-xl font-black text-hsc-panel">{stats.managers}</div>
                <div className="text-[10px] font-medium text-slate-600">Руководителей</div>
              </Card>
            </>
          )}
          {section === "clients" && (
            <Card className="space-y-0.5 text-center">
              <div className="text-xl font-black text-slate-700">{stats.clients}</div>
              <div className="text-[10px] font-medium text-slate-600">Клиентов</div>
            </Card>
          )}
        </div>

        {/* Фильтры */}
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-hsc-panel">
              {section === "staff" ? "Сотрудники" : "Клиенты"} ({filtered.length})
            </h2>
            {section === "staff" && (
              <Button size="sm" onClick={() => { setCreating(true); setCreateError(null); setCreateForm({ email: "", password: "", role: "TRAINER", lastName: "", firstName: "", middleName: "", phone: "" }); }}>
                + Создать сотрудника
              </Button>
            )}
          </div>
          <Input
            placeholder="Поиск по ФИО, email или телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {section === "staff" && (
            <div className="flex flex-wrap gap-1">
              {(["ALL", ...STAFF_ROLES] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                    roleFilter === r
                      ? "bg-hsc-panel text-white"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {r === "ALL" ? "Все" : ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          )}
        </Card>

        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Список */}
        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка...</Card>
        ) : (
          <Card className="max-h-[480px] space-y-2 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-slate-700">
                {section === "staff" ? "Сотрудники не найдены." : "Клиенты не найдены."}
              </p>
            )}
            {filtered.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar
                      photoUrl={u.photoUrl}
                      name={[u.lastName, u.firstName, u.middleName].filter(Boolean).join(" ") || undefined}
                      size="sm"
                    />
                    <div>
                      <span className="font-semibold text-hsc-panel">
                        {[u.lastName, u.firstName, u.middleName]
                          .filter(Boolean)
                          .join(" ") || "Без имени"}
                      </span>
                      {section === "staff" && (
                        <span
                          className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setPasswordUser(u); setPasswordCurrent(""); setPasswordNew(""); setPasswordConfirm(""); setPasswordError(null); }}
                      className="text-[10px]"
                    >
                      Пароль
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing({ ...u })}
                    >
                      Изменить
                    </Button>
                  </div>
                </div>
                <div className="mt-1 ml-10 text-[11px] text-slate-600">
                  {u.email}
                  {u.phone ? ` | ${u.phone}` : ""}
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Модалка редактирования */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3">
              <h3 className="text-sm font-bold text-hsc-panel">
                {editing.role === "CLIENT" ? "Редактирование клиента" : "Редактирование сотрудника"}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-600">Фамилия</label>
                  <Input
                    value={editing.lastName}
                    onChange={(e) =>
                      setEditing({ ...editing, lastName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600">Имя</label>
                  <Input
                    value={editing.firstName}
                    onChange={(e) =>
                      setEditing({ ...editing, firstName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Отчество</label>
                <Input
                  value={editing.middleName}
                  onChange={(e) =>
                    setEditing({ ...editing, middleName: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-600">Email</label>
                  <Input
                    value={editing.email}
                    onChange={(e) =>
                      setEditing({ ...editing, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600">Телефон</label>
                  <Input
                    value={editing.phone}
                    onChange={(e) =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              {editing.role !== "CLIENT" && (
                <div>
                  <label className="text-[10px] text-slate-600">Роль</label>
                  <select
                    value={editing.role}
                    onChange={(e) =>
                      setEditing({ ...editing, role: e.target.value as UserRole })
                    }
                    className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                  >
                    <option value="TRAINER">Тренер</option>
                    <option value="ADMIN">Администратор</option>
                    <option value="MANAGER">Руководитель</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  disabled={savingId === editing.id}
                  onClick={handleSaveEdit}
                >
                  {savingId === editing.id ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Модалка создания сотрудника */}
        {creating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3">
              <h3 className="text-sm font-bold text-hsc-panel">Создать сотрудника</h3>
              {createError && <div className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] text-red-700">{createError}</div>}
              <div>
                <label className="text-[10px] text-slate-600">Email *</label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Пароль * (не менее 6 символов)</label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Роль *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="block w-full rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm"
                >
                  <option value="TRAINER">Тренер</option>
                  <option value="ADMIN">Администратор</option>
                  <option value="MANAGER">Руководитель</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-600">Фамилия</label>
                  <Input value={createForm.lastName} onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-600">Имя</label>
                  <Input value={createForm.firstName} onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Отчество</label>
                <Input value={createForm.middleName} onChange={(e) => setCreateForm((f) => ({ ...f, middleName: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Телефон</label>
                <Input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+7 ..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setCreateError(null); }}>Отмена</Button>
                <Button
                  size="sm"
                  disabled={creatingSaving || !createForm.email.trim() || !createForm.password || createForm.password.length < 6}
                  onClick={handleCreateEmployee}
                >
                  {creatingSaving ? "Создание..." : "Создать"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Модалка смены пароля */}
        {passwordUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md space-y-3">
              <h3 className="text-sm font-bold text-hsc-panel">
                Сменить пароль {passwordUser.id === user.uid ? "(ваш пароль)" : `— ${[passwordUser.lastName, passwordUser.firstName].filter(Boolean).join(" ")}`}
              </h3>
              {passwordUser.id === user.uid && (
                <div>
                  <label className="text-[10px] text-slate-600">Текущий пароль</label>
                  <Input
                    type="password"
                    value={passwordCurrent}
                    onChange={(e) => { setPasswordCurrent(e.target.value); setPasswordError(null); }}
                    placeholder="••••••••"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] text-slate-600">Новый пароль (не менее 6 символов)</label>
                <Input
                  type="password"
                  value={passwordNew}
                  onChange={(e) => { setPasswordNew(e.target.value); setPasswordError(null); }}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600">Повторите новый пароль</label>
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => { setPasswordConfirm(e.target.value); setPasswordError(null); }}
                  placeholder="••••••••"
                />
              </div>
              {passwordError && <div className="text-[11px] text-red-600">{passwordError}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => { setPasswordUser(null); setPasswordError(null); setPasswordCurrent(""); setPasswordNew(""); setPasswordConfirm(""); }}>Отмена</Button>
                <Button
                  size="sm"
                  disabled={
                    passwordSaving ||
                    !passwordNew ||
                    passwordNew.length < 6 ||
                    passwordNew !== passwordConfirm ||
                    (passwordUser.id === user.uid && !passwordCurrent)
                  }
                  onClick={handleChangePassword}
                >
                  {passwordSaving ? "Сохранение..." : "Сменить пароль"}
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
