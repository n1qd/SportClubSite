import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fileToChatImageDataUrl } from "@/lib/storage";
import { normalizeDataUrl } from "@/components/ui/Avatar";

export type ChatComposerLabels = {
  placeholder: string;
  send: string;
  sending: string;
  attachPhoto: string;
  removePhoto: string;
  photoFailed: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: (payload: { text: string; imageUrl?: string }) => Promise<void>;
  disabled?: boolean;
  sending?: boolean;
  labels: ChatComposerLabels;
  useTextarea?: boolean;
};

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled = false,
  sending = false,
  labels,
  useTextarea = false
}: Props) {
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = !sending && !uploading && !disabled && (value.trim() || pendingImage);

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachError(null);
    setUploading(true);
    try {
      const dataUrl = await fileToChatImageDataUrl(file);
      setPendingImage(dataUrl);
    } catch (err: unknown) {
      setAttachError(err instanceof Error ? err.message : labels.photoFailed);
    } finally {
      setUploading(false);
    }
  }

  async function handleSend() {
    if (!canSend) return;
    const text = value.trim();
    const imageUrl = pendingImage ?? undefined;
    try {
      await onSend({ text, imageUrl });
      setPendingImage(null);
      setAttachError(null);
    } catch {
      /* parent handles error state */
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && !useTextarea) {
      e.preventDefault();
      handleSend();
    }
  }

  const previewSrc = pendingImage ? normalizeDataUrl(pendingImage) : "";

  return (
    <div className="space-y-2">
      {previewSrc && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="" className="h-20 w-20 rounded-lg object-cover border border-emerald-900/10" />
          <button
            type="button"
            onClick={() => setPendingImage(null)}
            className="absolute -right-1 -top-1 rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] text-white hover:bg-slate-800"
            title={labels.removePhoto}
          >
            ×
          </button>
        </div>
      )}
      {attachError && (
        <p className="text-[10px] text-red-600">{attachError}</p>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAttach}
          disabled={disabled || sending || uploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending || uploading}
          className="flex-shrink-0 rounded-xl border border-emerald-900/15 px-2.5 py-2 text-sm text-slate-600 hover:bg-emerald-50 disabled:opacity-50"
          title={labels.attachPhoto}
        >
          📷
        </button>
        <div className="flex-1 min-w-0">
          {useTextarea ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={labels.placeholder}
              disabled={disabled || sending || uploading}
              rows={2}
              className="min-h-[56px] max-h-[160px] w-full resize-y rounded-xl border border-emerald-900/20 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50"
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={labels.placeholder}
              disabled={disabled || sending || uploading}
            />
          )}
        </div>
        <Button
          size="sm"
          disabled={!canSend}
          onClick={handleSend}
          className="flex-shrink-0"
        >
          {sending || uploading ? labels.sending : labels.send}
        </Button>
      </div>
    </div>
  );
}
