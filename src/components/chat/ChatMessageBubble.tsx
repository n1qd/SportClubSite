import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChatMessage } from "@/lib/models";
import { normalizeDataUrl, Avatar } from "@/components/ui/Avatar";
import { canEditChatMessage, formatChatTime, pointerToFixedPosition } from "@/components/chat/chat-utils";

export type ChatMessageLabels = {
  copy: string;
  edit: string;
  delete: string;
  deleteConfirm: string;
  save: string;
  cancel: string;
  edited: string;
  copied: string;
  editExpired: string;
  openPhoto: string;
};

type Props = {
  message: ChatMessage;
  isOwn: boolean;
  myUid: string;
  locale: string;
  labels: ChatMessageLabels;
  showSenderName?: boolean;
  onEdit: (messageId: string, newText: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  bubbleClassName?: string;
};

export function ChatMessageBubble({
  message,
  isOwn,
  myUid,
  locale,
  labels,
  showSenderName = false,
  onEdit,
  onDelete,
  bubbleClassName = ""
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [busy, setBusy] = useState(false);
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canEdit = canEditChatMessage(message, myUid);
  const imageSrc = message.imageUrl ? normalizeDataUrl(message.imageUrl) : "";
  const hasMenuActions = Boolean(message.text.trim()) || isOwn;

  function closeMenu() {
    setMenuOpen(false);
  }

  function openMenuAt(x: number, y: number) {
    setMenuPos({ x, y });
    setMenuOpen(true);
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (editing || !hasMenuActions) return;
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = pointerToFixedPosition(e.clientX, e.clientY);
    openMenuAt(x, y);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    function onScroll() {
      closeMenu();
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!editing) setEditText(message.text);
  }, [message.text, editing]);

  async function handleCopy() {
    const text = message.text.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFlash(true);
      setTimeout(() => setCopiedFlash(false), 1500);
    } catch {
      /* ignore */
    }
    setMenuOpen(false);
  }

  async function handleSaveEdit() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.text.trim()) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onEdit(message.id, trimmed);
      setEditing(false);
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(labels.deleteConfirm)) return;
    setBusy(true);
    try {
      await onDelete(message.id);
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  const baseBubble =
    isOwn
      ? "bg-emerald-600 text-white rounded-br-md"
      : "bg-white border border-emerald-900/10 text-slate-800 rounded-bl-md";

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        className={`group relative max-w-[75%] rounded-2xl px-3 py-2 ${baseBubble} ${bubbleClassName} ${
          hasMenuActions && !editing ? "cursor-context-menu" : ""
        }`}
      >
        {showSenderName && !isOwn && (
          <div className="text-[10px] font-semibold text-emerald-700 mb-0.5">{message.senderName}</div>
        )}

        {imageSrc && (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            onContextMenu={handleContextMenu}
            className="mb-1 block overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            title={labels.openPhoto}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt=""
              className="max-h-52 max-w-full object-cover"
            />
          </button>
        )}

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              className={`w-full resize-y rounded-lg border px-2 py-1 text-xs outline-none focus:ring-2 ${
                isOwn
                  ? "border-emerald-400/40 bg-emerald-700 text-white placeholder:text-emerald-200 focus:ring-white/30"
                  : "border-slate-200 bg-white text-slate-800 focus:ring-emerald-500/30"
              }`}
              disabled={busy}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={busy || !editText.trim()}
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  isOwn ? "bg-white/20 hover:bg-white/30" : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {labels.save}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditText(message.text);
                }}
                disabled={busy}
                className={`rounded-md px-2 py-0.5 text-[10px] ${
                  isOwn ? "text-emerald-100 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {labels.cancel}
              </button>
            </div>
          </div>
        ) : (
          message.text.trim() && (
            <p className="text-xs whitespace-pre-wrap break-words">{message.text}</p>
          )
        )}

        <div className={`flex items-center justify-end gap-1.5 mt-1 ${isOwn ? "text-emerald-200" : "text-slate-400"}`}>
          {message.editedAt && (
            <span className="text-[9px] italic opacity-80">{labels.edited}</span>
          )}
          {copiedFlash && (
            <span className="text-[9px] text-emerald-100">{labels.copied}</span>
          )}
          <span className="text-[9px]">{formatChatTime(message.timestamp, locale)}</span>
        </div>
      </div>

      {menuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: menuPos.x,
              top: menuPos.y,
              zIndex: 9999,
              margin: 0,
              transform: "none"
            }}
            className={`min-w-[120px] rounded-lg border py-1 shadow-lg ${
              isOwn
                ? "border-emerald-500/30 bg-emerald-700 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
            onContextMenu={(e) => e.preventDefault()}
          >
            {message.text.trim() && (
              <button
                type="button"
                onClick={handleCopy}
                className={`block w-full px-3 py-1.5 text-left text-[11px] ${
                  isOwn ? "hover:bg-white/10" : "hover:bg-emerald-50"
                }`}
              >
                {labels.copy}
              </button>
            )}
            {isOwn && canEdit && !editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  closeMenu();
                }}
                className={`block w-full px-3 py-1.5 text-left text-[11px] ${
                  isOwn ? "hover:bg-white/10" : "hover:bg-emerald-50"
                }`}
              >
                {labels.edit}
              </button>
            )}
            {isOwn && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className={`block w-full px-3 py-1.5 text-left text-[11px] ${
                  isOwn ? "text-red-200 hover:bg-white/10" : "text-red-600 hover:bg-red-50"
                }`}
              >
                {labels.delete}
              </button>
            )}
          </div>,
          document.body
        )}

      {lightbox && imageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(false)}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

type RowProps = Props & {
  avatarPhotoUrl?: string;
  avatarName?: string;
  withAvatar?: boolean;
};

export function ChatMessageRow({
  avatarPhotoUrl,
  avatarName,
  withAvatar = false,
  ...bubbleProps
}: RowProps) {
  const { isOwn } = bubbleProps;
  return (
    <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      {!isOwn && withAvatar && (
        <Avatar photoUrl={avatarPhotoUrl} name={avatarName} size="sm" className="shrink-0" />
      )}
      <ChatMessageBubble {...bubbleProps} />
      {isOwn && withAvatar && (
        <Avatar photoUrl={avatarPhotoUrl} name={avatarName} size="sm" className="shrink-0" />
      )}
    </div>
  );
}
