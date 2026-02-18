import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage as getFirebaseStorageFn, FirebaseStorage } from "firebase/storage";

let app: FirebaseApp | null = null;

export function getFirebaseApp() {
  if (app) return app;

  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    // В dev можно оставить без инициализации, чтобы не падать при отсутствии env
    throw new Error("Firebase env variables are not configured");
  }

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

  app = getApps().length ? getApps()[0] : initializeApp(config);
  return app;
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  // Гарантируем persistence только в браузере
  if (typeof window !== "undefined") {
    setPersistence(auth, browserLocalPersistence).catch(() => undefined);
  }
  return auth;
}

export function getFirestoreDb() {
  const app = getFirebaseApp();
  return getFirestore(app);
}

let _storage: FirebaseStorage | null = null;
export function getStorage() {
  if (!_storage) _storage = getFirebaseStorageFn(getFirebaseApp());
  return _storage;
}

