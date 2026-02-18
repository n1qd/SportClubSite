import { useMemo, useState, useEffect } from "react";
import clsx from "clsx";

export interface AvatarProps {
  photoUrl?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

// У data URL после запятой — только base64; ?t= в конце ломает отображение — обрезаем
function normalizeDataUrl(url: string): string {
  if (!url.startsWith("data:") || !url.includes("?")) return url;
  return url.split("?")[0];
}

export function Avatar({ photoUrl, name, size = "md", className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);
  const initials = useMemo(() => getInitials(name), [name]);
  const sizeCls = sizeClasses[size];
  const src = photoUrl ? normalizeDataUrl(photoUrl) : "";
  const showImage = src && src.trim() !== "" && !imgError;

  if (showImage) {
    return (
      <img
        src={src}
        alt={name ?? "Avatar"}
        className={clsx("rounded-full object-cover shrink-0", sizeCls, className)}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "rounded-full bg-emerald-100 text-hsc-panel font-bold inline-flex items-center justify-center shrink-0",
        sizeCls,
        className
      )}
    >
      {initials}
    </div>
  );
}
