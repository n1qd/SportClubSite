import { useEffect, useState } from "react";
import { useChatScrollToBottom } from "@/components/chat/useChatScrollToBottom";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getChatsForUser,
  getChatMessages,
  sendChatMessage,
  subscribeChatMessages,
  getCurrentUser,
  getTrainerByUserId,
  updateChatMessage,
  deleteChatMessage,
} from "@/lib/db";
import type { Chat, ChatMessage } from "@/lib/models";
import { Avatar } from "@/components/ui/Avatar";
import { useTranslation } from "@/contexts/LanguageContext";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { formatChatDate, isDifferentChatDay } from "@/components/chat/chat-utils";

type Props = AuthedPageProps;

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
  return isDifferentChatDay(ts1, ts2);
}

export default function MessagesPage({ user }: Props) {
  const router = useRouter();
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
  const [otherDisplayNames, setOtherDisplayNames] = useState<Record<string, string>>({});

  const { containerRef: messagesContainerRef, scrollToBottom } = useChatScrollToBottom(
    selectedChatId,
    loadingMessages
  );

  const messageLabels = {
    copy: t("client.messages.copy"),
    edit: t("client.messages.edit"),
    delete: t("client.messages.delete"),
    deleteConfirm: t("client.messages.deleteConfirm"),
    save: t("client.messages.save"),
    cancel: t("client.messages.cancel"),
    edited: t("client.messages.edited"),
    copied: t("client.messages.copied"),
    editExpired: t("client.messages.editExpired"),
    openPhoto: t("client.messages.openPhoto"),
  };

  const composerLabels = {
    placeholder: t("client.messages.placeholder"),
    send: t("client.messages.send"),
    sending: t("client.messages.sending"),
    attachPhoto: t("client.messages.attachPhoto"),
    removePhoto: t("client.messages.removePhoto"),
    photoFailed: t("client.messages.photoFailed"),
  };

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
        const names: Record<string, string> = {};
        await Promise.all(
          sorted.map(async (chat) => {
            const otherId = getOtherId(chat, user.uid);
            if (!otherId) return;
            const trainer = await getTrainerByUserId(otherId);
            if (cancelled) return;
            let url = trainer?.photoUrl;
            let display =
              trainer &&
              [trainer.lastName, trainer.firstName, trainer.middleName].filter(Boolean).join(" ").trim();
            if (!display) {
              try {
                const otherUser = await getCurrentUser(otherId);
                if (!cancelled) {
                  if (!url) url = otherUser?.photoUrl;
                  display =
                    otherUser &&
                    [otherUser.lastName, otherUser.firstName, otherUser.middleName].filter(Boolean).join(" ").trim();
                }
              } catch {
                /* ignore */
              }
            }
            if (url) photos[chat.id] = url;
            if (display) names[chat.id] = display;
          })
        );
        if (!cancelled) {
          setOtherPhotos((prev) => ({ ...prev, ...photos }));
          setOtherDisplayNames((prev) => ({ ...prev, ...names }));
        }
      } catch (e: any) {
        if (!cancelled) setError(toUserFacingMessage(e, language));
      } finally {
        if (!cancelled) setLoadingChats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.uid, t, language]);

  useEffect(() => {
    const chatParam = router.query.chat;
    if (typeof chatParam !== "string" || !chatParam) return;
    if (loadingChats) return;
    setSelectedChatId(chatParam);
    setMobileShowChat(true);
    setLoadingMessages(true);
  }, [router.query.chat, loadingChats]);

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

  async function handleSend(payload: { text: string; imageUrl?: string }) {
    if ((!payload.text.trim() && !payload.imageUrl) || !selectedChatId || sending) return;

    setSending(true);
    setInputText("");

    try {
      const selectedChat = chats.find((c) => c.id === selectedChatId);
      const senderName = selectedChat?.participantNames?.[user.uid] ?? user.email ?? t("client.messages.peer");

      await sendChatMessage(selectedChatId, user.uid, senderName, payload.text, payload.imageUrl);
      scrollToBottom();

      const updatedChats = await getChatsForUser(user.uid);
      setChats(
        updatedChats.sort((a, b) => {
          const ta = a.lastMessageAt?.toMillis?.() ?? 0;
          const tb = b.lastMessageAt?.toMillis?.() ?? 0;
          return tb - ta;
        })
      );
    } catch (e: any) {
      setError(toUserFacingMessage(e, language));
      setInputText(payload.text);
      throw e;
    } finally {
      setSending(false);
    }
  }

  async function handleEditMessage(messageId: string, newText: string) {
    try {
      await updateChatMessage(messageId, newText);
    } catch (e: any) {
      setError(toUserFacingMessage(e, language));
      throw e;
    }
  }

  async function handleDeleteMessage(messageId: string) {
    try {
      await deleteChatMessage(messageId);
      const updatedChats = await getChatsForUser(user.uid);
      setChats(
        updatedChats.sort((a, b) => {
          const ta = a.lastMessageAt?.toMillis?.() ?? 0;
          const tb = b.lastMessageAt?.toMillis?.() ?? 0;
          return tb - ta;
        })
      );
    } catch (e: any) {
      setError(toUserFacingMessage(e, language));
      throw e;
    }
  }

  function selectChat(chatId: string) {
    setSelectedChatId(chatId);
    setMobileShowChat(true);
    setInputText("");
    setLoadingMessages(true);
  }

  function goBackToList() {
    setMobileShowChat(false);
    setSelectedChatId(null);
  }

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  function peerLabel(chat: Chat): string {
    return (
      otherDisplayNames[chat.id] ||
      getOtherName(chat, user.uid, t("client.messages.peer"))
    );
  }

  return (
    <ClientLayout title={t("client.messages.title")}>
      <div className="flex flex-col gap-3 overflow-hidden">
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
          <div className="flex h-[calc(100vh-280px)] min-h-[400px] gap-3">
            <Card
              className={`w-full space-y-1 overflow-y-auto sm:w-64 sm:flex-shrink-0 ${
                mobileShowChat ? "hidden sm:block" : ""
              }`}
            >
              <h3 className="text-xs font-semibold text-hsc-panel">
                {t("client.messages.chats")} ({chats.length})
              </h3>
              {chats.map((chat) => {
                const otherName = peerLabel(chat);
                const isActive = chat.id === selectedChatId;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => selectChat(chat.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                      isActive
                        ? "bg-hsc-panel text-white"
                        : "bg-white text-slate-700 hover:bg-emerald-50"
                    }`}
                  >
                    <Avatar photoUrl={otherPhotos[chat.id]} name={otherName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{otherName}</div>
                      {chat.lastMessage && (
                        <div
                          className={`mt-0.5 truncate text-[10px] ${
                            isActive ? "text-emerald-100" : "text-slate-400"
                          }`}
                        >
                          {chat.lastMessage}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </Card>

            <Card
              className={`flex flex-1 flex-col ${
                !mobileShowChat ? "hidden sm:flex" : "flex"
              }`}
            >
              {!selectedChatId ? (
                <div className="flex flex-1 items-center justify-center text-xs text-slate-500">
                  {t("client.messages.selectChat")}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 border-b border-emerald-900/10 pb-2">
                    <button
                      type="button"
                      onClick={goBackToList}
                      className="text-xs text-hsc-panel sm:hidden"
                    >
                      ← {t("client.messages.chats")}
                    </button>
                    <Avatar
                      photoUrl={selectedChat ? otherPhotos[selectedChat.id] : undefined}
                      name={selectedChat ? peerLabel(selectedChat) : undefined}
                      size="sm"
                    />
                    <span className="truncate text-sm font-semibold text-hsc-panel">
                      {selectedChat ? peerLabel(selectedChat) : t("client.messages.peer")}
                    </span>
                  </div>

                  <div ref={messagesContainerRef} className="flex-1 space-y-2 overflow-y-auto py-2">
                    {loadingMessages ? (
                      <p className="text-center text-xs text-slate-500">
                        {t("client.messages.loadingMsgs")}
                      </p>
                    ) : messages.length === 0 ? (
                      <p className="text-center text-xs text-slate-500">
                        {t("client.messages.startChat")}
                      </p>
                    ) : (
                      messages.map((msg, idx) => {
                        const isOwn = msg.senderId === user.uid;
                        const showDateSep =
                          idx === 0 ||
                          isDifferentDay(messages[idx - 1]?.timestamp, msg.timestamp);

                        return (
                          <div key={msg.id}>
                            {showDateSep && (
                              <div className="my-2 flex justify-center">
                                <span className="rounded-full bg-slate-100 px-3 py-0.5 text-[10px] text-slate-500">
                                  {formatChatDate(msg.timestamp, locale)}
                                </span>
                              </div>
                            )}
                            <div className={`mb-1 flex ${isOwn ? "justify-end" : "justify-start"}`}>
                              <ChatMessageBubble
                                message={msg}
                                isOwn={isOwn}
                                myUid={user.uid}
                                locale={locale}
                                labels={messageLabels}
                                showSenderName={!isOwn}
                                onEdit={handleEditMessage}
                                onDelete={handleDeleteMessage}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-emerald-900/10 pt-2">
                    <ChatComposer
                      value={inputText}
                      onChange={setInputText}
                      onSend={handleSend}
                      sending={sending}
                      labels={composerLabels}
                      useTextarea
                    />
                  </div>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["user", "trainer", "admin", "manager"]);
