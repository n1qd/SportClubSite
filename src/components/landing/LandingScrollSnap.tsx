"use client";

import { useEffect, type ReactNode } from "react";

const CLASS = "landing-snap-page";

export function LandingScrollSnap({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add(CLASS);
    return () => document.documentElement.classList.remove(CLASS);
  }, []);
  return <>{children}</>;
}
