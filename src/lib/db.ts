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
  Chat,
  ChatMessage,
  FoodEntry,
  GymVisit,
  Expense,
  Revenue,
  Language
} from "@/lib/models";

// =============================================================================
//  HypeSportClub — слой обращения к Firestore
//  Соответствует схеме данных из rules and example data/firestore_export.json
// =============================================================================

let _db: Firestore | null = null;
function db(): Firestore {
  if (!_db) _db = getFirestoreDb();
  return _db;
}

// ----------------------------- утилиты времени -----------------------------

/** Преобразует значение поля Firestore в Timestamp. Если уже Timestamp — возвращает как есть. */
function toTimestamp(v: unknown): Timestamp {
  if (!v) return Timestamp.fromMillis(0);
  if (v instanceof Timestamp) return v;
  // ISO-строка или объект { seconds, nanoseconds } / { _seconds, _nanoseconds }
  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? Timestamp.fromMillis(ms) : Timestamp.fromMillis(0);
  }
  const o = v as { seconds?: number; _seconds?: number; nanoseconds?: number; _nanoseconds?: number; toDate?: () => Date; toMillis?: () => number };
  if (typeof o.toMillis === "function") return Timestamp.fromMillis(o.toMillis());
  if (typeof o.toDate === "function") return Timestamp.fromMillis(o.toDate().getTime());
  const sec = o.seconds ?? o._seconds;
  if (typeof sec === "number") {
    const nanos = o.nanoseconds ?? o._nanoseconds ?? 0;
    return new Timestamp(sec, nanos);
  }
  return Timestamp.fromMillis(0);
}

// ----------------------------- USERS -----------------------------

function mapUser(id: string, data: any): User {
  return {
    id: data.id ?? id,
    email: data.email ?? "",
    phone: data.phone ?? "",
    lastName: data.lastName ?? "",
    firstName: data.firstName ?? "",
    middleName: data.middleName ?? "",
    birthDate: data.birthDate ?? "",
    role: (data.role ?? "CLIENT") as User["role"],
    createdAt: data.createdAt ? toTimestamp(data.createdAt) : undefined,
    gender: data.gender,
    weight: data.weight,
    height: data.height,
    fitnessGoal: data.fitnessGoal,
    photoUrl: data.photoUrl ?? data.photoURL ?? "",
    language: (data.language === "en" ? "en" : "ru") as Language
  };
}

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

export async function updateUserLanguage(uid: string, language: Language) {
  await updateDoc(doc(db(), "users", uid), { language });
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
  data: Partial<Pick<User, "email" | "phone" | "lastName" | "firstName" | "middleName" | "birthDate" | "role" | "gender" | "photoUrl" | "language">>
) {
  await updateDoc(doc(db(), "users", userId), data as any);
}

export async function deleteUser(userId: string) {
  await deleteDoc(doc(db(), "users", userId));
  const subsSnap = await getDocs(
    query(collection(db(), "user_subscriptions"), where("userId", "==", userId))
  );
  for (const d of subsSnap.docs) {
    await deleteDoc(d.ref);
  }
}

// ----------------------------- SUBSCRIPTIONS -----------------------------

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

// ----------------------------- USER SUBSCRIPTIONS -----------------------------

function mapUserSub(id: string, data: any): UserSubscription {
  return {
    id,
    userId: data.userId ?? "",
    orderId: data.orderId ?? data.oderId ?? "",        // в данных встречается опечатка `oderId`
    subscriptionId: data.subscriptionId ?? "",
    subscriptionName: data.subscriptionName ?? "",
    subscriptionDescription: data.subscriptionDescription ?? "",
    subscriptionIconEmoji: data.subscriptionIconEmoji ?? "",
    subscriptionFeatures: Array.isArray(data.subscriptionFeatures) ? data.subscriptionFeatures : [],
    startDate: toTimestamp(data.startDate),
    endDate: toTimestamp(data.endDate),
    active: data.active !== false
  };
}

