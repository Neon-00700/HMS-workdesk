"use client";
import { useUIStore } from "@/stores/ui-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TaskDetailContent } from "./task-detail";

/** Global task quick-view sheet (opens from cards, lists, notifications). */
export function TaskSheet() {
  const activeTaskId = useUIStore((s) => s.activeTaskId);
  const openTask = useUIStore((s) => s.openTask);
  return (
    <Sheet open={!!activeTaskId} onOpenChange={(v) => !v && openTask(null)}>
      <SheetContent side="left" wide className="p-0">
        <SheetHeader className="pe-12">
          <SheetTitle>جزئیات تسک</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5">
          {activeTaskId && <TaskDetailContent taskId={activeTaskId} onDeleted={() => openTask(null)} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
