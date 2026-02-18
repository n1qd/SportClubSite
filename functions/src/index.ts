import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as yup from "yup";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type Role = "user" | "admin" | "manager";

async function ensureRateLimit(
  context: functions.https.CallableContext,
  key: string,
  limitPerMinute: number
) {
  requireAuth(context);
  const uid = context.auth!.uid;
  const docRef = db.collection("rateLimits").doc(`${uid}:${key}`);
  const now = Date.now();
  const windowMs = 60_000;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const data = snap.data() as { ts: number; count: number } | undefined;
    if (!data || now - data.ts > windowMs) {
      tx.set(docRef, { ts: now, count: 1 });
      return;
    }
    if (data.count >= limitPerMinute) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Превышен лимит запросов. Попробуйте позже."
      );
    }
    tx.update(docRef, { count: data.count + 1 });
  });
}

function requireAuth(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Требуется авторизация");
  }
}

function requireRole(context: functions.https.CallableContext, roles: Role | Role[]) {
  requireAuth(context);
  const list = Array.isArray(roles) ? roles : [roles];
  const role = (context.auth!.token.role as Role | undefined) ?? "user";
  if (!list.includes(role)) {
    throw new functions.https.HttpsError("permission-denied", "Недостаточно прав");
  }
}

// ===== calculateBMR =====

const calculateBmrSchema = yup.object({
  gender: yup.mixed<"MALE" | "FEMALE">().oneOf(["MALE", "FEMALE"]).required(),
  weight: yup.number().min(30).max(300).required(),
  height: yup.number().min(120).max(250).required(),
  age: yup.number().min(10).max(100).required(),
  activity: yup
    .mixed<"LOW" | "MEDIUM" | "HIGH">()
    .oneOf(["LOW", "MEDIUM", "HIGH"])
    .required(),
  goal: yup
    .mixed<"WEIGHT_LOSS" | "MUSCLE_GAIN" | "MAINTENANCE">()
    .oneOf(["WEIGHT_LOSS", "MUSCLE_GAIN", "MAINTENANCE"])
    .required()
});

export const calculateBMR = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  await ensureRateLimit(context, "calculateBMR", 10);

  const input = await calculateBmrSchema.validate(data, { abortEarly: false });

  // Формула Миффлина-Сан Жеора
  const { gender, weight, height, age, activity, goal } = input;
  const s = gender === "MALE" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * height - 5 * age + s;

  const activityFactor =
    activity === "LOW" ? 1.375 : activity === "MEDIUM" ? 1.55 : 1.725;
  let calories = bmr * activityFactor;

  if (goal === "WEIGHT_LOSS") calories -= 300;
  if (goal === "MUSCLE_GAIN") calories += 300;

  const protein = (calories * 0.3) / 4;
  const fat = (calories * 0.25) / 9;
  const carbs = (calories * 0.45) / 4;

  const uid = context.auth!.uid;

  await db
    .collection("users")
    .doc(uid)
    .collection("nutritionHistory")
    .add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      input,
      result: {
        bmr: Math.round(bmr),
        calories: Math.round(calories),
        protein: Math.round(protein),
        fat: Math.round(fat),
        carbs: Math.round(carbs)
      }
    });

  return {
    bmr: Math.round(bmr),
    calories: Math.round(calories),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs)
  };
});

// ===== bookTraining =====

const bookTrainingSchema = yup.object({
  trainingId: yup.string().required(),
  type: yup.mixed<"GROUP" | "INDIVIDUAL">().oneOf(["GROUP", "INDIVIDUAL"]).required()
});

