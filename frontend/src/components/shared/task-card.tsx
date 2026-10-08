"use client";
import { memo } from "react";
import { CalendarDays, MessageSquare, Paperclip, AlertOctagon, Link2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/ui/avatar";
import { PriorityBadge, LabelChip } from "./badges";
import { formatShortDateFa, isOverdue, isDueSoon } from "@/lib/format";
import { isTaskDone } from "@/lib/task-state";
import { db } from "@/services/mock-db";
import { formatMinutes, cn } from "@/lib/utils";
import type { Task } from "@/types/models";

export const TaskCard = memo(function TaskCard({ task, onOpen, compact }: {
  task: Task; onOpen?: (t: Task) => void; compact?: boolean;
}) {
  // Deadline styling follows the column, not a status string.
  const done = isTaskDone(task, db.board(task.boardId));
  const overdue = !done && isOverdue(task.dueDate);
  const soon = !done && isDueSoon(task.dueDate);
  const doneSubs = task.subtasks.filter((s) => s.isDone).length;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(task)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen?.(task); }}
      className={cn(
        "group cursor-pointer p-3 transition-all hover:border-primary/40 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        task.priority === "critical" && "border-s-4 border-s-red-500",
        task.isBlocked && "bg-destructive/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[13px] font-medium leading-6">{task.title}</p>
        <PriorityBadge priority={task.priority} showLabel={false} />
      </div>

      {!compact && task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((l) => <LabelChip key={l.id} name={l.name} color={l.color} />)}
        </div>
      )}

      {task.subtasks.length > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <Progress value={(doneSubs / task.subtasks.length) * 100} className="h-1.5" />
          <span className="shrink-0 text-[11px] text-muted-foreground tnum">{doneSubs}/{task.subtasks.length}</span>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {task.assignees?.slice(0, 3).map((u) => (
            <UserAvatar key={u.id} name={u.name} src={u.avatarUrl} size="xs" />
          ))}
          {task.assignees?.length === 0 && <span className="text-[11px] text-muted-foreground">بدون مجری</span>}
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          {task.isBlocked && <AlertOctagon className="h-3.5 w-3.5 text-destructive" />}
          {task.dependencies.length > 0 && <Link2 className="h-3.5 w-3.5" />}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-0.5"><MessageSquare className="h-3.5 w-3.5" /><span className="tnum">{task.comments.length}</span></span>
          )}
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5"><Paperclip className="h-3.5 w-3.5" /><span className="tnum">{task.attachments.length}</span></span>
          )}
          {task.dueDate && (
            <span className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5",
              overdue ? "bg-destructive/10 font-semibold text-destructive" : soon ? "bg-warning/10 text-warning" : "",
            )}>
              <CalendarDays className="h-3.5 w-3.5" />
              {formatShortDateFa(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {!compact && (task.estimateMinutes || task.spentMinutes > 0) && (
        <div className="mt-2 flex items-center gap-1 border-t pt-2 text-[11px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {task.spentMinutes > 0 ? `صرف‌شده ${formatMinutes(task.spentMinutes)}` : ""}
          {task.estimateMinutes ? ` / تخمین ${formatMinutes(task.estimateMinutes)}` : ""}
        </div>
      )}
    </Card>
  );
});
