"use client";
import { useAuthStore } from "@/stores/auth-store";

/** Permission helpers for conditional UI (backend still enforces). */
export function usePermission() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAny = useAuthStore((s) => s.hasAny);
  const user = useAuthStore((s) => s.user);
  return { user, can: hasPermission, canAny: hasAny };
}

export function Can({ perm, anyOf, children, fallback = null }: {
  perm?: string;
  anyOf?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can, canAny } = usePermission();
  const ok = perm ? can(perm) : anyOf ? canAny(anyOf) : true;
  return ok ? <>{children}</> : <>{fallback}</>;
}
