const AVATAR_MAX_PX = 200;
const AVATAR_JPEG_QUALITY = 0.82;

/** Сжать изображение и вернуть data URL. Сохраняется в Firestore — Firebase Storage не нужен. */
export function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas не поддерживается"));
      return;
    }
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > AVATAR_MAX_PX || h > AVATAR_MAX_PX) {
        if (w > h) {
          h = Math.round((h * AVATAR_MAX_PX) / w);
          w = AVATAR_MAX_PX;
        } else {
          w = Math.round((w * AVATAR_MAX_PX) / h);
          h = AVATAR_MAX_PX;
        }
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", AVATAR_JPEG_QUALITY);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
    img.src = URL.createObjectURL(file);
  });
}

/** Загрузка фото без Firebase Storage: сжатое изображение сохраняется в Firestore как data URL. */
export async function uploadAvatar(_path: string, file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Загрузка фото возможна только в браузере");
  }
  return fileToAvatarDataUrl(file);
}

export function avatarPathUsers(uid: string): string {
  return `avatars/users/${uid}/avatar`;
}

export function avatarPathTrainers(trainerId: string): string {
  return `avatars/trainers/${trainerId}/avatar`;
}

const CHAT_IMAGE_MAX_PX = 1200;
const CHAT_IMAGE_JPEG_QUALITY = 0.82;
const CHAT_IMAGE_MAX_BYTES = 900_000;

function compressImageToDataUrl(
  file: File,
  maxPx: number,
  quality: number,
  maxBytes: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas не поддерживается"));
      return;
    }
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxPx || h > maxPx) {
        if (w > h) {
          h = Math.round((h * maxPx) / w);
          w = maxPx;
        } else {
          w = Math.round((w * maxPx) / h);
          h = maxPx;
        }
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      let q = quality;
      let dataUrl = "";
      try {
        for (let i = 0; i < 6; i++) {
          dataUrl = canvas.toDataURL("image/jpeg", q);
          const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
          if (approxBytes <= maxBytes || q <= 0.45) break;
          q -= 0.08;
        }
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
    img.src = URL.createObjectURL(file);
  });
}

/** Сжать фото для вложения в чат (data URL в Firestore). */
export function fileToChatImageDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Можно прикрепить только изображение"));
  }
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Загрузка фото возможна только в браузере"));
  }
  return compressImageToDataUrl(file, CHAT_IMAGE_MAX_PX, CHAT_IMAGE_JPEG_QUALITY, CHAT_IMAGE_MAX_BYTES);
}
