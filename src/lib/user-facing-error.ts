import type { Language } from "@/lib/models";

type Msg = Record<Language, string>;

const KNOWN: Record<string, Msg> = {
  // Auth (https://firebase.google.com/docs/auth/admin/errors)
  "auth/email-already-in-use": {
    ru: "Этот email уже зарегистрирован. Войдите или укажите другой адрес.",
    en: "This email is already in use. Sign in or use a different address.",
  },
  "auth/invalid-email": {
    ru: "Некорректный формат email.",
    en: "Invalid email format.",
  },
  "auth/user-disabled": {
    ru: "Аккаунт отключён. Обратитесь в клуб.",
    en: "This account has been disabled. Please contact the club.",
  },
  "auth/user-not-found": {
    ru: "Пользователь с таким email не найден. Проверьте адрес или зарегистрируйтесь.",
    en: "No account found for this email. Check the address or sign up.",
  },
  "auth/wrong-password": {
    ru: "Неверный пароль. Попробуйте снова или сбросьте пароль.",
    en: "Wrong password. Try again or reset your password.",
  },
  "auth/invalid-credential": {
    ru: "Неверный email или пароль.",
    en: "Invalid email or password.",
  },
  "auth/invalid-login-credentials": {
    ru: "Неверный email или пароль.",
    en: "Invalid email or password.",
  },
  "auth/too-many-requests": {
    ru: "Слишком много попыток. Подождите немного и попробуйте снова.",
    en: "Too many attempts. Please wait a moment and try again.",
  },
  "auth/network-request-failed": {
    ru: "Нет соединения с интернетом. Проверьте сеть и попробуйте снова.",
    en: "Network error. Check your connection and try again.",
  },
  "auth/requires-recent-login": {
    ru: "Сессия устарела. Выйдите и войдите снова, затем повторите действие.",
    en: "Your session expired. Sign out, sign in again, then retry.",
  },
  "auth/weak-password": {
    ru: "Пароль слишком простой. Используйте не менее 6 символов.",
    en: "Password is too weak. Use at least 6 characters.",
  },
  "auth/operation-not-allowed": {
    ru: "Этот способ входа отключён. Обратитесь к администратору.",
    en: "This sign-in method is disabled. Contact the administrator.",
  },
  "auth/popup-closed-by-user": {
    ru: "Окно входа было закрыто. Попробуйте снова.",
    en: "The sign-in window was closed. Please try again.",
  },
  // Firestore / general Firebase
  "permission-denied": {
    ru: "Недостаточно прав для этого действия. Возможно, сессия устарела — обновите страницу или войдите снова.",
    en: "You don’t have permission for this action. Try refreshing the page or signing in again.",
  },
  "unavailable": {
    ru: "Сервис временно недоступен. Попробуйте через минуту.",
    en: "Service temporarily unavailable. Please try again shortly.",
  },
  "deadline-exceeded": {
    ru: "Превышено время ожидания. Проверьте интернет и попробуйте снова.",
    en: "Request timed out. Check your connection and try again.",
  },
  "not-found": {
    ru: "Данные не найдены.",
    en: "Data not found.",
  },
  "already-exists": {
    ru: "Такая запись уже существует.",
    en: "This record already exists.",
  },
  "failed-precondition": {
    ru: "Действие сейчас невозможно. Обновите страницу или попробуйте позже.",
    en: "This action can’t be completed right now. Refresh or try later.",
  },
  "resource-exhausted": {
    ru: "Лимит запросов исчерпан. Подождите и попробуйте снова.",
    en: "Request limit reached. Please wait and try again.",
  },
  "aborted": {
    ru: "Операция прервана. Попробуйте снова.",
    en: "The operation was aborted. Please try again.",
  },
  // Storage
  "storage/unauthorized": {
    ru: "Нет доступа к хранилищу файлов. Войдите снова.",
    en: "No permission to upload files. Please sign in again.",
  },
  "storage/canceled": {
    ru: "Загрузка отменена.",
    en: "Upload was canceled.",
  },
  "storage/retry-limit-exceeded": {
    ru: "Не удалось загрузить файл. Проверьте соединение и размер файла.",
    en: "Couldn’t upload the file. Check your connection and file size.",
  },
};

function getCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const o = err as Record<string, unknown>;
  if (typeof o.code === "string") return o.code;
  return "";
}

function normalizeCode(code: string): string {
  if (!code) return "";
  const c = code.replace(/^\[|\]$/g, "").trim();
  if (c.startsWith("FirebaseError: ")) return c.slice("FirebaseError: ".length).trim();
  return c;
}

function matchByMessage(msg: string, lang: Language): string | null {
  const m = msg.toLowerCase();
  if (m.includes("permission_denied") || m.includes("permission-denied") || m.includes("missing or insufficient permissions")) {
    return KNOWN["permission-denied"][lang];
  }
  if (m.includes("network") && (m.includes("failed") || m.includes("error"))) {
    return KNOWN["auth/network-request-failed"][lang];
  }
  if (m.includes("fetch") && m.includes("failed")) {
    return KNOWN["auth/network-request-failed"][lang];
  }
  return null;
}

/**
 * Превращает типичные ошибки Firebase Auth / Firestore / Storage в понятный текст.
 * Неизвестные сообщения не дублируют сырой тех. текст, если похожи на внутренние ошибки SDK.
 */
export function toUserFacingMessage(err: unknown, lang: Language): string {
  const code = normalizeCode(getCode(err));
  if (code && KNOWN[code]) return KNOWN[code][lang];

  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const byMsg = message ? matchByMessage(message, lang) : null;
  if (byMsg) return byMsg;

  if (message && message.length > 0 && message.length < 220) {
    const looksTechnical =
      /firebase|firestore|grpc|indexeddb|internal assertion|invalid[_-]?argument/i.test(message) ||
      /^https:\/\//i.test(message);
    if (!looksTechnical) return message;
  }

  return lang === "en"
    ? "Something went wrong. Please try again."
    : "Не удалось выполнить действие. Попробуйте ещё раз.";
}
