import { useEffect, useState, useRef } from "react";
import type { GetServerSideProps } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getChatsForUser,
  getChatMessages,
  sendChatMessage,
  subscribeChatMessages,
  getCurrentUser,
  getTrainerByUserId,
} from "@/lib/db";
import type { Chat, ChatMessage } from "@/lib/models";
import { Avatar } from "@/components/ui/Avatar";
import { useTranslation } from "@/contexts/LanguageContext";

type Props = AuthedPageProps;

function formatTime(ts: any, locale: string): string {
  if (!ts) return "";
  const date = "toDate" in ts ? ts.toDate() : new Date();
  return date.toLocaleString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(ts: any, locale: string): string {
  if (!ts) return "";
  const date = "toDate" in ts ? ts.toDate() : new Date();
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatLastMessageTime(ts: any, locale: string): string {
  if (!ts) return "";
  const date = "toDate" in ts ? ts.toDate() : new Date();
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
}

function getOtherId(chat: Chat, myUid: string): string | null {
  const other = (chat.participantIds ?? []).find((id) => id !== myUid);
  return other ?? null;
}

function getOtherName(chat: Chat, myUid: string, fallback: string): string {
  if (!chat.participantNames) return fallback;
  for (const [uid, name] of Object.entries(chat.participantNames)) {
    if (uid !== myUid) return name;
  }
  return fallback;
}

function isDifferentDay(ts1: any, ts2: any): boolean {
  if (!ts1 || !ts2) return true;
  const d1 = "toDate" in ts1 ? ts1.toDate() : new Date();
  const d2 = "toDate" in ts2 ? ts2.toDate() : new Date();
  return (
    d1.getDate() !== d2.getDate() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getFullYear() !== d2.getFullYear()
  );
}

export default function MessagesPage({ user }: Props) {
  const { t, language } = useTranslation();
  const locale = language === "en" ? "en-US" : "ru-RU";

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [otherPhotos, setOtherPhotos] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingChats(true);
      try {
        const chatList = await getChatsForUser(user.uid);
        if (cancelled) return;
        const sorted = chatList.sort((a, b) => {
          const ta = a.lastMessageAt?.toMillis?.() ?? 0;
          const tb = b.lastMessageAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setChats(sorted);
        const photos: Record<string, string> = {};
        await Promise.all(
          sorted.map(async (chat) => {
            const otherId = getOtherId(chat, user.uid);
            if (!otherId) return;
            const trainer = await getTrainerByUserId(otherId);
            if (cancelled) return;
            let url = trainer?.photoUrl;
            if (!url) {
              try {
                const otherUser = await getCurrentUser(otherId);
                if (!cancelled) url = otherUser?.photoUrl;
              } catch {
                /* ignore */
              }
            }
            if (url) photos[chat.id] = url;
          })
        );
        if (!cancelled) setOtherPhotos((prev) => ({ ...prev, ...photos }));
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? t("client.messages.loadFailed"));
      } finally {
        if (!cancelled) setLoadingChats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid, t]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setError(null);

    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const initial = await getChatMessages(selectedChatId);
        setMessages(initial);
        setLoadingMessages(false);

        unsubscribe = subscribeChatMessages(selectedChatId, (msgs) => {
          setMessages(msgs);
        });
      } catch {
        setLoadingMessages(false);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!inputText.trim() || !selectedChatId || sending) return;

    const text = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const selectedChat = chats.find((c) => c.id === selectedChatId);
      const senderName = selectedChat?.participantNames?.[user.uid] ?? user.email ?? t("client.messages.peer");

      await sendChatMessage(selectedChatId, user.uid, senderName, text);

      const updatedChats = await getChatsForUser(user.uid);
      setChats(
        updatedChats.sort((a, b) => {
          const ta = a.lastMessageAt?.toMillis?.() ?? 0;
          const tb = b.lastMessageAt?.toMillis?.() ?? 0;
          return tb - ta;
        })
      );
    } catch (e: any) {
      setError(e?.message ?? t("client.messages.loadFailed"));
      setInputText(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function selectChat(chatId: string) {
    setSelectedChatId(chatId);
    setMobileShowChat(true);
    setInputText("");
  }

  function goBackToList() {
    setMobileShowChat(false);
    setSelectedChatId(null);
  }

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  return (
    <ClientLayout title={t("client.messages.title")}>
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        <Card className="space-y-1">
          <h2 className="text-sm font-semibold text-hsc-panel">{t("client.messages.title")}</h2>
          <p className="text-xs text-slate-700">
            {t("client.messages.intro")}
          </p>
        </Card>

        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {loadingChats ? (
          <Card className="text-xs text-slate-700">{t("client.messages.loading")}</Card>
        ) : chats.length === 0 ? (
          <Card className="text-center space-y-2">
            <div className="text-3xl">💬</div>
            <p className="text-xs text-slate-700">
              {t("client.messages.empty")}
            </p>
            <Button size="sm" variant="secondary" href="/client/booking">
              {t("client.messages.bookCta")}
            </Button>
          </Card>
        ) : (
          <div className="flex flex-1 min-h-0 gap-3">
            <div
              className={`w-full md:w-1/3 flex-shrink-0 ${
                mobileShowChat ? "hidden md:block" : "block"
              }`}
            >
              <Card className="h-full flex min-h-0 flex-col space-y-1 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 px-1">
                  {t("client.messages.chats")} ({chats.length})
                </p>
                <div className="flex-1 space-y-0.5 overflow-y-auto">
                  {chats.map((chat) => {
                    const otherName = getOtherName(chat, user.uid, t("client.messages.peer"));
                    const isActive = chat.id === selectedChatId;
                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => selectChat(chat.id)}
                        className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                          isActive
                            ? "bg-hsc-panel text-white"
                            : "bg-white hover:bg-emerald-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            photoUrl={otherPhotos[chat.id]}
                            name={otherName}
                            size="md"
                            className={isActive ? "ring-2 ring-white/50" : ""}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs font-semibold truncate ${
                                  isActive ? "text-white" : "text-hsc-panel"
                                }`}
                              >
                                {otherName}
                              </span>
                              {chat.lastMessageAt && (
                                <span
                                  className={`flex-shrink-0 text-[10px] ${
                                    isActive ? "text-emerald-100" : "text-slate-400"
                                  }`}
                                >
                                  {formatLastMessageTime(chat.lastMessageAt, locale)}
                                </span>
                              )}
                            </div>
                            {chat.lastMessage && (
                              <p
                                className={`truncate text-[11px] mt-0.5 ${
                                  isActive ? "text-emerald-100" : "text-slate-500"
                                }`}
                              >
                                {chat.lastMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div
              className={`flex-1 min-w-0 ${
                !mobileShowChat ? "hidden md:flex" : "flex"
              } flex-col`}
            >
              {!selectedChatId ? (
                <Card className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="text-3xl">👈</div>
                    <p className="text-xs text-slate-500">
                      {t("client.messages.selectChat")}
                    </p>
                  </div>
                </Card>
              ) : (
                <Card className="flex-1 flex flex-col p-0 overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-emerald-900/10 px-4 py-3">
                    <button
                      onClick={goBackToList}
                      className="md:hidden rounded-lg p-1 text-slate-500 hover:bg-emerald-50 hover:text-hsc-panel transition-colors"
                    >
                      ←
                    </button>
                    <Avatar
                      photoUrl={selectedChat ? otherPhotos[selectedChat.id] : undefined}
                      name={selectedChat ? getOtherName(selectedChat, user.uid, t("client.messages.peer")) : undefined}
                      size="sm"
                    />
                    <div>
                      <div className="text-sm font-semibold text-hsc-panel">
                        {selectedChat
                          ? getOtherName(selectedChat, user.uid, t("client.messages.peer"))
                          : t("client.messages.peer")}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {t("client.messages.individual")}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-slate-500">
                          {t("client.messages.loadingMsgs")}
                        </p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-slate-500">
                          {t("client.messages.startChat")}
                        </p>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg, idx) => {
                          const isOwn = msg.senderId === user.uid;
                          const showDateSep =
                            idx === 0 ||
                            isDifferentDay(
                              messages[idx - 1]?.timestamp,
                              msg.timestamp
                            );

                          return (
                            <div key={msg.id}>
                              {showDateSep && (
                                <div className="flex justify-center my-2">
                                  <span className="rounded-full bg-slate-100 px-3 py-0.5 text-[10px] text-slate-500">
                                    {formatDate(msg.timestamp, locale)}
                                  </span>
                                </div>
                              )}
                              <div
                                className={`flex ${
                                  isOwn ? "justify-end" : "justify-start"
                                } mb-1`}
                              >
                                <div
                                  className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                                    isOwn
                                      ? "bg-emerald-600 text-white rounded-br-md"
                                      : "bg-white border border-emerald-900/10 text-slate-800 rounded-bl-md"
                                  }`}
                                >
                                  {!isOwn && (
                                    <div className="text-[10px] font-semibold text-emerald-700 mb-0.5">
                                      {msg.senderName}
                                    </div>
                                  )}
                                  <p className="text-xs whitespace-pre-wrap break-words">
                                    {msg.text}
                                  </p>
                                  <div
                                    className={`text-[9px] mt-1 text-right ${
                                      isOwn ? "text-emerald-200" : "text-slate-400"
                                    }`}
                                  >
                                    {formatTime(msg.timestamp, locale)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  <div className="border-t border-emerald-900/10 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          ref={inputRef}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={t("client.messages.placeholder")}
                          disabled={sending}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={!inputText.trim() || sending}
                        onClick={handleSend}
                        className="flex-shrink-0"
                      >
                        {sending ? t("client.messages.sending") : t("client.messages.send")}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "trainer", "admin", "manager"]);
