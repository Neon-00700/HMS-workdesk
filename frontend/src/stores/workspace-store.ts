"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceState {
  activeProjectId: string | null;
  recentProjectIds: string[];
  setActiveProject: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      activeProjectId: null,
      recentProjectIds: [],
      setActiveProject: (id) =>
        set({
          activeProjectId: id,
          recentProjectIds: [id, ...get().recentProjectIds.filter((x) => x !== id)].slice(0, 5),
        }),
    }),
    { name: "hamyaran_workspace_v2" },
  ),
);
