"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, ListOrdered, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/states";
import { toFaDigits, cn } from "@/lib/utils";
import { formatTimeFa, weekdayFa } from "@/lib/format";
import { useEvents, useEventActions } from "@/services/queries";
import { useUIStore } from "@/stores/ui-store";
import { usePermission, Can } from "@/hooks/use-permission";
import type { CalendarEvent } from "@/types/models";

type View = "month" | "week" | "day" | "agenda";

const KIND_META: Record<CalendarEvent["kind"], { label: string; color: string }> = {
  task: { label: "ددلاین تسک", color: "#16a34a" },
  milestone: { label: "مایلستون", color: "#f59e0b" },
  meeting: { label: "جلسه", color: "#0ea5e9" },
  project_event: { label: "رویداد پروژه", color: "#dc2626" },
  personal: { label: "شخصی", color: "#64748b" },
};

export function CalendarView({ projectId }: { projectId?: string }) {
  const { data: events = [], isLoading } = useEvents(projectId);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const openTask = useUIStore((s) => s.openTask);

  // Deep link: /calendar?new=1 opens the create-event dialog.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      setEditing(null);
      setDialogOpen(true);
    }
  }, []);

  const move = (dir: number) => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };

  const title = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long" }).format(cursor);
    } catch {
      return cursor.toLocaleDateString();
    }
  }, [cursor]);

  const openEvent = (e: CalendarEvent) => {
    if (e.kind === "task" && e.taskId) openTask(e.taskId);
    else if (e.id && !e.id.startsWith("t_")) { setEditing(e); setDialogOpen(true); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => move(1)} aria-label="بعدی"><ChevronRight className="h-4 w-4 rotate-180" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>امروز</Button>
          <Button variant="outline" size="icon-sm" onClick={() => move(-1)} aria-label="قبلی"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <h2 className="text-base font-bold">{title}</h2>
        <div className="ms-auto flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList className="h-9">
              <TabsTrigger value="month" className="h-7 text-xs">ماه</TabsTrigger>
              <TabsTrigger value="week" className="h-7 text-xs">هفته</TabsTrigger>
              <TabsTrigger value="day" className="h-7 text-xs">روز</TabsTrigger>
              <TabsTrigger value="agenda" className="h-7 text-xs">دستورکار</TabsTrigger>
            </TabsList>
          </Tabs>
          <Can perm="calendar.manage">
            <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> رویداد
            </Button>
          </Can>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {Object.entries(KIND_META).map(([k, m]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />{m.label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="grid animate-pulse grid-cols-7 gap-2">
          {Array.from({ length: 28 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted" />)}
        </div>
      ) : view === "month" ? (
        <MonthGrid cursor={cursor} events={events} onOpen={openEvent} />
      ) : view === "agenda" ? (
        <Agenda events={events} onOpen={openEvent} />
      ) : (
        <WeekDayView cursor={cursor} events={events} days={view === "week" ? 7 : 1} onOpen={openEvent} />
      )}

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} projectId={projectId} />
    </div>
  );
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function MonthGrid({ cursor, events, onOpen }: { cursor: Date; events: CalendarEvent[]; onOpen: (e: CalendarEvent) => void }) {
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 1) % 7; // week starts Saturday-ish; keep simple
    const start = new Date(first);
    start.setDate(start.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const k = new Date(e.startsAt).toISOString().slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    });
    return m;
  }, [events]);

  const today = dayKey(new Date());
  const weekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {weekdays.map((w) => (
          <div key={w} className="p-2 text-center text-[11px] font-semibold text-muted-foreground">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const k = dayKey(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const list = byDay.get(k) ?? [];
          return (
            <div key={i} className={cn("min-h-20 border-b border-e p-1.5 sm:min-h-28 [&:nth-child(7n)]:border-e-0", !inMonth && "bg-muted/30")}>
              <span className={cn(
                "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px]",
                k === today ? "bg-primary font-bold text-primary-foreground" : inMonth ? "" : "text-muted-foreground",
              )}>
                {toFaDigits(d.getDate())}
              </span>
              <div className="hidden flex-col gap-1 sm:flex">
                {list.slice(0, 3).map((e) => (
                  <button key={e.id} onClick={() => onOpen(e)} title={e.title}
                    className="truncate rounded-md px-1.5 py-0.5 text-start text-[10px] font-medium text-white"
                    style={{ backgroundColor: e.color ?? KIND_META[e.kind].color }}>
                    {e.title}
                  </button>
                ))}
                {list.length > 3 && <span className="text-[10px] text-muted-foreground">+{toFaDigits(list.length - 3)} مورد</span>}
              </div>
              <div className="flex gap-1 sm:hidden">
                {list.slice(0, 3).map((e) => (
                  <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: e.color }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeekDayView({ cursor, events, days, onOpen }: { cursor: Date; events: CalendarEvent[]; days: number; onOpen: (e: CalendarEvent) => void }) {
  const list = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(start.getDate() - (days === 7 ? 3 : 0));
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = dayKey(d);
      return { d, items: events.filter((e) => new Date(e.startsAt).toISOString().slice(0, 10) === k) };
    });
  }, [cursor, events, days]);

  return (
    <div className={cn("grid gap-3", days === 7 ? "md:grid-cols-7 sm:grid-cols-2" : "grid-cols-1")}>
      {list.map(({ d, items }) => (
        <Card key={d.toISOString()} className="p-3">
          <p className="text-xs font-semibold">{weekdayFa(d)}</p>
          <p className="mb-2 text-[11px] text-muted-foreground">{toFaDigits(d.getDate())} {new Intl.DateTimeFormat("fa-IR", { month: "long" }).format(d)}</p>
          <div className="flex flex-col gap-1.5">
            {items.map((e) => (
              <button key={e.id} onClick={() => onOpen(e)}
                className="rounded-lg border-s-2 bg-muted/50 p-2 text-start text-xs hover:bg-muted"
                style={{ borderColor: e.color ?? KIND_META[e.kind].color }}>
                <span className="block truncate font-medium">{e.title}</span>
                {!e.allDay && <span className="text-[10px] text-muted-foreground">{formatTimeFa(e.startsAt)}</span>}
              </button>
            ))}
            {items.length === 0 && <p className="text-[11px] text-muted-foreground">بدون رویداد</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function Agenda({ events, onOpen }: { events: CalendarEvent[]; onOpen: (e: CalendarEvent) => void }) {
  const sorted = useMemo(() => [...events].filter((e) => new Date(e.startsAt).getTime() > Date.now() - 86400_000).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 40), [events]);
  if (!sorted.length) {
    return <EmptyState icon={<ListOrdered className="h-6 w-6" />} title="رویداد آینده‌ای نیست" description="رویداد جدیدی ایجاد کنید." />;
  }
  return (
    <Card className="divide-y p-0">
      {sorted.map((e) => (
        <button key={e.id} onClick={() => onOpen(e)} className="flex w-full items-center gap-3 p-3 text-start hover:bg-muted/40">
          <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: e.color ?? KIND_META[e.kind].color }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{e.title}</span>
            <span className="block text-[11px] text-muted-foreground">{KIND_META[e.kind].label}</span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{e.allDay ? "تمام‌روز" : formatTimeFa(e.startsAt)}</span>
        </button>
      ))}
    </Card>
  );
}

function EventDialog({ open, onOpenChange, editing, projectId }: { open: boolean; onOpenChange: (v: boolean) => void; editing: CalendarEvent | null; projectId?: string }) {
  const actions = useEventActions();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<CalendarEvent["kind"]>("meeting");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");

  useState(() => {
    if (editing) {
      setTitle(editing.title);
      setKind(editing.kind);
      setDate(editing.startsAt.slice(0, 10));
      setTime(editing.startsAt.slice(11, 16));
    } else {
      setTitle(""); setKind("meeting"); setDate(new Date().toISOString().slice(0, 10)); setTime("10:00");
    }
  });

  const save = () => {
    if (!title.trim() || !date) return;
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    const endsAt = new Date(new Date(startsAt).getTime() + 3600_000).toISOString();
    if (editing) {
      actions.update.mutate({ id: editing.id, patch: { title: title.trim(), kind, startsAt, endsAt } }, { onSuccess: () => onOpenChange(false) });
    } else {
      actions.create.mutate({ title: title.trim(), kind, startsAt, endsAt, projectId, color: KIND_META[kind].color }, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader><DialogTitle>{editing ? "ویرایش رویداد" : "رویداد جدید"}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <Input placeholder="عنوان رویداد…" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Select value={kind} onValueChange={(v) => setKind(v as CalendarEvent["kind"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_META).filter(([k]) => k !== "task").map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={save} loading={actions.create.isPending || actions.update.isPending} disabled={!title.trim()}>ذخیره</Button>
            {editing && (
              <ConfirmDialog
                trigger={<Button variant="outline" className="text-destructive"><Trash2 className="h-4 w-4" /> حذف</Button>}
                title="حذف رویداد" description="این رویداد حذف می‌شود." confirmLabel="حذف"
                onConfirm={() => { actions.remove.mutate(editing.id); onOpenChange(false); }}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CalendarIcon() {
  return <CalendarDays className="h-4 w-4" />;
}
