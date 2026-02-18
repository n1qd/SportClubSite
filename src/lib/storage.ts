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
