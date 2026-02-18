import { Timestamp } from "firebase/firestore";

export type UserRole = "CLIENT" | "TRAINER" | "ADMIN" | "MANAGER";

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
  status?: "pending" | "approved" | "rejected"; // для согласования с админом
}

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

// ==================== ДОСТУПНОСТЬ ТРЕНЕРА ====================

export interface TrainerAvailability {
  id: string;
  trainerId: string;
  dayOfWeek: number; // 0=Пн, 6=Вс
  startHour: number; // 9
  endHour: number;   // 18
}

// ==================== ЗАПРОСЫ НА ТРЕНИРОВКУ ====================

export interface TrainingRequest {
  id: string;
  clientId: string;
  clientName: string;
  trainerId: string;
  trainerName: string;
  requestedDateTime: Timestamp;
  durationMinutes: number;
  status: "pending" | "approved" | "rejected";
  message?: string;
  createdAt: Timestamp;
}

// ==================== МЕССЕНДЖЕР ====================

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Timestamp;
  read: boolean;
}

export interface Chat {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  workoutId?: string; // привязка к тренировке
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
  source: string; // "subscription" | "individual_training" | "other"
  amount: number;
  description: string;
  date: Timestamp;
  userId?: string;
}
