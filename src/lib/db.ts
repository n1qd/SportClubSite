import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  addDoc,
  deleteDoc,
  Timestamp,
  Firestore
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import type {
  User,
  Subscription,
  UserSubscription,
  Trainer,
  GroupWorkout,
  NutritionHistoryEntry,
  TrainerAvailability,
  TrainingRequest,
  Chat,
  ChatMessage,
  Expense,
  Revenue
} from "@/lib/models";

// Ленивая инициализация — не вызывать на SSR
let _db: Firestore | null = null;
function db(): Firestore {
  if (!_db) _db = getFirestoreDb();
  return _db;
}

function mapUser(id: string, data: any): User {
  return {
    id,
    email: data.email ?? "",
    phone: data.phone ?? "",
    lastName: data.lastName ?? "",
    firstName: data.firstName ?? "",
    middleName: data.middleName ?? "",
    birthDate: data.birthDate ?? "",
    role: (data.role ?? "CLIENT") as User["role"],
    createdAt: data.createdAt,
    gender: data.gender,
    weight: data.weight,
    height: data.height,
    fitnessGoal: data.fitnessGoal,
    photoUrl: data.photoUrl ?? data.photoURL ?? ""
  };
}

// ==================== ПОЛЬЗОВАТЕЛИ ====================

export async function getCurrentUser(uid: string): Promise<User | null> {
  const ref = doc(db(), "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapUser(snap.id, snap.data());
}

export function subscribeCurrentUser(uid: string, cb: (u: User | null) => void) {
  const ref = doc(db(), "users", uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) { cb(null); return; }
      cb(mapUser(snap.id, snap.data()));
    },
    () => cb(null)
  );
}

export async function updateUserContact(uid: string, phone: string, email: string) {
  await updateDoc(doc(db(), "users", uid), { phone, email });
}

export async function updateUserHealth(
  uid: string,
  gender: string,
  weight: number,
  height: number,
  fitnessGoal: string
) {
  await updateDoc(doc(db(), "users", uid), { gender, weight, height, fitnessGoal });
}

export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db(), "users"));
  return snap.docs.map((d) => mapUser(d.id, d.data()));
}

export async function getUsersByIds(ids: string[]): Promise<User[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return [];
  const results: User[] = [];
  for (const id of unique) {
    try {
      const u = await getCurrentUser(id);
      if (u) results.push(u);
    } catch { /* skip */ }
  }
  return results;
}

export async function updateUserData(
  userId: string,
  data: Partial<Pick<User, "email" | "phone" | "lastName" | "firstName" | "middleName" | "birthDate" | "role" | "gender" | "photoUrl">>
) {
  await updateDoc(doc(db(), "users", userId), data as any);
}

export async function deleteUser(userId: string) {
  await deleteDoc(doc(db(), "users", userId));
  // Удалить подписки
  const subsSnap = await getDocs(
    query(collection(db(), "user_subscriptions"), where("userId", "==", userId))
  );
  for (const d of subsSnap.docs) {
    await deleteDoc(d.ref);
  }
}

// ==================== АБОНЕМЕНТЫ (шаблоны) ====================

