"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/mock-db";

/**
 * Realtime subscription layer.
 * Production: connects SignalR hubs (chat / notifications / board) and
 * invalidates TanStack Query caches on server push.
 * Demo: subscribes to the local mock-db event bus.
 */
export function useRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const off = db.subscribe(() => {
      qc.invalidateQueries({ queryKey: ["chat"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    });
    // TODO(prod): const conn = new signalR.HubConnectionBuilder()
    //   .withUrl(`${API_URL}/hubs/workspace`).withAutomaticReconnect().build();
    return off;
  }, [qc]);
}

export function useOnlinePresence() {
  // Production: SignalR presence channel. Demo: static seed presence.
  return { onlineCount: 5 };
}