export async function getUserSubscriptions(uid: string): Promise<UserSubscription[]> {
  const q = query(collection(db(), "user_subscriptions"), where("userId", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapUserSub(d.id, d.data()));
}

export function subscribeUserSubscriptions(uid: string, cb: (subs: UserSubscription[]) => void) {
  const q = query(collection(db(), "user_subscriptions"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapUserSub(d.id, d.data())));
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
    const currentEnd = toTimestamp(data.endDate);
    const endDate = currentEnd.toDate();
    endDate.setDate(endDate.getDate() + subscription.durationDays);
    const newEnd = Timestamp.fromDate(endDate);
    await updateDoc(docSnap.ref, { endDate: newEnd });
    return mapUserSub(docSnap.id, { ...data, endDate: newEnd });
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
  return mapUserSub(newDoc.id, payload);
}

export async function getAllUserSubscriptions(): Promise<UserSubscription[]> {
  try {
    const snap = await getDocs(collection(db(), "user_subscriptions"));
    return snap.docs.map((d) => mapUserSub(d.id, d.data()));
  } catch { return []; }
}

// ----------------------------- TRAINERS -----------------------------

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

// ----------------------------- GROUP WORKOUTS -----------------------------

function mapWorkout(id: string, data: any): GroupWorkout {
  return {
    id,
    name: data.name ?? "",
    description: data.description ?? "",
    trainerId: data.trainerId ?? "",
    trainerName: data.trainerName ?? "",
    clientId: data.clientId ?? "",
    clientName: data.clientName ?? "",
    dateTime: toTimestamp(data.dateTime),
    durationMinutes: data.durationMinutes ?? 60,
    maxParticipants: data.maxParticipants ?? 20,
    currentParticipants: data.currentParticipants ?? 0,
    participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
    isIndividual: data.isIndividual === true,
    active: data.active !== false,
    status: data.status,
    availabilitySlotId: data.availabilitySlotId
  };
}

export async function getAllGroupWorkouts(onlyActive = true): Promise<GroupWorkout[]> {
  const ref = collection(db(), "group_workouts");
  const q = onlyActive ? query(ref, where("active", "==", true)) : ref;
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => mapWorkout(d.id, d.data()));
  return list.sort((a, b) => a.dateTime.toMillis() - b.dateTime.toMillis());
}

export async function getTrainerIndividualWorkouts(trainerIds: string[]): Promise<GroupWorkout[]> {
  const ids = trainerIds.filter(Boolean);
  if (ids.length === 0) return [];
  try {
    const all = await getAllGroupWorkouts(false);
    const now = Date.now();
    return all.filter(
      (w) => w.isIndividual && ids.includes(w.trainerId) && w.dateTime.toMillis() >= now
    );
  } catch {
    return [];
  }
}

/** Все будущие тренировки тренера (групповые + индивидуальные). */
export async function getTrainerAllWorkouts(trainerIds: string[]): Promise<GroupWorkout[]> {
  const ids = trainerIds.filter(Boolean);
  if (ids.length === 0) return [];
  try {
    const all = await getAllGroupWorkouts(false);
    return all.filter((w) => ids.includes(w.trainerId));
  } catch {
    return [];
  }
}

export async function addGroupWorkout(workout: Omit<GroupWorkout, "id">) {
  await addDoc(collection(db(), "group_workouts"), workout);
}

export async function updateGroupWorkout(id: string, data: Partial<Pick<GroupWorkout, "dateTime" | "durationMinutes" | "name" | "description">>) {
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

// ----------------------------- NUTRITION HISTORY (BMR) -----------------------------

export async function getNutritionHistory(uid: string): Promise<NutritionHistoryEntry[]> {
  try {
    const ref = collection(db(), "users", uid, "nutritionHistory");
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const raw = d.data() as any;
      return {
        id: d.id,
        createdAt: toTimestamp(raw.createdAt),
        input: raw.input ?? {},
        result: raw.result ?? {}
      } as NutritionHistoryEntry;
    });
  } catch {
    return [];
  }
}

