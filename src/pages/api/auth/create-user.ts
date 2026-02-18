import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, getAdminApp } from "@/lib/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";

const VALID_STAFF_ROLES = ["TRAINER", "ADMIN", "MANAGER"];

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

  const raw = req.body as {
    email?: string;
    password?: string;
    role?: string;
    lastName?: string;
    firstName?: string;
    middleName?: string;
    phone?: string;
  };
  const email = typeof raw.email === "string" ? raw.email.trim().slice(0, 256) : "";
  const password = typeof raw.password === "string" ? raw.password.trim() : "";
  const role = typeof raw.role === "string" ? raw.role.trim() : "";
  const lastName = typeof raw.lastName === "string" ? raw.lastName.trim().slice(0, 100) : "";
  const firstName = typeof raw.firstName === "string" ? raw.firstName.trim().slice(0, 100) : "";
  const middleName = typeof raw.middleName === "string" ? raw.middleName.trim().slice(0, 100) : "";
  const phone = typeof raw.phone === "string" ? raw.phone.trim().slice(0, 30) : "";

  if (!email || !password || !role) {
    return res.status(400).json({ error: "Укажите email, пароль и роль." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Некорректный формат email." });
  }
  if (!VALID_STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: "Роль должна быть: TRAINER, ADMIN или MANAGER." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Пароль не менее 6 символов." });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: "Пароль не более 128 символов." });
  }

  try {
    const userRecord = await adminAuth().createUser({
      email,
      password,
      displayName: [lastName, firstName, middleName].filter(Boolean).join(" ").trim() || email
    });
    const uid = userRecord.uid;

    const db = getFirestore(getAdminApp());
    await db.collection("users").doc(uid).set({
      email,
      role,
      lastName,
      firstName,
      middleName,
      phone,
      birthDate: "",
      createdAt: Timestamp.now()
    });

    if (role === "TRAINER") {
      await db.collection("trainers").add({
        userId: uid,
        lastName,
        firstName,
        middleName,
        email,
        phone,
        birthDate: "",
        experience: 0,
        specialization: "FITNESS",
        achievements: [],
        pricePerTraining: 0,
        createdAt: Timestamp.now()
      });
    }

    return res.status(200).json({ uid, email, role });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка создания пользователя";
    if (msg.includes("email") && msg.includes("already")) {
      return res.status(409).json({ error: "Пользователь с таким email уже существует." });
    }
    return res.status(500).json({ error: msg });
  }
}
