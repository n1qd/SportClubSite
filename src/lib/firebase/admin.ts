import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | null = null;

export function getAdminApp() {
  if (adminApp) return adminApp;

  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error("FIREBASE_PROJECT_ID is not set");
  }

  if (getApps().length) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  // В проде рекомендуется использовать переменную с JSON сервис-аккаунта или Workload Identity.
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
      };

  adminApp = initializeApp({
    credential: cert(serviceAccount)
  });

  return adminApp;
}

export const adminAuth = () => getAuth(getAdminApp());

