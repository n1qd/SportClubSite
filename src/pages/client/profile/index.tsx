import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getCurrentUser,
  updateUserContact,
  updateUserHealth,
  updateUserData,
  getUserSubscriptions,
  getAvailableSubscriptions,
  getAllTrainers
} from "@/lib/db";
import { uploadAvatar, avatarPathUsers } from "@/lib/storage";
import { changeOwnPassword } from "@/lib/auth-client";
import type { User, UserSubscription, Subscription, Trainer } from "@/lib/models";
import { Avatar } from "@/components/ui/Avatar";

type Props = AuthedPageProps;
type Section = "info" | "health" | "subs" | "trainers" | "settings";

const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Похудение",
  MUSCLE_GAIN: "Набор массы",
  MAINTENANCE: "Поддержание формы"
};

const SPEC_LABELS: Record<string, string> = {
  FITNESS: "Фитнес",
  BODYBUILDING: "Бодибилдинг",
  CROSSFIT: "Кроссфит",
  YOGA: "Йога",
  PILATES: "Пилатес",
  BOXING: "Бокс",
  SWIMMING: "Плавание",
  CARDIO: "Кардио"
};

function computeBMI(weight?: number, height?: number): string {
  if (!weight || !height || height < 1) return "—";
  const h = height / 100;
  return (weight / (h * h)).toFixed(1);
}

function computeAge(birthDate: string): number {
  if (!birthDate) return 0;
  const parts = birthDate.split(".");
  if (parts.length !== 3) return 0;
  const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) {
    age--;
  }
  return age > 0 ? age : 0;
}

