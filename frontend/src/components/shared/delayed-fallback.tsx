"use client";
import { useEffect, useState } from "react";

/** Reveals a fallback only after `ms`.
    Route changes that resolve faster than that render straight through, so
    the skeleton never flashes for work the user barely notices. */
export function DelayedFallback({ ms = 180, children }: { ms?: number; children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return shown ? <>{children}</> : null;
}