"use client";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { useRealtime } from "@/hooks/use-realtime";
import { useAuthStore } from "@/stores/auth-store";
import { db } from "@/services/mock-db";

function RealtimeBridge() {
  useRealtime();
  return null;
}

/** Signs out sessions whose user no longer exists (e.g. after a data reset). */
function SessionValidator() {
  const logout = useAuthStore((s) => s.logout);
  useEffect(() => {
    const check = () => {
      const u = useAuthStore.getState().user;
      if (u && typeof window !== "undefined" && !db.user(u.id)) logout();
    };
    check();
    return db.subscribe(check);
  }, [logout]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <QueryClientProvider client={qc}>
        <TooltipProvider delayDuration={250}>
          <RealtimeBridge />
          <SessionValidator />
          {children}
          <Toaster position="bottom-left" richColors closeButton dir="rtl" toastOptions={{ style: { fontFamily: "inherit" } }} />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
