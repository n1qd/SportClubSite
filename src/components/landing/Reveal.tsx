"use client";

import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export type RevealVariant =
  | "fade-up"
  | "fade-down"
  | "slide-left"
  | "slide-right"
  | "zoom"
  | "scale-blur"
  | "tilt-up"
  | "pop";

type Props = {
  variant?: RevealVariant;
  /** Секция с заголовком + каскадом карточек без общего «провала» по opacity */
  staggerRoot?: boolean;
  className?: string;
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
} & HTMLAttributes<HTMLDivElement>;

const variantClass: Record<RevealVariant, string> = {
  "fade-up": "sr-base sr-v-up",
  "fade-down": "sr-base sr-v-down",
  "slide-left": "sr-base sr-h-left",
  "slide-right": "sr-base sr-h-right",
  zoom: "sr-base sr-zoom",
  "scale-blur": "sr-base sr-blur",
  "tilt-up": "sr-base sr-tilt",
  pop: "sr-base sr-pop",
};

export function Reveal({
  variant = "fade-up",
  staggerRoot = false,
  className,
  children,
  threshold,
  rootMargin,
  once = true,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setVisible(true);
        return;
      }
    } catch {
      /* ignore */
    }

    const mq =
      typeof window !== "undefined"
        ? window.matchMedia("(max-width: 639px)")
        : null;
    const isNarrow = mq?.matches ?? false;
    const th = threshold ?? (isNarrow ? 0.05 : 0.11);
    const margin =
      rootMargin ?? (isNarrow ? "0px 0px 4% 0px" : "0px 0px -8% 0px");

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        if (once) io.unobserve(el);
      },
      { threshold: th, rootMargin: margin }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold, rootMargin]);

  return (
    <div
      ref={ref}
      className={clsx(
        staggerRoot ? "sr-stagger-root" : variantClass[variant],
        visible && "sr-in",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function RevealStagger({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={clsx("sr-stagger", className)}>{children}</div>;
}
