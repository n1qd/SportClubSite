import Link from "next/link";
import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  href?: string;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-hsc-panel disabled:opacity-50 disabled:cursor-not-allowed";

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base"
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-hsc-panel text-white hover:bg-emerald-900 shadow-sm ring-offset-[color:var(--hsc-back)]",
  secondary:
    "bg-[color:var(--hsc-surface)] text-slate-900 hover:bg-emerald-100 ring-offset-[color:var(--hsc-back)]",
  ghost:
    "bg-transparent text-hsc-panel hover:bg-emerald-50 ring-offset-[color:var(--hsc-back)]"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", fullWidth, href, className, ...props }, ref) => {
    const classes = clsx(
      baseClasses,
      sizeClasses[size],
      variantClasses[variant],
      fullWidth && "w-full",
      className
    );

    if (href) {
      return (
        <Link href={href} className={classes}>
          {props.children}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

