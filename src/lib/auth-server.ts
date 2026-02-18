import { NextRequest } from "next/server";
import { adminAuth } from "./firebase/admin";

// Роли: user (CLIENT), trainer, admin (администратор), manager (руководитель)
export type UserRole = "user" | "admin" | "manager" | "trainer";

export interface AuthSession {
  uid: string;
  email?: string;
  role: UserRole;
}

const AUTH_HEADER = "authorization";
const AUTH_COOKIE = "hsc_token";
const ROLE_COOKIE = "hsc_role";

/**
 * Маппинг ролей из Firestore в веб-роли.
 * Firestore: CLIENT / TRAINER / ADMIN / MANAGER
 * Web: user / trainer / admin / manager
 */
export function normalizeRole(raw: string | undefined | null): UserRole {
  if (!raw) return "user";
  const upper = raw.toUpperCase();
  if (upper === "ADMIN") return "admin";
  if (upper === "TRAINER") return "trainer";
  if (upper === "MANAGER") return "manager";
  if (upper === "CLIENT") return "user";
  const lower = raw.toLowerCase();
  if (lower === "admin" || lower === "trainer" || lower === "manager") return lower as UserRole;
  return "user";
}

export async function verifyRequestSession(req: NextRequest): Promise<AuthSession | null> {
  const header = req.headers.get(AUTH_HEADER);
  let idToken: string | null = null;

  if (header?.startsWith("Bearer ")) {
    idToken = header.substring("Bearer ".length);
  } else {
    idToken = req.cookies.get(AUTH_COOKIE)?.value ?? null;
  }

  if (!idToken) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);

    // Приоритет: cookie hsc_role > JWT claims > default "user"
    const roleCookie = req.cookies.get(ROLE_COOKIE)?.value;
    const role = normalizeRole(roleCookie || (decoded.role as string | undefined));

    return {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      role
    };
  } catch {
    return null;
  }
}

export function hasRequiredRole(session: AuthSession | null, required: UserRole | UserRole[]) {
  if (!session) return false;
  const list = Array.isArray(required) ? required : [required];
  // admin и manager имеют расширенный доступ
  if (session.role === "admin") return true;
  if (session.role === "manager" && list.some((r) => r === "manager" || r === "admin")) return true;
  return list.includes(session.role);
}