function remainingDays(ts: any): number {
  if (!ts) return 0;
  const end = "toDate" in ts ? ts.toDate() : new Date();
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(ts: any): string {
  if (!ts) return "—";
  const d = "toDate" in ts ? ts.toDate() : new Date();
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ProfilePage({ user }: Props) {
  const [section, setSection] = useState<Section>("info");
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Поля формы
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user.email ?? "");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("MAINTENANCE");

  // Данные для разделов
  const [mySubs, setMySubs] = useState<UserSubscription[]>([]);
  const [availSubs, setAvailSubs] = useState<Subscription[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [u, ms, avs, tr] = await Promise.all([
          getCurrentUser(user.uid),
          getUserSubscriptions(user.uid),
          getAvailableSubscriptions(),
          getAllTrainers()
        ]);
        if (cancelled) return;
        setProfile(u);
        setMySubs(ms);
        setAvailSubs(avs);
        setTrainers(tr);
        if (u) {
          setPhone(u.phone ?? "");
          setEmail(u.email ?? user.email ?? "");
          setGender((u.gender as any) || "MALE");
          setWeight(u.weight ? String(u.weight) : "");
          setHeight(u.height ? String(u.height) : "");
          setFitnessGoal(u.fitnessGoal ?? "MAINTENANCE");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.uid, user.email]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  async function saveContact() {
    setSaving(true); setError(null);
    try {
      await updateUserContact(user.uid, phone, email);
      setSuccess("Контакты сохранены");
    } catch (e: any) { setError(e?.message ?? "Ошибка"); }
    finally { setSaving(false); }
  }

  async function saveHealth() {
    setSaving(true); setError(null);
    try {
      await updateUserHealth(user.uid, gender, parseFloat(weight || "0"), parseFloat(height || "0"), fitnessGoal);
      setSuccess("Данные здоровья сохранены");
    } catch (e: any) { setError(e?.message ?? "Ошибка"); }
    finally { setSaving(false); }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingPhoto(true);
    setError(null);
    setSuccess(null);
    setPhotoError(null);
    const inputEl = e.target;
    const forceStopTimer = setTimeout(() => {
      setUploadingPhoto(false);
    }, 15000);
    try {
      const url = await uploadAvatar(avatarPathUsers(user.uid), file);
      // Для data URL не добавляем ?t= — это ломает base64; cache-bust только для http(s)
      const urlToSave = url.startsWith("data:") ? url : url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
      await updateUserData(user.uid, { photoUrl: urlToSave });
      setProfile((prev) => (prev ? { ...prev, photoUrl: urlToSave } : null));
      setSuccess("Фото обновлено");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Не удалось загрузить фото. Включите Firebase Storage и выполните firebase deploy --only storage.";
      setError(msg);
      setPhotoError(msg);
    } finally {
      clearTimeout(forceStopTimer);
      setUploadingPhoto(false);
      inputEl.value = "";
    }
  }


  const sections: { key: Section; label: string; icon: string }[] = [
    { key: "info", label: "Личные данные", icon: "👤" },
    { key: "health", label: "Здоровье", icon: "❤️" },
    { key: "subs", label: "Абонементы", icon: "🎫" },
    { key: "trainers", label: "Тренеры", icon: "🏃" },
    { key: "settings", label: "Настройки", icon: "⚙️" }
  ];

  const activeSubs = mySubs.filter((s) => s.active && remainingDays(s.endDate) > 0);
  const bmi = computeBMI(profile?.weight, profile?.height);
  const age = profile ? computeAge(profile.birthDate) : 0;

  return (
    <ClientLayout title="Профиль">
      <div className="space-y-4">
        {/* Навигация по разделам */}
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-[color:var(--hsc-surface)] p-1">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                section === s.key
                  ? "bg-[color:var(--hsc-panel)] text-white shadow"
                  : "text-slate-700"
              }`}
            >
              <span className="mr-1">{s.icon}</span>{s.label}
            </button>
          ))}
        </div>

        {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</div>}

        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка профиля...</Card>
        ) : !profile ? (
          <Card className="text-xs text-slate-700">Профиль не найден. Попробуйте выйти и войти снова.</Card>
        ) : (
          <>
            {/* ЛИЧНЫЕ ДАННЫЕ */}
            {section === "info" && (
              <Card className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar
                      photoUrl={profile.photoUrl}
                      name={[profile.lastName, profile.firstName].filter(Boolean).join(" ")}
                      size="lg"
                    />
                    <label className="absolute bottom-0 right-0 rounded-full bg-hsc-panel p-1.5 text-white cursor-pointer shadow hover:bg-emerald-800 transition-colors" title={uploadingPhoto ? "Загрузка…" : "Изменить фото"}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingPhoto}
                        onChange={handlePhotoChange}
                      />
                      <span className="text-xs">{uploadingPhoto ? "…" : "📷"}</span>
                    </label>
                  </div>
                  {photoError && (
                    <div className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                      {photoError}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-hsc-panel">
                      {[profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(" ") || "Без имени"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {profile.birthDate && `${profile.birthDate}`}
                      {age > 0 && ` (${age} лет)`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Телефон</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                  </div>
                </div>

                <Button size="sm" onClick={saveContact} disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить контакты"}
                </Button>
              </Card>
            )}

            {/* ЗДОРОВЬЕ */}
            {section === "health" && (
              <Card className="space-y-4">
                <h3 className="text-sm font-semibold text-hsc-panel">Данные о здоровье</h3>

                {/* ИМТ карточка */}
                <div className="rounded-xl bg-gradient-to-r from-hsc-panel to-emerald-800 px-4 py-3 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-emerald-100">Индекс массы тела (ИМТ)</div>
                      <div className="text-2xl font-black">{bmi}</div>
                    </div>
                    <div className="text-right text-[11px]">
                      <div className="text-emerald-100">Вес: {profile.weight ?? "—"} кг</div>
                      <div className="text-emerald-100">Рост: {profile.height ?? "—"} см</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Пол</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["MALE", "FEMALE"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                          gender === g ? "border-hsc-panel bg-hsc-panel text-white" : "border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        {g === "MALE" ? "Мужской" : "Женский"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Вес (кг)</label>
                    <Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.1" placeholder="70" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Рост (см)</label>
                    <Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" step="1" placeholder="170" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Цель</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["WEIGHT_LOSS", "MUSCLE_GAIN", "MAINTENANCE"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFitnessGoal(g)}
                        className={`rounded-xl border px-2 py-2 text-[10px] font-semibold transition-colors ${
                          fitnessGoal === g ? "border-hsc-panel bg-hsc-panel text-white" : "border-slate-300 bg-white text-slate-700"
                        }`}
                      >
                        {GOAL_LABELS[g]}
                      </button>
                    ))}
                  </div>
                </div>

                <Button size="sm" onClick={saveHealth} disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить данные"}
                </Button>

                <div className="pt-2">
                  <Button size="sm" variant="secondary" href="/client/nutrition">
                    История расчётов БЖУ
                  </Button>
                </div>
              </Card>
            )}

            {/* АБОНЕМЕНТЫ */}
            {section === "subs" && (
              <div className="space-y-4">
                <Card className="space-y-3">
                  <h3 className="text-sm font-semibold text-hsc-panel">
                    Мои абонементы ({activeSubs.length})
                  </h3>
                  {activeSubs.length === 0 ? (
                    <p className="text-xs text-slate-700">Нет активных абонементов.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeSubs.map((s) => {
                        const days = remainingDays(s.endDate);
                        return (
                          <div key={s.id} className="rounded-xl bg-gradient-to-r from-hsc-panel to-emerald-800 px-4 py-3 text-white">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-0.5">
                                <div className="text-lg">{s.subscriptionIconEmoji}</div>
                                <div className="text-sm font-bold">{s.subscriptionName}</div>
                                <div className="text-[10px] text-emerald-100">{s.subscriptionDescription}</div>
                              </div>
                              <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
                                <div className="text-xl font-black">{days}</div>
                                <div className="text-[10px]">дн.</div>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-between border-t border-white/20 pt-2 text-[10px] text-emerald-100">
                              <span>С {formatDate(s.startDate)}</span>
                              <span>До {formatDate(s.endDate)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card className="space-y-3">
                  <h3 className="text-sm font-semibold text-hsc-panel">Доступные абонементы</h3>
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Добавить абонемент клиенту может только администратор. Обратитесь в клуб для оформления.
                  </p>
                  <div className="space-y-3">
                    {availSubs.map((sub) => (
                      <div key={sub.id} className="rounded-xl border border-emerald-900/15 bg-white px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-lg">{sub.iconEmoji}</div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-hsc-panel">{sub.name}</div>
                            <div className="text-[10px] text-slate-500">{sub.durationDays} дн. | {sub.price.toLocaleString("ru-RU")} ₽</div>
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-700">{sub.description}</p>
                        <ul className="mt-1 space-y-0.5">
                          {sub.features.map((f, i) => (
                            <li key={i} className="flex items-center gap-1 text-[10px] text-slate-600">
                              <span className="text-emerald-600">✓</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ТРЕНЕРЫ */}
            {section === "trainers" && (
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-hsc-panel">Тренеры клуба ({trainers.length})</h3>
                {trainers.length === 0 ? (
                  <p className="text-xs text-slate-700">Список тренеров пуст.</p>
                ) : (
                  <div className="space-y-2">
                    {trainers.map((t) => (
                      <div key={t.id} className="rounded-xl border border-emerald-900/10 bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            photoUrl={t.photoUrl}
                            name={[t.lastName, t.firstName, t.middleName].filter(Boolean).join(" ")}
                            size="md"
                            className="h-11 w-11"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-bold text-hsc-panel">
                              {[t.lastName, t.firstName, t.middleName].filter(Boolean).join(" ")}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {SPEC_LABELS[t.specialization] ?? t.specialization}
                              {t.experience > 0 && ` | Опыт: ${t.experience} лет`}
                            </div>
                          </div>
                          {t.pricePerTraining > 0 && (
                            <div className="text-right">
                              <div className="text-sm font-bold text-hsc-panel">{t.pricePerTraining.toLocaleString("ru-RU")} ₽</div>
                              <div className="text-[10px] text-slate-500">за тренировку</div>
                            </div>
                          )}
                        </div>
                        {t.achievements?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {t.achievements.map((a, i) => (
                              <span key={i} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800">{a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* НАСТРОЙКИ */}
            {section === "settings" && (
              <Card className="space-y-4">
                <h3 className="text-sm font-semibold text-hsc-panel">Настройки</h3>
                <div className="space-y-2 text-xs">
                  <div className="rounded-xl border border-emerald-900/10 bg-white px-4 py-3">
                    <div className="font-semibold text-hsc-panel">Аккаунт</div>
                    <div className="mt-1 text-slate-600">{user.email}</div>
                    <div className="mt-1 text-[10px] text-slate-400">ID: {user.uid}</div>
                  </div>

                  <div className="rounded-xl border border-emerald-900/10 bg-white px-4 py-3 space-y-3">
                    <div className="font-semibold text-hsc-panel">Сменить пароль</div>
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-600">Текущий пароль</label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(null); }}
                        placeholder="••••••••"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-600">Новый пароль</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
                        placeholder="не менее 6 символов"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-slate-600">Повторите новый пароль</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                        placeholder="••••••••"
                        className="text-sm"
                      />
                    </div>
                    {passwordError && <div className="text-red-600 text-[11px]">{passwordError}</div>}
                    {passwordSuccess && <div className="text-emerald-600 text-[11px]">Пароль успешно изменён.</div>}
                    <Button
                      size="sm"
                      disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
                      onClick={async () => {
                        setChangingPassword(true);
                        setPasswordError(null);
                        setPasswordSuccess(false);
                        try {
                          await changeOwnPassword(currentPassword, newPassword, user.email ?? undefined);
                          setPasswordSuccess(true);
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                        } catch (e: unknown) {
                          setPasswordError(e instanceof Error ? e.message : "Не удалось сменить пароль.");
                        } finally {
                          setChangingPassword(false);
                        }
                      }}
                    >
                      {changingPassword ? "Сохранение..." : "Сменить пароль"}
                    </Button>
                  </div>

                  <div className="rounded-xl border border-emerald-900/10 bg-white px-4 py-3">
                    <div className="font-semibold text-hsc-panel">Версия</div>
                    <div className="mt-1 text-slate-600">HypeSportClub Web v1.0</div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "admin", "manager", "trainer"]);
