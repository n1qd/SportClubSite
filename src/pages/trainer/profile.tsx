import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { TrainerLayout } from "@/components/layout/TrainerLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getCurrentUser, updateUserContact, getTrainerByUserId, updateTrainer, updateUserData } from "@/lib/db";
import { uploadAvatar, avatarPathTrainers } from "@/lib/storage";
import { changeOwnPassword } from "@/lib/auth-client";
import type { User, Trainer } from "@/lib/models";
import { formatRuPhoneInput } from "@/lib/input-masks";
import { useTranslation } from "@/contexts/LanguageContext";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarPhotoEditOverlay } from "@/components/ui/AvatarPhotoEditOverlay";

type Props = AuthedPageProps;

export default function TrainerProfile({ user }: Props) {
  const { language } = useTranslation();
  const [profile, setProfile] = useState<User | null>(null);
  const [trainerDoc, setTrainerDoc] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user.email ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [u, t] = await Promise.all([getCurrentUser(user.uid), getTrainerByUserId(user.uid)]);
        setProfile(u);
        setTrainerDoc(t);
        if (u) {
          setPhone(u.phone ? formatRuPhoneInput(u.phone) : "");
          setEmail(u.email ?? user.email ?? "");
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [user.uid, user.email]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (!trainerDoc) return;
    setUploadingPhoto(true);
    setError(null);
    const inputEl = e.target;
    try {
      const path = avatarPathTrainers(trainerDoc.id);
      const url = await uploadAvatar(path, file);
      // Для data URL не добавляем ?t= — это ломает base64; cache-bust только для http(s)
      const urlToSave = url.startsWith("data:") ? url : url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
      await Promise.all([
        updateTrainer(trainerDoc.id, { photoUrl: urlToSave }),
        updateUserData(user.uid, { photoUrl: urlToSave }),
      ]);
      setProfile((prev) => (prev ? { ...prev, photoUrl: urlToSave } : null));
      setTrainerDoc((prev) => (prev ? { ...prev, photoUrl: urlToSave } : null));
      setSaved(true);
    } catch (e: any) {
      setError(toUserFacingMessage(e, language));
    } finally {
      setUploadingPhoto(false);
      inputEl.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateUserContact(user.uid, phone, email);
      setSaved(true);
    } catch (e: any) {
      setError(toUserFacingMessage(e, language));
    } finally {
      setSaving(false);
    }
  }

  return (
    <TrainerLayout title="Профиль тренера">
      <div className="space-y-4">
        {loading ? (
          <Card className="text-xs text-slate-700">Загрузка...</Card>
        ) : profile ? (
          <>
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">Профиль</h2>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar
                    photoUrl={profile.photoUrl ?? trainerDoc?.photoUrl}
                    name={[profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(" ")}
                    size="lg"
                  />
                  <AvatarPhotoEditOverlay
                    uploading={uploadingPhoto}
                    onChange={handlePhotoChange}
                    title={uploadingPhoto ? "Загрузка…" : "Изменить фото"}
                  />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">ФИО</div>
                  <div className="text-sm font-bold text-hsc-panel">
                    {[profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(" ") || "Тренер"}
                  </div>
                </div>
              </div>
              {profile.birthDate && (
                <div>
                  <div className="text-[11px] text-slate-500">Дата рождения</div>
                  <div className="text-sm text-slate-700">{profile.birthDate}</div>
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">Контакты</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Телефон</label>
                  <Input
                    value={phone}
                    onChange={(e) => { setPhone(formatRuPhoneInput(e.target.value)); setSaved(false); }}
                    placeholder="+7 (___) ___-__-__"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                  <Input value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} type="email" />
                </div>
              </div>

              {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Сохранение..." : saved ? "Сохранено" : "Сохранить"}
              </Button>
            </Card>

            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-hsc-panel">Сменить пароль</h2>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Текущий пароль</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(null); }}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Новый пароль</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
                  placeholder="не менее 6 символов"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Повторите новый пароль</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                  placeholder="••••••••"
                />
              </div>
              {passwordError && <div className="text-red-600 text-xs">{passwordError}</div>}
              {passwordSuccess && <div className="text-emerald-600 text-xs">Пароль успешно изменён.</div>}
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
                {changingPassword ? "Сохранение..." : "Сменить пароль"}
              </Button>
            </Card>
          </>
        ) : (
          <Card className="text-xs text-slate-700">
            Профиль не найден.
          </Card>
        )}
      </div>
    </TrainerLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["trainer", "admin"]);
