"use client";
import Link from "next/link";
import {
  UserPlus, AtSign, Clock, AlarmClockOff, MessageSquare, FolderKanban,
  FileUp, Mail, GitBranch, Bell,
} from "lucide-react";
import { timeAgoFa } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationItem as N } from "@/types/models";

const ICONS: Record<N["type"], { icon: React.ReactNode; cls: string }> = {
  task_assigned: { icon: <UserPlus className="h-4 w-4" />, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  mention: { icon: <AtSign className="h-4 w-4" />, cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  deadline_soon: { icon: <Clock className="h-4 w-4" />, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  deadline_missed: { icon: <AlarmClockOff className="h-4 w-4" />, cls: "bg-red-500/10 text-red-600 dark:text-red-400" },
  comment: { icon: <MessageSquare className="h-4 w-4" />, cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  project: { icon: <FolderKanban className="h-4 w-4" />, cls: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  file: { icon: <FileUp className="h-4 w-4" />, cls: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  message: { icon: <Mail className="h-4 w-4" />, cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  dependency: { icon: <GitBranch className="h-4 w-4" />, cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
};

export function NotificationItem({ notif, onRead }: { notif: N; onRead?: (n: N) => void }) {
  const meta = ICONS[notif.type] ?? { icon: <Bell className="h-4 w-4" />, cls: "bg-muted text-muted-foreground" };
  const body = (
    <span className={cn("flex w-full items-start gap-3 rounded-xl p-3 text-start transition-colors hover:bg-muted/60", !notif.isRead && "bg-primary/[0.04]")}>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", meta.cls)}>{meta.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold">{notif.title}</span>
          {!notif.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">{notif.body}</span>
        <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgoFa(notif.createdAt)}</span>
      </span>
    </span>
  );
  if (notif.link) {
    return <Link href={notif.link} onClick={() => onRead?.(notif)} className="block">{body}</Link>;
  }
  return <button onClick={() => onRead?.(notif)} className="block w-full">{body}</button>;
}
