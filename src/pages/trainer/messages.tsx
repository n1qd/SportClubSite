import { useEffect, useState } from "react";
import { useChatScrollToBottom } from "@/components/chat/useChatScrollToBottom";
import type { GetServerSideProps } from "next";
import { TrainerLayout } from "@/components/layout/TrainerLayout";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import {
  getChatsForUser,
  getUsersByIds,
  getCurrentUser,
  sendChatMessage,
  subscribeChatMessages,
  updateChatMessage,
  deleteChatMessage,
} from "@/lib/db";
import type { Chat, ChatMessage } from "@/lib/models";
import { ChatMessageRow } from "@/components/chat/ChatMessageBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";

type Props = AuthedPageProps;

const MESSAGE_LABELS = {
  copy: "Копировать",
  edit: "Редактировать",
  delete: "Удалить",
  deleteConfirm: "Удалить это сообщение?",
  save: "Сохранить",
  cancel: "Отмена",
  edited: "изм.",
  copied: "Скопировано",
  editExpired: "Редактирование недоступно (прошло 12 ч)",
  openPhoto: "Открыть фото",
};

const COMPOSER_LABELS = {
  placeholder: "Сообщение...",
  send: "Отправить",
  sending: "...",
  attachPhoto: "Прикрепить фото",
  removePhoto: "Убрать фото",
  photoFailed: "Не удалось обработать фото",
};

export default function TrainerMessages({ user }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participantPhotoUrls, setParticipantPhotoUrls] = useState<Record<string, string>>({});
  const [currentUserPhotoUrl, setCurrentUserPhotoUrl] = useState<string | undefined>(undefined);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const { containerRef: messagesContainerRef, scrollToBottom } = useChatScrollToBottom(
    activeChat,
    loadingMessages
  );

  useEffect(() => {
    getCurrentUser(user.uid).then((u) => u?.photoUrl && setCurrentUserPhotoUrl(u.photoUrl)).catch(() => {});
  }, [user.uid]);

  useEffect(() => {
    (async () => {
      try { setChats(await getChatsForUser(user.uid)); } catch {}
      setLoading(false);
    })();
  }, [user.uid]);

  useEffect(() => {
    if (chats.length === 0) return;
    const otherIds = chats.map((c) => c.participantIds.find((id) => id !== user.uid)).filter(Boolean) as string[];
    getUsersByIds(otherIds).then((users) => {
      const map: Record<string, string> = {};
      users.forEach((u) => { if (u.photoUrl) map[u.id] = u.photoUrl; });
      setParticipantPhotoUrls((prev) => ({ ...prev, ...map }));
    }).catch(() => {});
  }, [chats, user.uid]);

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    const unsub = subscribeChatMessages(activeChat, (msgs) => {
      setMessages(msgs);
      setLoadingMessages(false);
    });
    return () => unsub();
  }, [activeChat]);

  async function refreshChats() {
    try {
      setChats(await getChatsForUser(user.uid));
    } catch {}
  }

  async function handleSend(payload: { text: string; imageUrl?: string }) {
    if ((!payload.text.trim() && !payload.imageUrl) || !activeChat) return;
    setSending(true);
    setText("");
    try {
      const name = user.email?.split("@")[0] ?? "Тренер";
      await sendChatMessage(activeChat, user.uid, name, payload.text, payload.imageUrl);
      scrollToBottom();
      await refreshChats();
    } catch {
      setText(payload.text);
    }
    setSending(false);
  }

  async function handleEditMessage(messageId: string, newText: string) {
    await updateChatMessage(messageId, newText);
  }

  async function handleDeleteMessage(messageId: string) {
    await deleteChatMessage(messageId);
    await refreshChats();
  }

  function getOtherName(chat: Chat): string {
    const otherId = chat.participantIds.find((id) => id !== user.uid);
    return otherId ? (chat.participantNames?.[otherId] ?? "Клиент") : "Клиент";
  }

  return (
    <TrainerLayout title="Сообщения">
      <div className="flex h-[calc(100vh-220px)] min-h-[400px] gap-3">
        <Card className={`w-full space-y-1 overflow-y-auto sm:w-64 sm:flex-shrink-0 ${activeChat ? "hidden sm:block" : ""}`}>
          <h3 className="text-xs font-semibold text-hsc-panel">Чаты</h3>
          {loading ? <p className="text-xs text-slate-500">Загрузка...</p> : chats.length === 0 ? (
            <p className="text-xs text-slate-500">Нет чатов. Чаты появятся при записи клиента на тренировку.</p>
          ) : (
            chats.map((c) => {
              const otherId = c.participantIds.find((id) => id !== user.uid);
              const name = getOtherName(c);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveChat(c.id);
                    setLoadingMessages(true);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                    activeChat === c.id ? "bg-hsc-panel text-white" : "bg-white text-slate-700 hover:bg-emerald-50"
                  }`}
                >
                  <Avatar photoUrl={otherId ? participantPhotoUrls[otherId] : undefined} name={name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{name}</div>
                    {c.lastMessage && <div className={`mt-0.5 truncate text-[10px] ${activeChat === c.id ? "text-emerald-100" : "text-slate-400"}`}>{c.lastMessage}</div>}
                  </div>
                </button>
              );
            })
          )}
        </Card>

        <Card className={`flex flex-1 flex-col ${!activeChat ? "hidden sm:flex" : "flex"}`}>
          {!activeChat ? (
            <div className="flex flex-1 items-center justify-center text-xs text-slate-500">
              Выберите чат слева
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-emerald-900/10 pb-2">
                <button onClick={() => setActiveChat(null)} className="text-xs text-hsc-panel sm:hidden">← Назад</button>
                <span className="text-sm font-semibold text-hsc-panel">
                  {getOtherName(chats.find((c) => c.id === activeChat)!)}
                </span>
              </div>
              <div ref={messagesContainerRef} className="flex-1 space-y-2 overflow-y-auto py-2">
                {messages.map((m) => {
                  const isMine = m.senderId === user.uid;
                  const photoUrl = isMine ? currentUserPhotoUrl : participantPhotoUrls[m.senderId];
                  const displayName = isMine ? (user.email?.split("@")[0] ?? "Вы") : m.senderName;
                  return (
                    <ChatMessageRow
                      key={m.id}
                      message={m}
                      isOwn={isMine}
                      myUid={user.uid}
                      locale="ru-RU"
                      labels={MESSAGE_LABELS}
                      showSenderName={!isMine}
                      withAvatar
                      avatarPhotoUrl={photoUrl}
                      avatarName={displayName}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                      bubbleClassName={isMine ? "" : "border border-slate-200"}
                    />
                  );
                })}
              </div>
              <div className="border-t border-emerald-900/10 pt-2">
                <ChatComposer
                  value={text}
                  onChange={setText}
                  onSend={handleSend}
                  sending={sending}
                  labels={COMPOSER_LABELS}
                  useTextarea
                />
              </div>
            </>
          )}
        </Card>
      </div>
    </TrainerLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = (ctx) =>
  requireAuth(ctx, ["trainer", "admin"]);