export async function getAvailableSubscriptions(): Promise<Subscription[]> {
  const snap = await getDocs(collection(db(), "subscriptions"));
  const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Subscription[];
  return list.filter((s) => s.active);
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const snap = await getDocs(collection(db(), "subscriptions"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Subscription[];
}

export async function addSubscription(sub: Omit<Subscription, "id">) {
  await addDoc(collection(db(), "subscriptions"), sub);
}

export async function updateSubscription(id: string, sub: Partial<Subscription>) {
  const { id: _id, ...data } = sub as any;
  await updateDoc(doc(db(), "subscriptions", id), data);
}

export async function deleteSubscription(id: string) {
  await deleteDoc(doc(db(), "subscriptions", id));
}

// ==================== АБОНЕМЕНТЫ ПОЛЬЗОВАТЕЛЯ ====================

export async function getUserSubscriptions(uid: string): Promise<UserSubscription[]> {
  const q = query(collection(db(), "user_subscriptions"), where("userId", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as UserSubscription[];
}

export function subscribeUserSubscriptions(uid: string, cb: (subs: UserSubscription[]) => void) {
  const q = query(collection(db(), "user_subscriptions"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as UserSubscription[]);
  }, () => cb([]));
}

export async function purchaseSubscription(uid: string, subscription: Subscription): Promise<UserSubscription> {
  const ref = collection(db(), "user_subscriptions");
  const existingSnap = await getDocs(
    query(ref, where("userId", "==", uid), where("subscriptionId", "==", subscription.id), where("active", "==", true))
  );

  const now = new Date();

  if (!existingSnap.empty) {
    const docSnap = existingSnap.docs[0];
    const data = docSnap.data() as any;
    const currentEnd: Timestamp = data.endDate;
    const endDate = currentEnd.toDate();
    endDate.setDate(endDate.getDate() + subscription.durationDays);
    const newEnd = Timestamp.fromDate(endDate);
    await updateDoc(docSnap.ref, { endDate: newEnd });
    return { id: docSnap.id, ...data, endDate: newEnd } as UserSubscription;
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + subscription.durationDays);

  const payload = {
    userId: uid,
    orderId: `ORD-${Date.now()}`,
    subscriptionId: subscription.id,
    subscriptionName: subscription.name,
    subscriptionDescription: subscription.description,
    subscriptionIconEmoji: subscription.iconEmoji,
    subscriptionFeatures: subscription.features,
    startDate: Timestamp.fromDate(now),
    endDate: Timestamp.fromDate(endDate),
    active: true
  };

  const newDoc = await addDoc(ref, payload);
  return { id: newDoc.id, ...payload } as unknown as UserSubscription;
}

export async function getAllUserSubscriptions(): Promise<UserSubscription[]> {
  try {
    const snap = await getDocs(collection(db(), "user_subscriptions"));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as UserSubscription[];
  } catch { return []; }
}

// ==================== ТРЕНЕРЫ ====================

export async function getAllTrainers(): Promise<Trainer[]> {
  const snap = await getDocs(collection(db(), "trainers"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Trainer[];
}

export async function getTrainerByUserId(userId: string): Promise<Trainer | null> {
  try {
    const q = query(collection(db(), "trainers"), where("userId", "==", userId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as Trainer;
  } catch { return null; }
}

export async function updateTrainer(trainerId: string, data: Partial<Pick<Trainer, "photoUrl" | "lastName" | "firstName" | "email" | "phone" | "pricePerTraining">>) {
  await updateDoc(doc(db(), "trainers", trainerId), data as any);
}

// ==================== ТРЕНИРОВКИ ====================

export async function getAllGroupWorkouts(onlyActive = true): Promise<GroupWorkout[]> {
  const ref = collection(db(), "group_workouts");
  const q = onlyActive ? query(ref, where("active", "==", true)) : ref;
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as GroupWorkout[];
  return list.sort((a, b) => {
    const ta = a.dateTime?.toMillis?.() ?? 0;
    const tb = b.dateTime?.toMillis?.() ?? 0;
    return ta - tb;
  });
}

/** Индивидуальные тренировки тренера в будущем (для исключения занятых слотов). trainerIds — и userId, и id документа тренера. */
export async function getTrainerIndividualWorkouts(trainerIds: string[]): Promise<GroupWorkout[]> {
  const ids = trainerIds.filter(Boolean);
  if (ids.length === 0) return [];
  try {
    const all = await getAllGroupWorkouts(false);
    const now = Date.now();
    return all.filter(
      (w) =>
        w.isIndividual &&
        ids.includes(w.trainerId) &&
        (w.dateTime?.toMillis?.() ?? 0) >= now
    );
  } catch {
    return [];
  }
}

export async function addGroupWorkout(workout: Omit<GroupWorkout, "id">) {
  await addDoc(collection(db(), "group_workouts"), workout);
}

export async function updateGroupWorkout(id: string, data: Partial<Pick<GroupWorkout, "dateTime" | "durationMinutes">>) {
  await updateDoc(doc(db(), "group_workouts", id), data as any);
}

export async function deleteGroupWorkout(id: string) {
  await deleteDoc(doc(db(), "group_workouts", id));
}

export async function signUpForWorkout(workoutId: string, uid: string) {
  const ref = doc(db(), "group_workouts", workoutId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Тренировка не найдена");
  const data = snap.data() as any;
  const participants: string[] = data.participantIds ?? [];
  const max = data.maxParticipants ?? 20;
  if (participants.includes(uid)) throw new Error("Вы уже записаны на эту тренировку");
  if (participants.length >= max) throw new Error("На тренировке нет свободных мест");
  const updated = [...participants, uid];
  await updateDoc(ref, { participantIds: updated, currentParticipants: updated.length });
}

export async function cancelWorkoutSignUp(workoutId: string, uid: string) {
  const ref = doc(db(), "group_workouts", workoutId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Тренировка не найдена");
  const data = snap.data() as any;
  const participants: string[] = data.participantIds ?? [];
  if (!participants.includes(uid)) throw new Error("Вы не записаны на эту тренировку");
  const updated = participants.filter((id) => id !== uid);
  await updateDoc(ref, { participantIds: updated, currentParticipants: Math.max(0, updated.length) });
}

// ==================== ИСТОРИЯ БЖУ ====================

export async function getNutritionHistory(uid: string): Promise<NutritionHistoryEntry[]> {
  try {
    const ref = collection(db(), "users", uid, "nutritionHistory");
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as NutritionHistoryEntry[];
  } catch {
    return [];
  }
}

// ==================== ДОСТУПНОСТЬ ТРЕНЕРА ====================

export async function getTrainerAvailability(trainerId: string): Promise<TrainerAvailability[]> {
  if (!trainerId || typeof trainerId !== "string") return [];
  try {
    const q = query(collection(db(), "trainer_availability"), where("trainerId", "==", trainerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        trainerId: data.trainerId ?? trainerId,
        dayOfWeek: data.dayOfWeek ?? data.day ?? 0,
        startHour: data.startHour ?? data.start ?? 9,
        endHour: data.endHour ?? data.end ?? 18,
      } as TrainerAvailability;
    });
  } catch {
    return [];
  }
}

export async function setTrainerAvailability(trainerId: string, slots: Omit<TrainerAvailability, "id">[]) {
  // Удаляем старые
  const existing = await getTrainerAvailability(trainerId);
  for (const e of existing) await deleteDoc(doc(db(), "trainer_availability", e.id));
  // Создаём новые
  for (const s of slots) await addDoc(collection(db(), "trainer_availability"), { ...s, trainerId });
}

// ==================== ЗАПРОСЫ НА ТРЕНИРОВКУ ====================

export async function createTrainingRequest(data: Omit<TrainingRequest, "id">) {
  return addDoc(collection(db(), "training_requests"), data);
}

export async function getTrainingRequests(filters?: { trainerId?: string; clientId?: string; status?: string }): Promise<TrainingRequest[]> {
  try {
    let q: any = collection(db(), "training_requests");
    const constraints: any[] = [];
    if (filters?.trainerId) constraints.push(where("trainerId", "==", filters.trainerId));
    if (filters?.clientId) constraints.push(where("clientId", "==", filters.clientId));
    if (filters?.status) constraints.push(where("status", "==", filters.status));
    q = constraints.length ? query(q, ...constraints) : q;
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as TrainingRequest[];
    return list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
  } catch { return []; }
}

export async function updateTrainingRequestStatus(id: string, status: "approved" | "rejected") {
  if (status === "approved") {
    const reqSnap = await getDoc(doc(db(), "training_requests", id));
    if (reqSnap.exists()) {
      const req = reqSnap.data() as any;
      await addGroupWorkout({
        name: "Индивидуальная тренировка",
        description: "",
        trainerId: req.trainerId ?? "",
        trainerName: req.trainerName ?? "",
        clientId: req.clientId ?? "",
        clientName: req.clientName ?? "",
        dateTime: req.requestedDateTime,
        durationMinutes: req.durationMinutes ?? 60,
        maxParticipants: 1,
        currentParticipants: 1,
        participantIds: [req.clientId].filter(Boolean),
        isIndividual: true,
        active: true,
      });
    }
  }
  await updateDoc(doc(db(), "training_requests", id), { status });
}

// ==================== МЕССЕНДЖЕР ====================

export async function getChatsForUser(uid: string): Promise<Chat[]> {
  try {
    const q = query(collection(db(), "chats"), where("participantIds", "array-contains", uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Chat[];
  } catch { return []; }
}

export async function getOrCreateChat(participantIds: string[], participantNames: Record<string, string>, workoutId?: string): Promise<string> {
  // Ищем существующий чат
  const q = query(collection(db(), "chats"), where("participantIds", "==", participantIds.sort()));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;
  const ref = await addDoc(collection(db(), "chats"), {
    participantIds: participantIds.sort(),
    participantNames,
    lastMessage: "",
    lastMessageAt: Timestamp.now(),
    workoutId: workoutId ?? ""
  });
  return ref.id;
}

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    const q = query(collection(db(), "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, chatId, ...(d.data() as any) })) as ChatMessage[];
  } catch { return []; }
}

export function subscribeChatMessages(chatId: string, cb: (msgs: ChatMessage[]) => void) {
  const q = query(collection(db(), "chats", chatId, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, chatId, ...(d.data() as any) })) as ChatMessage[]);
  }, () => cb([]));
}

export async function sendChatMessage(chatId: string, senderId: string, senderName: string, text: string) {
  await addDoc(collection(db(), "chats", chatId, "messages"), {
    senderId, senderName, text, createdAt: Timestamp.now(), read: false
  });
  await updateDoc(doc(db(), "chats", chatId), {
    lastMessage: text.substring(0, 100), lastMessageAt: Timestamp.now()
  });
}

// ==================== РАСХОДЫ (руководитель) ====================

export async function getExpenses(): Promise<Expense[]> {
  try {
    const q = query(collection(db(), "expenses"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Expense[];
  } catch { return []; }
}

export async function addExpense(data: Omit<Expense, "id">) {
  return addDoc(collection(db(), "expenses"), data);
}

export async function deleteExpense(id: string) {
  await deleteDoc(doc(db(), "expenses", id));
}

// ==================== ДОХОДЫ (руководитель) ====================

export async function getRevenues(): Promise<Revenue[]> {
  try {
    const q = query(collection(db(), "revenues"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Revenue[];
  } catch { return []; }
}

export async function addRevenue(data: Omit<Revenue, "id">) {
  return addDoc(collection(db(), "revenues"), data);
}
