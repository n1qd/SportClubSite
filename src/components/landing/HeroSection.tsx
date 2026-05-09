"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";

type Parallax = { x: number; y: number };

type Props = {
  className?: string;
  children: (offset: Parallax) => ReactNode;
};

export function HeroSection({ className, children }: Props) {
  const [offset, setOffset] = useState<Parallax>({ x: 0, y: 0 });
  const reduceMotion = useRef(false);

  useEffect(() => {
    try {
      reduceMotion.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    } catch {
      reduceMotion.current = false;
    }
  }, []);

  const onMove = useCallback((e: MouseEvent<HTMLElement>) => {
    if (reduceMotion.current) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setOffset({ x: nx * 32, y: ny * 26 });
  }, []);

  const onLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  return (
    <section
      className={clsx(className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children(offset)}
    </section>
  );
}