export interface BmrCalculationInput {
  gender: "MALE" | "FEMALE";
  weight: number;
  height: number;
  age: number;
  activity: "LOW" | "MEDIUM" | "HIGH";
  goal: "WEIGHT_LOSS" | "MUSCLE_GAIN" | "MAINTENANCE";
}

export interface BmrCalculationResult {
  bmr: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

/**
 * Расчёт БЖУ по формуле Миффлина-Сан Жеора (тот же алгоритм, что в Cloud Function).
 * Сохраняем результат прямо в подколлекцию users/{uid}/nutritionHistory,
 * чтобы веб-клиент работал даже без задеплоенных Functions.
 */
export async function calculateAndSaveBmr(
  uid: string,
  input: BmrCalculationInput
): Promise<BmrCalculationResult> {
  const { gender, weight, height, age, activity, goal } = input;
  const s = gender === "MALE" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * height - 5 * age + s;
  const activityFactor = activity === "LOW" ? 1.375 : activity === "MEDIUM" ? 1.55 : 1.725;
  let calories = bmr * activityFactor;
  if (goal === "WEIGHT_LOSS") calories -= 300;
  if (goal === "MUSCLE_GAIN") calories += 300;
  const protein = (calories * 0.3) / 4;
  const fat = (calories * 0.25) / 9;
  const carbs = (calories * 0.45) / 4;

  const result: BmrCalculationResult = {
    bmr: Math.round(bmr),
    calories: Math.round(calories),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs)
  };

  await addDoc(collection(db(), "users", uid, "nutritionHistory"), {
    createdAt: Timestamp.now(),
    input,
    result
  });

  return result;
}

// ----------------------------- FOOD ENTRIES (дневник питания) -----------------------------

function mapFoodEntry(id: string, data: any): FoodEntry {
  return {
    id,
    userId: data.userId ?? "",
    productName: data.productName ?? "",
    weightGrams: Number(data.weightGrams ?? 0),
    calories: Number(data.calories ?? 0),
    proteins: Number(data.proteins ?? 0),
    fats: Number(data.fats ?? 0),
    carbs: Number(data.carbs ?? 0),
    date: data.date ?? "",
    createdAt: toTimestamp(data.createdAt)
  };
}

/** Возвращает все записи в дневнике питания клиента (без сортировки). */
export async function getFoodEntries(uid: string): Promise<FoodEntry[]> {
  try {
    const q = query(collection(db(), "food_entries"), where("userId", "==", uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapFoodEntry(d.id, d.data()))
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  } catch {
    return [];
  }
}

/** Записи дневника за конкретную дату YYYY-MM-DD. */
export async function getFoodEntriesByDate(uid: string, date: string): Promise<FoodEntry[]> {
  try {
    const q = query(
      collection(db(), "food_entries"),
      where("userId", "==", uid),
      where("date", "==", date)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapFoodEntry(d.id, d.data()));
  } catch {
    return [];
  }
}

export interface DailyNutritionSummary {
  date: string;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  entries: FoodEntry[];
}

/** Сводка БЖУ по дням за последние `days` дней. */
export async function getNutritionSummary(uid: string, days = 7): Promise<DailyNutritionSummary[]> {
  const all = await getFoodEntries(uid);
  const map = new Map<string, DailyNutritionSummary>();
  for (const e of all) {
    if (!map.has(e.date)) {
      map.set(e.date, { date: e.date, calories: 0, proteins: 0, fats: 0, carbs: 0, entries: [] });
    }
    const day = map.get(e.date)!;
    day.calories += e.calories;
    day.proteins += e.proteins;
    day.fats += e.fats;
    day.carbs += e.carbs;
    day.entries.push(e);
  }
  return Array.from(map.values())
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, days);
}

