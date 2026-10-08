"use client";
import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, X, Save, Settings2, Bookmark, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCard } from "@/components/shared/task-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoadingBoard } from "@/components/shared/states";
import { PRIORITY_META } from "@/config/constants";
import { toFaDigits, cn } from "@/lib/utils";
import { useBoard, useBoardTasks, useMoveTask, useBoardColumns, useMembers, useCreateTask } from "@/services/queries";
import { useUIStore } from "@/stores/ui-store";
import { usePermission, Can } from "@/hooks/use-permission";
import type { BoardColumn, Task } from "@/types/models";
import { toast } from "sonner";

interface SavedFilter { name: string; priorities: string[]; assignee: string; search: string }

export function Kanban({ boardId, projectId }: { boardId: string; projectId: string }) {
  const { data: board, isLoading } = useBoard(boardId);
  const { data: tasksData } = useBoardTasks(boardId);
  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData]);
  const move = useMoveTask();
  const cols = useBoardColumns();
  const { data: members = [] } = useMembers(projectId);
  const openTask = useUIStore((s) => s.openTask);
  const { can } = usePermission();

  const [search, setSearch] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [assignee, setAssignee] = useState<string>("all");
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeCol, setActiveCol] = useState<BoardColumn | null>(null);
  const [addColOpen, setAddColOpen] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");
  const [quickAdd, setQuickAdd] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const createTask = useCreateTask();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const saved: SavedFilter[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(`kanban_filters_${boardId}`) ?? "[]"); } catch { return []; }
  }, [boardId]);
  const [savedList, setSavedList] = useState<SavedFilter[]>(saved);

  const saveFilter = (name: string) => {
    const next = [...savedList, { name, priorities, assignee, search }];
    setSavedList(next);
    localStorage.setItem(`kanban_filters_${boardId}`, JSON.stringify(next));
    toast.success("فیلتر ذخیره شد.");
  };

  const filtered = useMemo(() => tasks.filter((t) => {
    if (search && !t.title.includes(search)) return false;
    if (priorities.length && !priorities.includes(t.priority)) return false;
    if (assignee !== "all" && !t.assigneeIds.includes(assignee)) return false;
    if (onlyBlocked && !t.isBlocked) return false;
    return true;
  }), [tasks, search, priorities, assignee, onlyBlocked]);

  const byColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    (board?.columns ?? []).forEach((c) => map.set(c.id, []));
    filtered.forEach((t) => { if (map.has(t.columnId)) map.get(t.columnId)!.push(t); });
    return map;
  }, [board, filtered]);

  if (isLoading || !board) return <LoadingBoard />;

  const onDragStart = (e: DragStartEvent) => {
    const { active } = e;
    if (active.data.current?.type === "task") setActiveTask(tasks.find((t) => t.id === active.id) ?? null);
    if (active.data.current?.type === "column") setActiveCol(board.columns.find((c) => c.id === active.id) ?? null);
  };

  const onDragOver = (e: DragOverEvent) => {
    // Cross-column move on drop handled in onDragEnd
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    setActiveCol(null);
    if (!over || active.id === over.id) return;

    if (active.data.current?.type === "column") {
      const ids = board.columns.map((c) => c.id);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from >= 0 && to >= 0) cols.reorder.mutate({ bid: board.id, ids: arrayMove(ids, from, to) });
      return;
    }
    if (active.data.current?.type === "task") {
      const task = tasks.find((t) => t.id === active.id);
      if (!task) return;
      // over may be a task or a column
      const overTask = tasks.find((t) => t.id === over.id);
      const targetColId = overTask ? overTask.columnId : String(over.id);
      if (targetColId !== task.columnId) {
        move.mutate({ id: task.id, columnId: targetColId });
      }
    }
  };

  const submitQuickAdd = (columnId: string) => {
    if (!quickTitle.trim()) return;
    createTask.mutate({
      title: quickTitle.trim(), projectId, boardId: board.id, columnId,
    } as Parameters<typeof createTask.mutate>[0], { onSuccess: () => { setQuickTitle(""); } });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[11.25rem] flex-1 sm:max-w-64">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="جست‌وجو در تسک‌ها…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 ps-8" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              اولویت {priorities.length > 0 && <Badge variant="secondary" className="ms-1 h-5 px-1.5 tnum">{toFaDigits(priorities.length)}</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>فیلتر اولویت</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(PRIORITY_META).map(([k, m]) => (
              <DropdownMenuCheckboxItem
                key={k}
                checked={priorities.includes(k)}
                onCheckedChange={(v) => setPriorities((p) => (v ? [...p, k] : p.filter((x) => x !== k)))}
                onSelect={(e) => e.preventDefault()}
              >
                {m.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="مجری" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه مجریان</SelectItem>
            {members.map((m) => <SelectItem key={m.userId} value={m.userId}>{m.user.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={onlyBlocked ? "secondary" : "outline"} size="sm" className="h-9" onClick={() => setOnlyBlocked((v) => !v)}>
          فقط مسدودها
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9"><Bookmark className="h-4 w-4" /> فیلترهای ذخیره‌شده</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>فیلترهای ذخیره‌شده</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {savedList.map((f) => (
              <DropdownMenuItem key={f.name} onClick={() => { setPriorities(f.priorities); setAssignee(f.assignee); setSearch(f.search); }}>
                {f.name}
              </DropdownMenuItem>
            ))}
            {savedList.length === 0 && <p className="p-2 text-xs text-muted-foreground">فیلتری ذخیره نشده است.</p>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              const name = prompt("نام فیلتر:");
              if (name) saveFilter(name);
            }}>
              <Plus className="h-4 w-4" /> ذخیره فیلتر جاری
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {(search || priorities.length || assignee !== "all" || onlyBlocked) && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setPriorities([]); setAssignee("all"); setOnlyBlocked(false); }}>
            <X className="h-4 w-4" /> پاک کردن
          </Button>
        )}
        <span className="ms-auto text-xs text-muted-foreground tnum">{toFaDigits(filtered.length)} تسک</span>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="kanban-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-4">
          <SortableContext items={board.columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {board.columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={byColumn.get(col.id) ?? []}
                members={members.map((m) => m.user)}
                onOpen={(t) => openTask(t.id)}
                quickAdd={quickAdd === col.id}
                setQuickAdd={(v) => { setQuickAdd(v ? col.id : null); setQuickTitle(""); }}
                quickTitle={quickTitle}
                setQuickTitle={setQuickTitle}
                onQuickSubmit={() => submitQuickAdd(col.id)}
                creating={createTask.isPending}
                canMove={can("tasks.move")}
                sortable={can("boards.edit")}
              />
            ))}
          </SortableContext>
          <Can perm="boards.manage_columns">
            <Dialog open={addColOpen} onOpenChange={setAddColOpen}>
              <DialogTrigger asChild>
                <button className="flex h-12 w-72 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                  <Plus className="h-4 w-4" /> افزودن ستون
                </button>
              </DialogTrigger>
              <DialogContent size="sm">
                <DialogHeader><DialogTitle>ستون جدید</DialogTitle></DialogHeader>
                <div className="flex flex-col gap-3">
                  <Input placeholder="عنوان ستون…" value={newColTitle} onChange={(e) => setNewColTitle(e.target.value)} autoFocus />
                  <Button disabled={!newColTitle.trim()} loading={cols.add.isPending}
                    onClick={() => cols.add.mutate({ bid: board.id, title: newColTitle.trim() }, { onSuccess: () => { setAddColOpen(false); setNewColTitle(""); } })}>
                    افزودن ستون
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
        <DragOverlay>
          {activeTask && <div className="w-72 rotate-2 opacity-90"><TaskCard task={activeTask} compact /></div>}
          {activeCol && <div className="w-72 rounded-xl border bg-card p-3 text-sm font-semibold shadow-pop">{activeCol.title}</div>}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({ column, tasks, onOpen, quickAdd, setQuickAdd, quickTitle, setQuickTitle, onQuickSubmit, creating, canMove, sortable }: {
  column: BoardColumn;
  tasks: Task[];
  members: { name: string }[];
  onOpen: (t: Task) => void;
  quickAdd: boolean;
  setQuickAdd: (v: boolean) => void;
  quickTitle: string;
  setQuickTitle: (v: string) => void;
  onQuickSubmit: () => void;
  creating: boolean;
  canMove: boolean;
  sortable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column" },
    disabled: !sortable,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const cols = useBoardColumns();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [wip, setWip] = useState<string>(column.wipLimit?.toString() ?? "");
  const overWip = column.wipLimit !== undefined && tasks.length > column.wipLimit;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex max-h-[calc(100vh-280px)] min-h-40 w-72 shrink-0 flex-col rounded-xl border bg-muted/40", isDragging && "opacity-50", overWip && "border-warning/60")}
    >
      <div className="flex items-center gap-2 p-2.5" {...(sortable ? attributes : {})} {...(sortable ? listeners : {})}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
        {editing ? (
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-[13px]"
            onBlur={() => { setEditing(false); if (title.trim() && title !== column.title) cols.update.mutate({ bid: column.boardId, cid: column.id, patch: { title: title.trim() } }); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            autoFocus onClick={(e) => e.stopPropagation()} />
        ) : (
          <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold">{column.title}</h3>
        )}
        <Badge variant={overWip ? "warning" : "secondary"} className="tnum">{toFaDigits(tasks.length)}{column.wipLimit ? `/${toFaDigits(column.wipLimit)}` : ""}</Badge>
        <ColumnMenu column={column} wip={wip} setWip={setWip} onRename={() => { setTitle(column.title); setEditing(true); }} />
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5 pt-0">
          {tasks.map((t) => (
            <SortableTask key={t.id} task={t} onOpen={onOpen} disabled={!canMove} />
          ))}
          {tasks.length === 0 && (
            <p className="rounded-lg border border-dashed p-3 text-center text-[11px] text-muted-foreground">تسکی نیست</p>
          )}
        </div>
      </SortableContext>

      <div className="p-2.5 pt-1">
        {quickAdd ? (
          <div className="flex flex-col gap-2 rounded-xl border bg-card p-2">
            <Input placeholder="عنوان تسک…" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onQuickSubmit(); if (e.key === "Escape") setQuickAdd(false); }}
              autoFocus className="h-9" />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-8 flex-1" loading={creating} onClick={onQuickSubmit}>افزودن</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setQuickAdd(false)}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : (
          <Can perm="tasks.create">
            <button onClick={() => setQuickAdd(true)} className="flex w-full items-center justify-center gap-1.5 rounded-lg p-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Plus className="h-3.5 w-3.5" /> افزودن سریع تسک
            </button>
          </Can>
        )}
      </div>
    </div>
  );
}

