import { HTMLAttributes } from "react";
import clsx from "clsx";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "surface" | "panel";
}

export function Card({ variant = "surface", className, ...props }: CardProps) {
  const base =
    variant === "panel"
      ? "panel-main"
      : "card-surface";

  return <div className={clsx(base, "p-5", className)} {...props} />;
}

