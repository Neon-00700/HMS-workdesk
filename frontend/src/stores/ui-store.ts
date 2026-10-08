"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean; // desktop collapse
  mobileNavOpen: boolean;
  commandOpen: boolean;
  activeTaskId: string | null; // task sheet
  createTaskOpen: boolean;
  createTaskDefaults: Record<string, unknown>;
  toggleSidebar: () => void;
  setMobileNav: (v: boolean) => void;
  setCommand: (v: boolean) => void;
  openTask: (id: string | null) => void;
  openCreateTask: (defaults?: Record<string, unknown>) => void;
  closeCreateTask: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      mobileNavOpen: false,
      commandOpen: false,
      activeTaskId: null,
      createTaskOpen: false,
      createTaskDefaults: {},
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setMobileNav: (v) => set({ mobileNavOpen: v }),
      setCommand: (v) => set({ commandOpen: v }),
      openTask: (id) => set({ activeTaskId: id }),
      openCreateTask: (defaults = {}) => set({ createTaskOpen: true, createTaskDefaults: defaults }),
      closeCreateTask: () => set({ createTaskOpen: false, createTaskDefaults: {} }),
    }),
    { name: "hamyaran_ui", partialize: (s) => ({ sidebarOpen: s.sidebarOpen }) as UIState },
  ),
);
