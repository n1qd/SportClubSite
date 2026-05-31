import { Timestamp } from "firebase/firestore";

// =============================================================================
//  HypeSportClub — модели данных
//  Соответствует структуре БД (см. rules and example data/firestore_export.json)
// =============================================================================

export type UserRole = "CLIENT" | "TRAINER" | "ADMIN" | "MANAGER";
export type Language = "ru" | "en";

export interface User {
  id: string;
  email: string;
  phone: string;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string; // "dd.MM.yyyy"
  role: UserRole;
  createdAt?: Timestamp;
  gender?: "MALE" | "FEMALE";
  weight?: number;
  height?: number;
  fitnessGoal?: "WEIGHT_LOSS" | "MUSCLE_GAIN" | "MAINTENANCE";
  photoUrl?: string;
  language?: Language;
}

export interface Subscription {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  features: string[];
  iconEmoji: string;
  active: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  orderId: string;
  subscriptionId: string;
  subscriptionName: string;
  subscriptionDescription: string;
  subscriptionIconEmoji: string;
  subscriptionFeatures: string[];
  startDate: Timestamp;
  endDate: Timestamp;
  active: boolean;
}

export type TrainerSpecialization =
  | "FITNESS" | "BODYBUILDING" | "CROSSFIT" | "YOGA"
  | "PILATES" | "BOXING" | "SWIMMING" | "CARDIO";

export interface Trainer {
  id: string;
  userId: string;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string;
  email: string;
  phone: string;
  experience: number;
  specialization: TrainerSpecialization;
  specializations?: TrainerSpecialization[];
  achievements: string[];
  pricePerTraining: number;
  photoUrl?: string;
  createdAt?: Timestamp;
}

export interface GroupWorkout {
  id: string;
  name: string;
  description: string;
  trainerId: string;
  trainerName: string;
  clientId: string;
  clientName: string;
  dateTime: Timestamp;
  durationMinutes: number;
  maxParticipants: number;
  currentParticipants: number;
  participantIds: string[];
  isIndividual: boolean;
  active: boolean;
  status?: "pending" | "approved" | "rejected";
  /** Привязка к слоту доступности тренера, если запись пришла оттуда. */
  availabilitySlotId?: string;
}

// ==================== ИСТОРИЯ BMR-РАСЧЁТОВ ====================
// Подколлекция users/{uid}/nutritionHistory — заполняет Cloud Function calculateBMR.

export interface NutritionHistoryEntry {
  id: string;
  createdAt: Timestamp;
  input: {
    gender: "MALE" | "FEMALE";
    weight: number;
    height: number;
    age: number;
    activity: "LOW" | "MEDIUM" | "HIGH";
    goal: "WEIGHT_LOSS" | "MUSCLE_GAIN" | "MAINTENANCE";
  };
  result: {
    bmr: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

// ==================== ДНЕВНИК ПИТАНИЯ (food_entries) ====================
// Плоская коллекция — фактический приём пищи клиентом за день.

export interface FoodEntry {
  id: string;
  userId: string;
  productName: string;
  weightGrams: number;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  date: string;          // "YYYY-MM-DD"
  createdAt: Timestamp;
}

// ==================== ДОСТУПНОСТЬ ТРЕНЕРА (по конкретным датам) ====================
// Соответствует структуре в БД: { date, startTime, endTime, isAvailable, trainerId, trainerName, notes }

export interface TrainerAvailability {
  id: string;
  trainerId: string;
  trainerName?: string;
  date: string;          // ISO "YYYY-MM-DDT00:00:00+00:00" или "YYYY-MM-DD"
  startTime: string;     // "HH:mm"
  endTime: string;       // "HH:mm"
  isAvailable: boolean;
  notes?: string;
}

// ==================== МЕССЕНДЖЕР (плоская коллекция chats) ====================
// Каждый документ — отдельное сообщение; chatId = "uidA_uidB" (отсортировано).

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  /** Сжатое фото (data URL), хранится в Firestore. */
  imageUrl?: string;
  /** В реальной БД хранится поле `timestamp` (Timestamp). */
  timestamp: Timestamp;
  editedAt?: Timestamp;
  isRead: boolean;
}

/** Чат — производная сущность, агрегируется на клиенте по chatId. */
export interface Chat {
  id: string;                    // == chatId
  participantIds: string[];      // [uidA, uidB]
  participantNames: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  unreadForMe?: number;
}

// ==================== ФИНАНСЫ (руководитель) ====================

export type ExpenseCategory = "salary" | "marketing" | "repair" | "equipment" | "rent" | "other";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: Timestamp;
  createdBy: string;
}

export interface Revenue {
  id: string;
  source: string;
  amount: number;
  description: string;
  date: Timestamp;
  userId?: string;
}

// ==================== КАЛЕНДАРЬ АКТИВНОСТИ ====================
// Производная сущность: рассчитывается из group_workouts (где клиент — участник).

export interface GymVisit {
  date: string;          // "YYYY-MM-DD"
  workoutIds: string[];
  workoutNames: string[];
}
