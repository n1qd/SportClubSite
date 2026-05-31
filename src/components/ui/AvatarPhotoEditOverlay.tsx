type Props = {
  uploading?: boolean;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  title?: string;
};

export function AvatarPhotoEditOverlay({ uploading, disabled, onChange, title }: Props) {
  return (
    <label
      className="absolute -bottom-1 -right-1 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-hsc-panel text-xs leading-none text-white cursor-pointer shadow-sm hover:bg-emerald-800 transition-colors has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed"
      title={title}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || uploading}
        onChange={onChange}
      />
      <span aria-hidden>{uploading ? "…" : "📷"}</span>
    </label>
  );
}
