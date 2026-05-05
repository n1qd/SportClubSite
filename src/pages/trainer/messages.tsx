import { useEffect, useState, useRef } from "react";
import type { GetServerSideProps } from "next";
import { TrainerLayout } from "@/components/layout/TrainerLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { requireAuth, type AuthedPageProps } from "@/lib/ssr-auth";
import { getChatsForUser, getUsersByIds, getCurrentUser, sendChatMessage, subscribeChatMessages } from "@/lib/db";
import type { Chat, ChatMessage } from "@/lib/models";

type Props = AuthedPageProps;

function formatTime(ts: any) {
  if (!ts) return "";
  const d = "toDate" in ts ? ts.toDate() : new Date();
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function TrainerMessages({ user }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participantPhotoUrls, setParticipantPhotoUrls] = useState<Record<string, string>>({});
  const [currentUserPhotoUrl, setCurrentUserPhotoUrl] = useState<string | undefined>(undefined);
  const messagesEnd = useRef<HTMLDivElement>(null);

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
    if (!activeChat) return;
    const unsub = subscribeChatMessages(activeChat, (msgs) => {
      setMessages(msgs);
      setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    return () => unsub();
  }, [activeChat]);

  async function handleSend() {
    if (!text.trim() || !activeChat) return;
    setSending(true);
    try {
      const name = user.email?.split("@")[0] ?? "Тренер";
      await sendChatMessage(activeChat, user.uid, name, text.trim());
      setText("");
    } catch {}
    setSending(false);
  }

  function getOtherName(chat: Chat): string {
    const otherId = chat.participantIds.find((id) => id !== user.uid);
    return otherId ? (chat.participantNames?.[otherId] ?? "Клиент") : "Клиент";
  }

  return (
    <TrainerLayout title="Сообщения">
      <div className="flex h-[calc(100vh-220px)] min-h-[400px] gap-3">
        {/* Список чатов */}
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
                  onClick={() => setActiveChat(c.id)}
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

        {/* Область сообщений */}
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
              <div className="flex-1 space-y-2 overflow-y-auto py-2">
                {messages.map((m) => {
                  const isMine = m.senderId === user.uid;
                  const photoUrl = isMine ? currentUserPhotoUrl : participantPhotoUrls[m.senderId];
                  const displayName = isMine ? (user.email?.split("@")[0] ?? "Вы") : m.senderName;
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                      {!isMine && <Avatar photoUrl={photoUrl} name={m.senderName} size="sm" className="shrink-0" />}
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${
                        isMine ? "bg-emerald-600 text-white" : "bg-white text-slate-800 border border-slate-200"
                      }`}>
                        {!isMine && <div className="mb-0.5 text-[10px] font-semibold text-slate-500">{m.senderName}</div>}
                        <div>{m.text}</div>
                        <div className={`mt-1 text-[9px] ${isMine ? "text-emerald-100" : "text-slate-400"}`}>{formatTime(m.timestamp)}</div>
                      </div>
                      {isMine && <Avatar photoUrl={photoUrl} name={displayName} size="sm" className="shrink-0" />}
                    </div>
                  );
                })}
                <div ref={messagesEnd} />
              </div>
              <div className="flex gap-2 border-t border-emerald-900/10 pt-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Сообщение..."
                  rows={2}
                  className="min-h-[56px] max-h-[160px] w-full resize-y rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} className="self-end shrink-0">
                  {sending ? "..." : "Отправить"}
                </Button>
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
