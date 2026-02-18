import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { adminAuth, getAdminApp } from "./firebase/admin";
import { getFirestore } from "firebase-admin/firestore";
import { normalizeRole } from "./auth-server";

export type Role = "user" | "admin" | "manager" | "trainer";

const VALID_ROLES = ["CLIENT", "TRAINER", "ADMIN", "MANAGER"];

export interface SSRUser {
  uid: string;
  email?: string;
  role: Role;
}

export interface AuthedPageProps {
  user: SSRUser;
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "admin": return "/admin/dashboard";
    case "manager": return "/manager/dashboard";
    case "trainer": return "/trainer/dashboard";
    default: return "/client/dashboard";
  }
}

/** Роль берётся из Firestore, не из cookie — защита от подделки роли. */
async function resolveRoleFromFirestore(uid: string): Promise<Role> {
  try {
    const db = getFirestore(getAdminApp());
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const fsRole = userDoc.data()?.role;
      if (fsRole && VALID_ROLES.includes(fsRole)) {
        return normalizeRole(fsRole);
      }
    }
  } catch { /* ignore */ }
  return "user";
}

export async function requireAuth<T extends Record<string, unknown> = Record<string, never>>(
  ctx: GetServerSidePropsContext,
  allowedRoles: Role[] = ["user", "admin", "manager", "trainer"],
  getProps?: (user: SSRUser) => Promise<T> | T
): Promise<GetServerSidePropsResult<AuthedPageProps & T>> {
  const token = ctx.req.cookies["hsc_token"];

  if (!token) {
    return { redirect: { destination: "/auth/login", permanent: false } };
  }

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    const role = await resolveRoleFromFirestore(decoded.uid);

    // admin имеет доступ ко всем страницам
    if (role !== "admin" && !allowedRoles.includes(role)) {
      return { redirect: { destination: homeForRole(role), permanent: false } };
    }

    const user: SSRUser = {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      role
    };

    const extra = getProps ? await getProps(user) : ({} as T);
    return { props: { user, ...(extra as T) } };
  } catch {
    return { redirect: { destination: "/auth/login", permanent: false } };
  }
}