// ----------------------------- TRAINER AVAILABILITY (по датам) -----------------------------

function mapAvailability(id: string, data: any): TrainerAvailability {
  // дата может быть ISO с временем, ISO без времени, или Timestamp
  let date = "";
  if (typeof data.date === "string") {
    date = data.date.length >= 10 ? data.date.substring(0, 10) : data.date;
  } else if (data.date) {
    const ts = toTimestamp(data.date);
    date = ts.toDate().toISOString().substring(0, 10);
  }
  return {
    id,
    trainerId: data.trainerId ?? "",
    trainerName: data.trainerName,
    date,
    startTime: data.startTime ?? "09:00",
    endTime: data.endTime ?? "18:00",
    isAvailable: data.isAvailable !== false,
    notes: data.notes ?? ""
  };
}

/** Слоты доступности тренера, отсортированные по дате (ASC). */
export async function getTrainerAvailability(trainerId: string): Promise<TrainerAvailability[]> {
  if (!trainerId || typeof trainerId !== "string") return [];
  try {
    const q = query(collection(db(), "trainer_availability"), where("trainerId", "==", trainerId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapAvailability(d.id, d.data()))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  } catch {
    return [];
  }
}

/** Добавить слот. trainerId должен совпадать с request.auth.uid (см. правила). */
export async function addTrainerAvailability(
  trainerId: string,
  trainerName: string,
  date: string,
  startTime: string,
  endTime: string,
  notes = ""
) {
  // нормализуем дату до "YYYY-MM-DD"
  const norm = date.length >= 10 ? date.substring(0, 10) : date;
  await addDoc(collection(db(), "trainer_availability"), {
    trainerId,
    trainerName,
    date: norm,
    startTime,
    endTime,
    isAvailable: true,
    notes
  });
}

export async function deleteTrainerAvailability(slotId: string) {
  await deleteDoc(doc(db(), "trainer_availability", slotId));
}

export async function updateTrainerAvailability(
  slotId: string,
  data: Partial<Pick<TrainerAvailability, "date" | "startTime" | "endTime" | "isAvailable" | "notes">>
) {
  await updateDoc(doc(db(), "trainer_availability", slotId), data as any);
}

// ----------------------------- ЗАПИСЬ НА ИНДИВИДУАЛЬНУЮ ТРЕНИРОВКУ -----------------------------

export interface BookIndividualSlotParams {
  clientId: string;
  clientName: string;
  trainerId: string;
  trainerName: string;
  dateTime: Timestamp;
  durationMinutes: number;
  availabilitySlotId: string;
}

function workoutDateHourKey(dateTime: Timestamp): { dateStr: string; hour: number } {
  const dt = dateTime.toDate();
  const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  return { dateStr, hour: dt.getHours() };
}

/** Проверяет, занят ли час у тренера (по уже созданным индивидуальным тренировкам). */
export function isTrainerHourBooked(workouts: GroupWorkout[], dateTime: Timestamp): boolean {
  const { dateStr, hour } = workoutDateHourKey(dateTime);
  return workouts.some((w) => {
    const wk = workoutDateHourKey(w.dateTime);
    return wk.dateStr === dateStr && wk.hour === hour;
  });
}

/** Сразу создаёт индивидуальную тренировку в свободный слот (без заявок и одобрения). */
export async function bookIndividualSlot(params: BookIndividualSlotParams): Promise<string> {
  const { clientId, clientName, trainerId, trainerName, dateTime, durationMinutes, availabilitySlotId } = params;
  const booked = await getTrainerIndividualWorkouts([trainerId]);
  if (isTrainerHourBooked(booked, dateTime)) {
    throw new Error("SLOT_TAKEN");
  }
  const ref = await addDoc(collection(db(), "group_workouts"), {
    name: "Индивидуальная тренировка",
    description: "",
    trainerId,
    trainerName,
    clientId,
    clientName,
    dateTime,
    durationMinutes,
    maxParticipants: 1,
    currentParticipants: 1,
    participantIds: [clientId],
    isIndividual: true,
    active: true,
    availabilitySlotId,
  });
  return ref.id;
}

// ----------------------------- ЧАТЫ (плоская коллекция) -----------------------------

/** Формирует chatId из двух uid (отсортировано). Используется для группировки сообщений. */
export function buildChatId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

/** Извлекает участников из chatId. */
export function parseChatId(chatId: string): string[] {
  return chatId.split("_").filter(Boolean);
}

function mapChatMessage(id: string, data: any): ChatMessage {
  return {
    id,
    chatId: data.chatId ?? "",
    senderId: data.senderId ?? "",
    senderName: data.senderName ?? "",
    text: data.text ?? "",
    imageUrl: data.imageUrl ?? undefined,
    timestamp: toTimestamp(data.timestamp ?? data.createdAt),
    editedAt: data.editedAt ? toTimestamp(data.editedAt) : undefined,
    isRead: data.isRead === true
  };
}

/** Текст превью для списка чатов. */
export function getChatMessagePreview(m: Pick<ChatMessage, "text" | "imageUrl">, photoLabel = "📷"): string {
  const trimmed = m.text?.trim();
  if (trimmed) return trimmed;
  if (m.imageUrl) return photoLabel;
  return "";
}

/** Возвращает список чатов для пользователя — агрегат по chatId всех сообщений. */
export async function getChatsForUser(uid: string): Promise<Chat[]> {
  try {
    const snap = await getDocs(collection(db(), "chats"));
    const messages = snap.docs.map((d) => mapChatMessage(d.id, d.data()));
    const myMessages = messages.filter((m) => parseChatId(m.chatId).includes(uid));

    // Группируем по chatId
    const map = new Map<string, Chat>();
    for (const m of myMessages) {
      const chatId = m.chatId;
      const ids = parseChatId(chatId);
      const otherId = ids.find((id) => id !== uid) ?? "";
      if (!map.has(chatId)) {
        map.set(chatId, {
          id: chatId,
          participantIds: ids,
          participantNames: { [otherId]: "" },
          lastMessage: getChatMessagePreview(m),
          lastMessageAt: m.timestamp,
          unreadForMe: 0
        });
      }
      const c = map.get(chatId)!;
      // имя участника берём из senderName, если он не я
      if (m.senderId !== uid && m.senderName) {
        c.participantNames[m.senderId] = m.senderName;
      }
      // более позднее сообщение считается lastMessage
      if (m.timestamp.toMillis() > (c.lastMessageAt?.toMillis() ?? 0)) {
        c.lastMessage = getChatMessagePreview(m);
        c.lastMessageAt = m.timestamp;
      }
      // Непрочитанные сообщения от собеседника
      if (m.senderId !== uid && !m.isRead) {
        c.unreadForMe = (c.unreadForMe ?? 0) + 1;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0)
    );
  } catch { return []; }
}

/** Подписка на список чатов пользователя в реальном времени. */
export function subscribeChatsForUser(uid: string, cb: (chats: Chat[]) => void) {
  const ref = collection(db(), "chats");
  return onSnapshot(ref, async (snap) => {
    const messages = snap.docs.map((d) => mapChatMessage(d.id, d.data()));
    const myMessages = messages.filter((m) => parseChatId(m.chatId).includes(uid));
    const map = new Map<string, Chat>();
    for (const m of myMessages) {
      const ids = parseChatId(m.chatId);
      const otherId = ids.find((id) => id !== uid) ?? "";
      if (!map.has(m.chatId)) {
        map.set(m.chatId, {
          id: m.chatId,
          participantIds: ids,
          participantNames: { [otherId]: "" },
          lastMessage: getChatMessagePreview(m),
          lastMessageAt: m.timestamp,
          unreadForMe: 0
        });
      }
      const c = map.get(m.chatId)!;
      if (m.senderId !== uid && m.senderName) c.participantNames[m.senderId] = m.senderName;
      if (m.timestamp.toMillis() > (c.lastMessageAt?.toMillis() ?? 0)) {
        c.lastMessage = getChatMessagePreview(m);
        c.lastMessageAt = m.timestamp;
      }
      if (m.senderId !== uid && !m.isRead) c.unreadForMe = (c.unreadForMe ?? 0) + 1;
    }
    cb(Array.from(map.values()).sort(
      (a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0)
    ));
  }, () => cb([]));
}

/** Возвращает chatId; если истории ещё нет — она будет создана при первом отправленном сообщении. */
export async function getOrCreateChat(participantIds: string[], _participantNames?: Record<string, string>, _workoutId?: string): Promise<string> {
  const ids = [...participantIds].sort();
  return ids.join("_");
}

/** Все сообщения чата по chatId, отсортированные по timestamp ASC. */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    const q = query(collection(db(), "chats"), where("chatId", "==", chatId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapChatMessage(d.id, d.data()))
      .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
  } catch { return []; }
}

