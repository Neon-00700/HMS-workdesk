import { Flag, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_META, STREAM_META } from "@/config/constants";
import type { TaskPriority, Task } from "@/types/models";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority, showLabel = true }: { priority: TaskPriority; showLabel?: boolean }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium", meta.bg, meta.color)}>
      <Flag className="h-3 w-3" />
      {showLabel && meta.label}
    </span>
  );
}

export function StreamBadge({ stream }: { stream: NonNullable<Task["stream"]> }) {
  const meta = STREAM_META[stream];
  return (
    <Badge variant="secondary" className="gap-1.5 font-normal">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </Badge>
  );
}

export function ColumnBadge({ title, color }: { title: string; color: string }) {
  return (
    <Badge variant="secondary" className="gap-1.5 font-normal">
      <CircleDot className="h-3 w-3" style={{ color }} />
      {title}
    </Badge>
  );
}

export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {name}
    </span>
  );
}
