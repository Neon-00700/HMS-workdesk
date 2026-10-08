"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/models";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (u: User | null) => void;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  hasAny: (perms: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      setUser: (u) => set({ user: u, isAuthenticated: !!u }),
      logout: () => set({ user: null, isAuthenticated: false }),
      hasPermission: (perm) => !!get().user?.permissions.includes(perm),
      hasAny: (perms) => perms.some((p) => get().user?.permissions.includes(p)),
    }),
    { name: "hamyaran_auth_v2" },
  ),
);