export function subscribeChatMessages(chatId: string, cb: (msgs: ChatMessage[]) => void) {
  const q = query(collection(db(), "chats"), where("chatId", "==", chatId));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs
        .map((d) => mapChatMessage(d.id, d.data()))
        .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())
    );
  }, () => cb([]));
}

export async function sendChatMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  imageUrl?: string
) {
  const trimmed = text.trim();
  if (!trimmed && !imageUrl) {
    throw new Error("Сообщение должно содержать текст или фото");
  }
  const payload: Record<string, unknown> = {
    chatId,
    senderId,
    senderName,
    text: trimmed,
    timestamp: Timestamp.now(),
    isRead: false
  };
  if (imageUrl) payload.imageUrl = imageUrl;
  await addDoc(collection(db(), "chats"), payload);
}

export async function updateChatMessage(messageId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Текст сообщения не может быть пустым");
  await updateDoc(doc(db(), "chats", messageId), {
    text: trimmed,
    editedAt: Timestamp.now()
  });
}

export async function deleteChatMessage(messageId: string) {
  await deleteDoc(doc(db(), "chats", messageId));
}

/** Помечает все непрочитанные сообщения в чате (адресованные мне) как прочитанные. */
export async function markChatRead(chatId: string, myUid: string) {
  try {
    const q = query(collection(db(), "chats"), where("chatId", "==", chatId));
    const snap = await getDocs(q);
    const updates = snap.docs
      .filter((d) => {
        const data = d.data() as any;
        return data.senderId !== myUid && data.isRead !== true;
      })
      .map((d) => updateDoc(d.ref, { isRead: true }));
    await Promise.all(updates);
  } catch { /* best-effort */ }
}

// ----------------------------- ФИНАНСЫ (руководитель) -----------------------------

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

// ----------------------------- КАЛЕНДАРЬ АКТИВНОСТИ (посещения) -----------------------------

/**
 * Считает посещения зала клиента: будущие и прошедшие тренировки, на которых клиент — участник.
 * Источник — `group_workouts` (групповые с participantIds + индивидуальные где clientId == uid).
 */
export async function getGymVisits(uid: string): Promise<GymVisit[]> {
  const all = await getAllGroupWorkouts(false);
  const mine = all.filter((w) => {
    if (w.isIndividual) return w.clientId === uid;
    return (w.participantIds ?? []).includes(uid);
  });
  const map = new Map<string, GymVisit>();
  for (const w of mine) {
    const d = w.dateTime.toDate();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { date: key, workoutIds: [], workoutNames: [] });
    const v = map.get(key)!;
    v.workoutIds.push(w.id);
    v.workoutNames.push(w.isIndividual ? "Индивидуальная" : w.name);
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}
