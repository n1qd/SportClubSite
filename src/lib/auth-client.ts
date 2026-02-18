import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  User
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

const CSRF_COOKIE = "hsc_csrf";

/** Читает CSRF-токен из cookie (только в браузере). Добавляйте заголовок X-CSRF-Token к изменяющим запросам. */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Смена пароля текущего пользователя после проверки текущего пароля.
 * Вызывать только на клиенте (в личном кабинете).
 */
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
  userEmail?: string | null
): Promise<void> {
  const auth = getFirebaseAuth();
  const fbUser = auth.currentUser as User | null;
  if (!fbUser) throw new Error("Вы не авторизованы.");
  const email = fbUser.email ?? userEmail ?? "";
  if (!email) throw new Error("Не удалось определить email для проверки пароля.");
  if (!currentPassword.trim()) throw new Error("Введите текущий пароль.");
  if (newPassword.length < 6) throw new Error("Новый пароль не менее 6 символов.");
  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(fbUser, credential);
  await updatePassword(fbUser, newPassword);
}
