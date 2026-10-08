"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar, MobileSidebar } from "./sidebar";
import { Header } from "./header";
import { CommandPalette } from "./command-palette";
import { TaskSheet } from "@/features/tasks/task-sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateTaskForm } from "@/components/shared/create-task-form";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useProjects } from "@/services/queries";

/** Authenticated application shell: sidebar + header + content + global overlays. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activePid = useWorkspaceStore((s) => s.activeProjectId);
  const setActive = useWorkspaceStore((s) => s.setActiveProject);
  const { data: projects = [] } = useProjects();
  const createOpen = useUIStore((s) => s.createTaskOpen);
  const closeCreate = useUIStore((s) => s.closeCreateTask);
  const createDefaults = useUIStore((s) => s.createTaskDefaults);

  useEffect(() => {
    if (!isAuthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isAuthenticated, router, pathname]);

  // Default active project
  useEffect(() => {
    if (isAuthenticated && projects.length && !activePid) {
      setActive(projects.find((p) => p.isFavorite)?.id ?? projects[0].id);
    }
  }, [isAuthenticated, projects, activePid, setActive]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">هـ</span>
          <p className="text-sm text-muted-foreground">در حال انتقال به صفحه ورود…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6">{children}</main>
      </div>
      <CommandPalette />
      <TaskSheet />
      <Dialog open={createOpen} onOpenChange={(v) => !v && closeCreate()}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>ایجاد تسک جدید</DialogTitle>
          </DialogHeader>
          <CreateTaskForm defaults={createDefaults} onDone={closeCreate} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