function SortableTask({ task, onOpen, disabled }: { task: Task; onOpen: (t: Task) => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
    disabled,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn(isDragging && "opacity-40")}>
      <TaskCard task={task} onOpen={onOpen} compact />
    </div>
  );
}

function ColumnMenu({ column, wip, setWip, onRename }: { column: BoardColumn; wip: string; setWip: (v: string) => void; onRename: () => void }) {
  const cols = useBoardColumns();
  const [wipOpen, setWipOpen] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="h-7 w-7" aria-label="تنظیمات ستون" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>تنظیمات ستون</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRename}><Pencil className="h-4 w-4" /> تغییر نام</DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setWipOpen(true); }}><Settings2 className="h-4 w-4" /> سقف WIP</DropdownMenuItem>
        {/* Completion is decided per column, so the board owner decides which
            column counts as "done". Only one column may hold the flag. */}
        <DropdownMenuCheckboxItem
          checked={column.isDoneColumn === true}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={(v) => cols.update.mutate({ bid: column.boardId, cid: column.id, patch: { isDoneColumn: v === true } })}
        >
          <CheckCircle2 className="h-4 w-4" /> این ستون یعنی انجام‌شده
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <ConfirmDialog
          trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="h-4 w-4" /> حذف ستون</DropdownMenuItem>}
          title="حذف ستون"
          description="ستون حذف می‌شود و تسک‌های آن به اولین ستون منتقل می‌گردند."
          confirmLabel="حذف ستون"
          onConfirm={() => cols.remove.mutate({ bid: column.boardId, cid: column.id })}
        />
      </DropdownMenuContent>
      <Dialog open={wipOpen} onOpenChange={setWipOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>سقف WIP ستون «{column.title}»</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input type="number" min={0} placeholder="بدون سقف" value={wip} onChange={(e) => setWip(e.target.value)} />
            <Button onClick={() => {
              cols.update.mutate({ bid: column.boardId, cid: column.id, patch: { wipLimit: wip ? Number(wip) : undefined } });
              setWipOpen(false);
            }}>
              <Save className="h-4 w-4" /> ذخیره
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
