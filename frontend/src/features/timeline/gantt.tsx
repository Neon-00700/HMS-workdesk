"use client";
import { useMemo, useState } from "react";
import { Flag, Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tip } from "@/components/ui/tooltip";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { PRIORITY_META, STREAM_META } from "@/config/constants";
import { formatShortDateFa } from "@/lib/format";
import { toFaDigits, cn } from "@/lib/utils";
import { useTasks, useMilestones } from "@/services/queries";
import { useUIStore } from "@/stores/ui-store";
import type { Task } from "@/types/models";

/** Lightweight Gantt: tasks with dates on a 6-week window + dependencies + milestones. */
export function Gantt({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, refetch } = useTasks({ projectId, pageSize: 300 });
  const { data: milestones = [] } = useMilestones(projectId);
  const openTask = useUIStore((s) => s.openTask);
  const [streamFilter, setStreamFilter] = useState("all");

  const tasks = useMemo(() => {
    const items = (data?.items ?? []).filter((t) => t.dueDate);
    return streamFilter === "all" ? items : items.filter((t) => t.stream === streamFilter);
  }, [data, streamFilter]);

  const { start, days, colW } = useMemo(() => {
    const s = new Date();
    s.setDate(s.getDate() - 7);
    s.setHours(0, 0, 0, 0);
    return { start: s, days: 56, colW: 28 };
  }, []);

  const xOf = (d: string) => Math.max(0, Math.floor((new Date(d).getTime() - start.getTime()) / 86400_000));

  if (isLoading) return <div className="h-80 animate-pulse rounded-xl bg-muted" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!tasks.length) {
    return <EmptyState title="داده‌ای برای تایم‌لاین نیست" description="تسک‌های دارای ددلاین در اینجا نمایش داده می‌شوند." />;
  }

  const todayX = Math.floor((Date.now() - start.getTime()) / 86400_000);
  const totalW = days * colW;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={streamFilter} onValueChange={setStreamFilter}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="حوزه کاری" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه حوزه‌ها</SelectItem>
            {Object.entries(STREAM_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground tnum">{toFaDigits(tasks.length)} تسک در بازه ۸ هفته</span>
        <div className="ms-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-6 rounded bg-primary" />پیشرفت</span>
          <span className="flex items-center gap-1"><Flag className="h-3 w-3 text-amber-500" />مایلستون</span>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <div className="min-w-[50rem] p-4" style={{ minWidth: 320 + totalW }}>
          {/* Header row */}
          <div className="flex">
            <div className="w-80 shrink-0 pe-4 text-xs font-semibold text-muted-foreground">تسک</div>
            <div className="relative" style={{ width: totalW }}>
              <div className="flex">
                {Array.from({ length: days }).map((_, i) => {
                  const d = new Date(start.getTime() + i * 86400_000);
                  const isToday = i === todayX;
                  return (
                    <div key={i} className={cn("shrink-0 border-s text-center text-[9px] text-muted-foreground", isToday && "bg-primary/10 font-bold text-primary")} style={{ width: colW }}>
                      {toFaDigits(d.getDate())}
                    </div>
                  );
                })}
              </div>
              {/* Milestones */}
              <div className="relative mt-1 h-5">
                {milestones.map((m) => {
                  const x = xOf(m.dueDate);
                  if (x < 0 || x > days) return null;
                  return (
                    <Tip key={m.id} label={`${m.title} — ${formatShortDateFa(m.dueDate)}`}>
                      <span className="absolute top-0" style={{ right: x * colW }}>
                        <Flag className={cn("h-4 w-4", m.isDone ? "fill-emerald-500 text-emerald-500" : "fill-amber-400 text-amber-500")} />
                      </span>
                    </Tip>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Task rows */}
          <div className="mt-1 flex flex-col">
            {tasks.map((t) => (
              <GanttRow key={t.id} task={t} start={start} colW={colW} days={days} todayX={todayX} onOpen={() => openTask(t.id)} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function GanttRow({ task, start, colW, days, todayX, onOpen }: {
  task: Task; start: Date; colW: number; days: number; todayX: number; onOpen: () => void;
}) {
  const dueX = Math.floor((new Date(task.dueDate!).getTime() - start.getTime()) / 86400_000);
  const startX = task.startDate
    ? Math.floor((new Date(task.startDate).getTime() - start.getTime()) / 86400_000)
    : Math.max(0, dueX - Math.max(2, Math.round((task.estimateMinutes ?? 480) / 480)));
  const s = Math.max(0, Math.min(days - 1, startX));
  const e = Math.max(s + 1, Math.min(days, dueX + 1));
  const w = (e - s) * colW;
  const done = task.status === "done" || task.status === "released";
  const overdue = !done && dueX < todayX;
  const color = done ? "#16a34a" : overdue ? "#dc2626" : task.priority === "critical" ? "#f97316" : PRIORITY_META[task.priority] ? "#0ea5e9" : "#0ea5e9";

  return (
    <button onClick={onOpen} className="group flex items-center rounded-lg py-1 text-start hover:bg-muted/40">
      <span className="w-80 shrink-0 truncate pe-4 text-xs">
        <span className="font-medium group-hover:text-primary">{task.title}</span>
        {task.dependencies.length > 0 && <Link2 className="ms-1 inline h-3 w-3 text-muted-foreground" />}
      </span>
      <span className="relative block" style={{ width: days * colW }}>
        <span className="absolute inset-y-0 rounded-full bg-muted/60" style={{ right: s * colW, width: w }} />
        <Tip label={`${task.title} — ${toFaDigits(task.progress)}٪ · تحویل ${formatShortDateFa(task.dueDate!)}`}>
          <span className="absolute inset-y-0 overflow-hidden rounded-full" style={{ right: s * colW, width: w, backgroundColor: `${color}33` }}>
            <span className="block h-full rounded-full" style={{ width: `${task.progress}%`, backgroundColor: color }} />
          </span>
        </Tip>
        {task.dependencies.length > 0 && (
          <span className="absolute top-1/2 h-px bg-muted-foreground/40" style={{ right: Math.max(0, (s - 3) * colW), width: 3 * colW }} />
        )}
        <Badge variant="outline" className="absolute top-1/2 hidden h-5 -translate-y-1/2 px-1 text-[9px] group-hover:inline-flex" style={{ right: Math.min(days * colW - 90, s * colW + w + 6) }}>
          {formatShortDateFa(task.dueDate!)}
        </Badge>
      </span>
    </button>
  );
}