export const bookTraining = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  await ensureRateLimit(context, "bookTraining", 20);
  const { trainingId, type } = await bookTrainingSchema.validate(data, {
    abortEarly: false
  });

  const uid = context.auth!.uid;
  const trainingRef = db.collection("trainings").doc(trainingId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(trainingRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError("not-found", "Тренировка не найдена");
    }

    const training = snap.data() as any;
    if (!training.active) {
      throw new functions.https.HttpsError("failed-precondition", "Тренировка недоступна");
    }

    if (type === "GROUP") {
      const participants: string[] = training.participantIds ?? [];
      const max = training.maxParticipants ?? 20;
      if (participants.includes(uid)) {
        throw new functions.https.HttpsError(
          "already-exists",
          "Вы уже записаны на эту тренировку"
        );
      }
      if (participants.length >= max) {
        throw new functions.https.HttpsError("resource-exhausted", "Нет свободных мест");
      }

      participants.push(uid);
      tx.update(trainingRef, {
        participantIds: participants,
        currentParticipants: participants.length
      });
    } else {
      // INDIVIDUAL: связываем тренировку с конкретным пользователем
      tx.update(trainingRef, {
        clientId: uid
      });
    }
  });

  return { ok: true };
});

// ===== processPayment =====

const processPaymentSchema = yup.object({
  userId: yup.string().required(),
  subscriptionId: yup.string().required(),
  amount: yup.number().min(0).required(),
  method: yup.string().required()
});

export const processPayment = functions.https.onCall(async (data, context) => {
  requireRole(context, ["admin", "manager"]);
  await ensureRateLimit(context, "processPayment", 30);
  const input = await processPaymentSchema.validate(data, { abortEarly: false });

  const { userId, subscriptionId, amount, method } = input;

  const paymentRef = db.collection("payments").doc();

  await db.runTransaction(async (tx) => {
    tx.set(paymentRef, {
      userId,
      subscriptionId,
      amount,
      method,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth!.uid
    });

    const balanceRef = db.collection("balances").doc(userId);
    const balanceSnap = await tx.get(balanceRef);
    const current = (balanceSnap.data()?.amount as number | undefined) ?? 0;
    tx.set(
      balanceRef,
      { amount: current + amount, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  });

  return { ok: true };
});

// ===== sendNotification =====

const sendNotificationSchema = yup.object({
  userId: yup.string().required(),
  title: yup.string().required(),
  body: yup.string().required()
});

export const sendNotification = functions.https.onCall(async (data, context) => {
  requireRole(context, ["admin", "manager", "user"]);
  await ensureRateLimit(context, "sendNotification", 60);
  const input = await sendNotificationSchema.validate(data, { abortEarly: false });

  // Здесь можно интегрировать FCM: admin.messaging().sendToDevice(...)
  await db.collection("notifications").add({
    userId: input.userId,
    title: input.title,
    body: input.body,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: context.auth!.uid
  });

  return { ok: true };
});

// ===== generateReport =====

const generateReportSchema = yup.object({
  periodFrom: yup.string().required(),
  periodTo: yup.string().required(),
  type: yup.mixed<"FINANCE" | "ATTENDANCE">().oneOf(["FINANCE", "ATTENDANCE"]).required()
});

export const generateReport = functions.https.onCall(async (data, context) => {
  requireRole(context, ["manager"]);
  await ensureRateLimit(context, "generateReport", 5);
  const input = await generateReportSchema.validate(data, { abortEarly: false });

  // Здесь может быть тяжёлая агрегация по платежам или посещениям.
  // Для примера вернём только метаданные.
  const reportRef = db.collection("reports").doc();
  await reportRef.set({
    ...input,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: context.auth!.uid
  });

  return { reportId: reportRef.id };
});

// ===== syncUserData =====

const syncUserDataSchema = yup.object({
  userId: yup.string().required()
});

export const syncUserData = functions.https.onCall(async (data, context) => {
  requireRole(context, ["admin", "manager"]);
  await ensureRateLimit(context, "syncUserData", 30);
  const { userId } = await syncUserDataSchema.validate(data, { abortEarly: false });

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Пользователь не найден");
  }

  const userData = userDoc.data()!;

  // Пример синхронизации с агрегированной коллекцией
  await db.collection("userSnapshots").doc(userId).set(
    {
      email: userData.email,
      fullName: userData.fullName ?? "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return { ok: true };
});

