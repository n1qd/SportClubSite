import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, getAdminApp } from "@/lib/firebase/admin";
import { randomBytes } from "crypto";

const TOKEN_COOKIE = "hsc_token";
const ROLE_COOKIE = "hsc_role";
const CSRF_COOKIE = "hsc_csrf";
const MAX_AGE = 60 * 60 * 24 * 3; // 3 дня

function buildCookie(name: string, value: string, maxAge?: number, httpOnly = true): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax"
  ];
  if (httpOnly) parts.push("HttpOnly");
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  if (maxAge) parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}

// Допустимые роли
const VALID_ROLES = ["CLIENT", "TRAINER", "ADMIN", "MANAGER"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { idToken, role: clientRole } = req.body as { idToken?: string; role?: string };
    if (!idToken) {
      return res.status(400).json({ error: "idToken is required" });
    }

    try {
      const decoded = await adminAuth().verifyIdToken(idToken);

      // Определяем роль из нескольких источников:
      // 1. Пробуем прочитать из Firestore через Admin SDK
      // 2. Если не удалось — берём роль переданную клиентом (клиент читает из Firestore через Client SDK)
      // 3. Последний fallback — JWT claims
      let resolvedRole = "CLIENT";

      // Роль берём только из Firestore; клиенту не доверяем привилегированные роли
      try {
        const { getFirestore } = await import("firebase-admin/firestore");
        const db = getFirestore(getAdminApp());
        const userDoc = await db.collection("users").doc(decoded.uid).get();
        if (userDoc.exists) {
          const fsRole = userDoc.data()?.role;
          if (fsRole && VALID_ROLES.includes(fsRole)) {
            resolvedRole = fsRole;
          }
        }
      } catch {
        // При ошибке Firestore не доверяем клиенту роль выше CLIENT
        if (clientRole === "CLIENT" || decoded.role === "CLIENT") {
          resolvedRole = "CLIENT";
        }
      }

      const csrfToken = randomBytes(16).toString("hex");
      const cookies = [
        buildCookie(TOKEN_COOKIE, idToken, MAX_AGE),
        buildCookie(ROLE_COOKIE, resolvedRole, MAX_AGE),
        buildCookie(CSRF_COOKIE, csrfToken, MAX_AGE, false)
      ];
      res.setHeader("Set-Cookie", cookies);
      return res.status(200).json({ uid: decoded.uid, role: resolvedRole });
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  if (req.method === "DELETE") {
    const cookies = [TOKEN_COOKIE, ROLE_COOKIE, CSRF_COOKIE].map(
      (name) => `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );
    res.setHeader("Set-Cookie", cookies);
    return res.status(204).end();
  }

  res.setHeader("Allow", "POST, DELETE");
  return res.status(405).end();
}
