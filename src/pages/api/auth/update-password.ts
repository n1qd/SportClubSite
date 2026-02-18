import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, getAdminApp } from "@/lib/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";

function getToken(req: NextApiRequest): string | null {
  return (req.cookies?.hsc_token as string) ?? null;
}

async function verifyManagerOrAdmin(req: NextApiRequest): Promise<{ uid: string; role: string } | null> {
  const token = getToken(req);
  if (!token) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    const roleCookie = req.cookies?.hsc_role as string | undefined;
    let role = roleCookie ?? (decoded.role as string | undefined);
    if (!role || !["ADMIN", "MANAGER"].includes(role.toUpperCase())) {
      try {
        const db = getFirestore(getAdminApp());
        const userDoc = await db.collection("users").doc(decoded.uid).get();
        if (userDoc.exists) {
          const fsRole = userDoc.data()?.role;
          if (fsRole && ["ADMIN", "MANAGER"].includes(fsRole)) role = fsRole;
        }
      } catch { /* ignore */ }
    }
    const normalized = role?.toUpperCase();
    if (normalized !== "ADMIN" && normalized !== "MANAGER") return null;
    return { uid: decoded.uid, role: normalized };
  } catch {
    return null;
  }
}

function checkCsrf(req: NextApiRequest): boolean {
  const header = (req.headers["x-csrf-token"] as string)?.trim();
  const cookie = (req.cookies?.hsc_csrf as string)?.trim();
  return !!header && !!cookie && header === cookie;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  if (!checkCsrf(req)) {
    return res.status(403).json({ error: "Неверный CSRF-токен. Обновите страницу и попробуйте снова." });
  }

  const session = await verifyManagerOrAdmin(req);
  if (!session) {
    return res.status(403).json({ error: "Доступ только для руководителя или администратора." });
  }

  const raw = req.body as { targetUserId?: string; newPassword?: string };
  const targetUserId = typeof raw.targetUserId === "string" ? raw.targetUserId.trim().slice(0, 128) : undefined;
  const newPassword = typeof raw.newPassword === "string" ? raw.newPassword.trim() : "";

  if (!newPassword) {
    return res.status(400).json({ error: "Укажите новый пароль." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Пароль не менее 6 символов." });
  }
  if (newPassword.length > 128) {
    return res.status(400).json({ error: "Пароль не более 128 символов." });
  }

  const uidToUpdate = targetUserId || session.uid;
  if (uidToUpdate !== session.uid) {
    await adminAuth().updateUser(uidToUpdate, { password: newPassword });
    return res.status(200).json({ success: true, message: "Пароль изменён." });
  }

  return res.status(400).json({
    error: "Для смены своего пароля используйте форму в профиле (с вводом текущего пароля)."
  });
}
