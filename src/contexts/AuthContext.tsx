import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, User
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

export type AppRole = "CLIENT" | "TRAINER" | "ADMIN" | "MANAGER";

interface AuthContextValue {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AppRole>;
  register: (email: string, password: string, profile?: RegisterProfile) => Promise<void>;
  logout: () => Promise<void>;
}

export interface RegisterProfile {
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  height?: number;
  weight?: number;
  fitnessGoal?: "WEIGHT_LOSS" | "MUSCLE_GAIN" | "MAINTENANCE";
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Обновляет серверную сессию (cookie) с токеном и ролью.
 * role передаётся на сервер, чтобы даже если Admin SDK не может
 * прочитать Firestore, роль всё равно была установлена корректно.
 */
async function updateServerSession(user: User | null, role?: AppRole) {
  try {
    if (!user) {
      await fetch("/api/auth/session", { method: "DELETE" });
      return;
    }
    const idToken = await user.getIdToken(true);
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken, role: role ?? "CLIENT" })
    });
  } catch { /* не роняем UI */ }
}

async function fetchRoleFromFirestore(uid: string): Promise<AppRole> {
  try {
    const db = getFirestoreDb();
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const role = snap.data()?.role;
      if (["ADMIN", "TRAINER", "MANAGER"].includes(role)) return role;
    }
    return "CLIENT";
  } catch {
    return "CLIENT";
  }
}

export function roleToRedirect(role: AppRole): string {
  switch (role) {
    case "ADMIN": return "/admin/dashboard";
    case "MANAGER": return "/manager/dashboard";
    case "TRAINER": return "/trainer/dashboard";
    default: return "/client/dashboard";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const r = await fetchRoleFromFirestore(firebaseUser.uid);
        setRole(r);
        await updateServerSession(firebaseUser, r);
      } else {
        setRole(null);
        await updateServerSession(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Обновление сессионной куки каждые 50 мин (JWT живёт ~1 ч)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const auth = getFirebaseAuth();
      const current = auth.currentUser;
      if (!current) return;
      try {
        const r = await fetchRoleFromFirestore(current.uid);
        await updateServerSession(current, r);
      } catch { /* ignore */ }
    }, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string, password: string): Promise<AppRole> => {
    const auth = getFirebaseAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Сначала читаем роль из Firestore через клиентский SDK (всегда работает)
    const r = await fetchRoleFromFirestore(cred.user.uid);
    setRole(r);
    // Передаём роль на сервер вместе с токеном
    await updateServerSession(cred.user, r);
    return r;
  };

  const register = async (email: string, password: string, profile?: RegisterProfile) => {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const db = getFirestoreDb();
    await setDoc(doc(db, "users", cred.user.uid), {
      id: cred.user.uid,
      email,
      role: "CLIENT",
      createdAt: Timestamp.now(),
      lastName: profile?.lastName ?? "",
      firstName: profile?.firstName ?? "",
      middleName: profile?.middleName ?? "",
      birthDate: profile?.birthDate ?? "",
      gender: profile?.gender ?? "MALE",
      height: profile?.height ?? 0,
      weight: profile?.weight ?? 0,
      fitnessGoal: profile?.fitnessGoal ?? "MAINTENANCE",
      phone: "",
      photoUrl: ""
    });
    await updateServerSession(cred.user, "CLIENT");
    setRole("CLIENT");
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
    await updateServerSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
