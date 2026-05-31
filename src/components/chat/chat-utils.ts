import type { ChatMessage } from "@/lib/models";
import type { Timestamp } from "firebase/firestore";

export const CHAT_EDIT_WINDOW_MS = 12 * 60 * 60 * 1000;

/** CSS zoom на html (см. globals.css) ломает совпадение clientX/Y и position:fixed. */
export function getDocumentZoom(): number {
  if (typeof window === "undefined") return 1;
  const raw = getComputedStyle(document.documentElement).zoom;
  if (raw && raw !== "normal") {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 1;
}

/** Координаты курсора → left/top для position:fixed с учётом zoom страницы. */
export function pointerToFixedPosition(clientX: number, clientY: number): { x: number; y: number } {
  const zoom = getDocumentZoom();
  return { x: clientX / zoom, y: clientY / zoom };
}

export function canEditChatMessage(message: ChatMessage, myUid: string): boolean {
  if (message.senderId !== myUid) return false;
  if (!message.text.trim()) return false;
  return Date.now() - message.timestamp.toMillis() <= CHAT_EDIT_WINDOW_MS;
}

export function formatChatTime(ts: Timestamp | undefined, locale: string): string {
  if (!ts) return "";
  const date = "toDate" in ts ? ts.toDate() : new Date();
  return date.toLocaleString(locale, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function isDifferentChatDay(ts1: Timestamp | undefined, ts2: Timestamp | undefined): boolean {
  if (!ts1 || !ts2) return true;
  const d1 = "toDate" in ts1 ? ts1.toDate() : new Date();
  const d2 = "toDate" in ts2 ? ts2.toDate() : new Date();
  return (
    d1.getDate() !== d2.getDate() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getFullYear() !== d2.getFullYear()
  );
}

export function formatChatDate(ts: Timestamp | undefined, locale: string): string {
  if (!ts) return "";
  const date = "toDate" in ts ? ts.toDate() : new Date();
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
