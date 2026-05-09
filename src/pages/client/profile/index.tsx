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
  getAllTrainers,
} from "@/lib/db";
import { uploadAvatar, avatarPathUsers } from "@/lib/storage";
import { changeOwnPassword } from "@/lib/auth-client";
import type { User, UserSubscription, Trainer, Language } from "@/lib/models";
import { Avatar } from "@/components/ui/Avatar";
import { useTranslation } from "@/contexts/LanguageContext";
import type { TranslationKeys } from "@/lib/i18n/translations";
import { formatRuPhoneInput } from "@/lib/input-masks";
import { toUserFacingMessage } from "@/lib/user-facing-error";

type Props = AuthedPageProps;

type Section = "profile" | "subs" | "trainers" | "account";
type ProfileSub = "info" | "health";
type AccountSub = "email" | "password" | "language";

const GOAL_KEYS: Record<string, TranslationKeys> = {
  WEIGHT_LOSS: "client.profile.goalLoss",
  MUSCLE_GAIN: "client.profile.goalGain",
  MAINTENANCE: "client.profile.goalKeep",
};

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

function formatDate(ts: any, locale: string): string {
  if (!ts) return "—";
  const d = "toDate" in ts ? ts.toDate() : new Date();
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatPrice(price: number, locale: string): string {
  const symbol = locale === "en-US" ? " $" : " ₽";
  return price.toLocaleString(locale) + symbol;
}

export default function ProfilePage({ user }: Props) {
  const { t, language, setLanguage: setAppLanguage } = useTranslation();
  const locale = language === "en" ? "en-US" : "ru-RU";
  const [section, setSection] = useState<Section>("profile");
  const [profileSub, setProfileSub] = useState<ProfileSub>("info");
  const [accountSub, setAccountSub] = useState<AccountSub>("email");

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

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user.email ?? "");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("MAINTENANCE");

  const [mySubs, setMySubs] = useState<UserSubscription[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [u, ms, tr] = await Promise.all([
          getCurrentUser(user.uid),
          getUserSubscriptions(user.uid),
          getAllTrainers()
        ]);
        if (cancelled) return;
        setProfile(u);
        setMySubs(ms);
        setTrainers(tr);
        if (u) {
          setPhone(u.phone ? formatRuPhoneInput(u.phone) : "");
          setEmail(u.email ?? user.email ?? "");
          setGender((u.gender as any) || "MALE");
          setWeight(u.weight ? String(u.weight) : "");
          setHeight(u.height ? String(u.height) : "");
          setFitnessGoal(u.fitnessGoal ?? "MAINTENANCE");
        }
      } catch (e: any) {
        if (!cancelled) setError(toUserFacingMessage(e, language));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.uid, user.email, t, language]);

  useEffect(() => {
    if (success) { const id = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(id); }
  }, [success]);

  async function saveContact() {
    setSaving(true); setError(null);
    try {
      await updateUserContact(user.uid, phone, email);
      setProfile((prev) => (prev ? { ...prev, phone, email } : null));
      setSuccess(t("client.profile.contactsSaved"));
    } catch (e: any) { setError(toUserFacingMessage(e, language)); }
    finally { setSaving(false); }
  }

  async function saveHealth() {
    setSaving(true); setError(null);
    try {
      const w = parseFloat(weight || "0");
      const h = parseFloat(height || "0");
      await updateUserHealth(user.uid, gender, w, h, fitnessGoal);
      setProfile((prev) =>
        prev ? { ...prev, gender, weight: w, height: h, fitnessGoal: fitnessGoal as User["fitnessGoal"] | undefined } : null
      );
      setSuccess(t("client.profile.healthSaved"));
    } catch (e: any) { setError(toUserFacingMessage(e, language)); }
    finally { setSaving(false); }
  }

  function applyLanguage(lang: Language) {
    setAppLanguage(lang);
    setSuccess(t("profile.language.saved"));
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
      const urlToSave = url.startsWith("data:") ? url : url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
      await updateUserData(user.uid, { photoUrl: urlToSave });
      setProfile((prev) => (prev ? { ...prev, photoUrl: urlToSave } : null));
      setSuccess(t("client.profile.photoUpdated"));
    } catch (e: unknown) {
      const msg = toUserFacingMessage(e, language);
      setError(msg);
      setPhotoError(msg);
    } finally {
      clearTimeout(forceStopTimer);
      setUploadingPhoto(false);
      inputEl.value = "";
    }
  }

  const sections: { key: Section; labelKey: TranslationKeys; icon: string }[] = [
    { key: "profile", labelKey: "client.profile.section.profile", icon: "👤" },
    { key: "subs", labelKey: "client.profile.section.subs", icon: "🎫" },
    { key: "trainers", labelKey: "client.profile.section.trainers", icon: "🏃" },
    { key: "account", labelKey: "client.profile.section.account", icon: "⚙️" }
  ];

  const profileSubs: { key: ProfileSub; labelKey: TranslationKeys }[] = [
    { key: "info", labelKey: "client.profile.sub.info" },
    { key: "health", labelKey: "client.profile.sub.health" },
  ];

  const accountSubs: { key: AccountSub; labelKey: TranslationKeys }[] = [
    { key: "email", labelKey: "client.profile.sub.email" },
    { key: "password", labelKey: "client.profile.sub.password" },
    { key: "language", labelKey: "client.profile.sub.language" },
  ];

  const activeSubs = mySubs.filter((s) => s.active && remainingDays(s.endDate) > 0);
  const wParsed = parseFloat(weight);
  const hParsed = parseFloat(height);
  const bmi = computeBMI(
    Number.isFinite(wParsed) && wParsed > 0 ? wParsed : profile?.weight,
    Number.isFinite(hParsed) && hParsed > 0 ? hParsed : profile?.height
  );
  const weightDisplay = !profile
    ? "—"
    : weight !== "" && Number.isFinite(wParsed) && wParsed > 0
      ? wParsed
      : (profile.weight ?? "—");
  const heightDisplay = !profile
    ? "—"
    : height !== "" && Number.isFinite(hParsed) && hParsed > 0
      ? hParsed
      : (profile.height ?? "—");
  const age = profile ? computeAge(profile.birthDate) : 0;

  return (
    <ClientLayout title={t("client.profile.title")}>
      <div className="space-y-4">
        {/* Главное меню профиля */}
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
              <span className="mr-1">{s.icon}</span>{t(s.labelKey)}
            </button>
          ))}
        </div>

        {section === "profile" && (
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-emerald-50 p-1">
            {profileSubs.map((s) => (
              <button
                key={s.key}
                onClick={() => setProfileSub(s.key)}
                className={`flex-shrink-0 rounded-lg px-3 py-1 text-[11px] font-medium transition-colors ${
                  profileSub === s.key
                    ? "bg-white text-hsc-panel shadow-sm"
                    : "text-slate-600 hover:text-hsc-panel"
                }`}
              >
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        )}

        {section === "account" && (
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-emerald-50 p-1">
            {accountSubs.map((s) => (
              <button
                key={s.key}
                onClick={() => setAccountSub(s.key)}
                className={`flex-shrink-0 rounded-lg px-3 py-1 text-[11px] font-medium transition-colors ${
                  accountSub === s.key
                    ? "bg-white text-hsc-panel shadow-sm"
                    : "text-slate-600 hover:text-hsc-panel"
                }`}
              >
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        )}

        {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</div>}

        {loading ? (
          <Card className="text-xs text-slate-700">{t("client.profile.loading")}</Card>
        ) : !profile ? (
          <Card className="text-xs text-slate-700">{t("client.profile.profileNotFound")}</Card>
        ) : (
          <>
            {section === "profile" && profileSub === "info" && (
              <Card className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar
                      photoUrl={profile.photoUrl}
                      name={[profile.lastName, profile.firstName].filter(Boolean).join(" ")}
                      size="lg"
                    />
                    <label
                      className="absolute bottom-0 right-0 rounded-full bg-hsc-panel p-1.5 text-white cursor-pointer shadow hover:bg-emerald-800 transition-colors"
                      title={uploadingPhoto ? t("client.profile.uploadingPhoto") : t("client.profile.editPhotoTooltip")}
                    >
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
                      {[profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(" ") || t("client.profile.noName")}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {profile.birthDate && `${profile.birthDate}`}
                      {age > 0 && ` (${age} ${t("client.profile.years")})`}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">{t("client.profile.phone")}</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatRuPhoneInput(e.target.value))}
                    placeholder="+7 (___) ___-__-__"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>

                <Button size="sm" onClick={saveContact} disabled={saving}>
                  {saving ? t("common.saving") : t("common.save")}
                </Button>
              </Card>
            )}

            {section === "profile" && profileSub === "health" && (
              <Card className="space-y-4">
                <h3 className="text-sm font-semibold text-hsc-panel">{t("client.profile.healthHeader")}</h3>

                <div className="rounded-xl bg-gradient-to-r from-hsc-panel to-emerald-800 px-4 py-3 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-emerald-100">{t("client.profile.bmi")}</div>
                      <div className="text-2xl font-black">{bmi}</div>
                    </div>
                    <div className="text-right text-[11px]">
                      <div className="text-emerald-100">{t("client.profile.weightKg")}: {weightDisplay}</div>
                      <div className="text-emerald-100">{t("client.profile.heightCm")}: {heightDisplay}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">{t("client.profile.gender")}</label>
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
                        {g === "MALE" ? t("client.profile.male") : t("client.profile.female")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">{t("client.profile.weightKg")}</label>
                    <Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.1" placeholder="70" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">{t("client.profile.heightCm")}</label>
                    <Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" step="1" placeholder="170" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">{t("client.profile.goal")}</label>
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
                        {t(GOAL_KEYS[g])}
                      </button>
                    ))}
                  </div>
                </div>

                <Button size="sm" onClick={saveHealth} disabled={saving}>
                  {saving ? t("common.saving") : t("common.save")}
                </Button>

                <div className="pt-2">
                  <Button size="sm" variant="secondary" href="/client/nutrition">
                    {t("client.profile.bmrHistoryLink")}
                  </Button>
                </div>
              </Card>
            )}

            {section === "subs" && (
              <Card className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-hsc-panel">
                    {t("client.profile.mySubsCount")} ({activeSubs.length})
                  </h3>
                  <Button size="sm" variant="secondary" href="/client/subscriptions">
                    {t("client.profile.viewAllSubs")}
                  </Button>
                </div>
                {activeSubs.length === 0 ? (
                  <p className="text-xs text-slate-700">{t("client.profile.subsEmpty")}</p>
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
                              <div className="text-[10px]">{t("common.days")}</div>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-between border-t border-white/20 pt-2 text-[10px] text-emerald-100">
                            <span>{t("client.profile.subsFromDate")} {formatDate(s.startDate, locale)}</span>
                            <span>{t("client.profile.subsUntilDate")} {formatDate(s.endDate, locale)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {section === "trainers" && (
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-hsc-panel">{t("client.profile.trainersHeader")} ({trainers.length})</h3>
                {trainers.length === 0 ? (
                  <p className="text-xs text-slate-700">{t("client.profile.trainersEmpty")}</p>
                ) : (
                  <div className="space-y-2">
                    {trainers.map((tr) => (
                      <div key={tr.id} className="rounded-xl border border-emerald-900/10 bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            photoUrl={tr.photoUrl}
                            name={[tr.lastName, tr.firstName, tr.middleName].filter(Boolean).join(" ")}
                            size="md"
                            className="h-11 w-11"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-bold text-hsc-panel">
                              {[tr.lastName, tr.firstName, tr.middleName].filter(Boolean).join(" ")}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {SPEC_KEYS[tr.specialization] ? t(SPEC_KEYS[tr.specialization]) : tr.specialization}
                              {tr.experience > 0 && ` | ${t("client.profile.experience")}: ${tr.experience}`}
                            </div>
                          </div>
                          {tr.pricePerTraining > 0 && (
                            <div className="text-right">
                              <div className="text-sm font-bold text-hsc-panel">{formatPrice(tr.pricePerTraining, locale)}</div>
                              <div className="text-[10px] text-slate-500">{t("client.booking.perTraining")}</div>
                            </div>
                          )}
                        </div>
                        {tr.achievements?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tr.achievements.map((a, i) => (
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

            {section === "account" && accountSub === "email" && (
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-hsc-panel">{t("client.profile.email")}</h3>
                <div className="text-[11px] text-slate-500">{t("client.profile.userId")}: {user.uid}</div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">{t("client.profile.email")}</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                </div>
                <Button size="sm" onClick={saveContact} disabled={saving}>
                  {saving ? t("common.saving") : t("client.profile.saveEmail")}
                </Button>
              </Card>
            )}

            {section === "account" && accountSub === "password" && (
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-hsc-panel">{t("client.profile.passwordChange")}</h3>
                <div>
                  <label className="mb-1 block text-[10px] text-slate-600">{t("client.profile.currentPassword")}</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(null); }}
                    placeholder="••••••••"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-slate-600">{t("client.profile.newPassword")}</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
                    placeholder="••••••••"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-slate-600">{t("client.profile.confirmPassword")}</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                    placeholder="••••••••"
                    className="text-sm"
                  />
                </div>
                {passwordError && <div className="text-red-600 text-[11px]">{passwordError}</div>}
                {passwordSuccess && <div className="text-emerald-600 text-[11px]">{t("client.profile.passwordChanged")}</div>}
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
                      setPasswordError(toUserFacingMessage(e, language));
                    } finally {
                      setChangingPassword(false);
                    }
                  }}
                >
                  {changingPassword ? t("client.profile.changingPassword") : t("client.profile.changePassword")}
                </Button>
              </Card>
            )}

            {section === "account" && accountSub === "language" && (
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-hsc-panel">{t("profile.language.title")}</h3>
                <p className="text-xs text-slate-600">
                  {t("profile.language.description")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["ru", "en"] as const).map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      disabled={saving}
                      onClick={() => applyLanguage(lng)}
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                        language === lng
                          ? "border-hsc-panel bg-hsc-panel text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-hsc-panel"
                      }`}
                    >
                      {lng === "ru" ? "🇷🇺 Русский" : "🇬🇧 English"}
                    </button>
                  ))}
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
