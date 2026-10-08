"use client";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, CalendarDays, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { TaskCard } from "@/components/shared/task-card";
import { PriorityBadge, ColumnBadge } from "@/components/shared/badges";
import { EmptyState, ErrorState, LoadingList } from "@/components/shared/states";
import { PRIORITY_META } from "@/config/constants";
import { formatShortDateFa, isOverdue } from "@/lib/format";
import { toFaDigits, cn } from "@/lib/utils";
import { useTasks, useBoards } from "@/services/queries";
import { useUIStore } from "@/stores/ui-store";
import { Can } from "@/hooks/use-permission";
import type { Task } from "@/types/models";

type SortKey = "due" | "priority" | "updated" | "title";

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, lowest: 4 };

export default function ProjectTasksPage() {
  const { id } = useParams() as { id: string };
  const { data, isLoading, isError, refetch } = useTasks({ projectId: id, pageSize: 300 });
  const { data: boards = [] } = useBoards(id);
  const openTask = useUIStore((s) => s.openTask);
  const openCreateTask = useUIStore((s) => s.openCreateTask);

  const [q, setQ] = useState("");
  const [board, setBoard] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState<SortKey>("updated");

  const colOf = (t: Task) => boards.flatMap((b) => b.columns).find((c) => c.id === t.columnId);

  const shown = useMemo(() => {
    let list = data?.items ?? [];
    if (board !== "all") list = list.filter((t) => t.boardId === board);
    if (priority !== "all") list = list.filter((t) => t.priority === priority);
    if (q) list = list.filter((t) => t.title.includes(q));
    const sorted = [...list];
    if (sort === "due") sorted.sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));
    if (sort === "priority") sorted.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    if (sort === "updated") sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title, "fa"));
    return sorted;
  }, [data, board, priority, q, sort]);

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    shown.forEach((t) => {
      const c = colOf(t);
      const key = c ? c.title : "بدون ستون";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return [...map.entries()];
  }, [shown, boards]);

  return (
    <div>
      <PageHeader
        title="وظایف پروژه"
        description={`${toFaDigits(data?.total ?? 0)} تسک در این پروژه.`}
        actions={
          <Can perm="tasks.create">
            <Button size="sm" onClick={() => openCreateTask({ projectId: id })}><Plus className="h-4 w-4" /> تسک جدید</Button>
          </Can>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[11.25rem] flex-1 sm:max-w-64">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="جست‌وجو…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 ps-8" />
        </div>
        <Select value={board} onValueChange={setBoard}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="بورد" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه بوردها</SelectItem>
            {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="اولویت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه اولویت‌ها</SelectItem>
            {Object.entries(PRIORITY_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-9 w-40"><ArrowUpDown className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">آخرین به‌روزرسانی</SelectItem>
            <SelectItem value="due">ددلاین</SelectItem>
            <SelectItem value="priority">اولویت</SelectItem>
            <SelectItem value="title">عنوان</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingList rows={8} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && shown.length === 0 && (
        <EmptyState title="تسکی یافت نشد" description="فیلترها را تغییر دهید یا تسک جدیدی بسازید." />
      )}

      {/* Desktop table */}
      {!isLoading && !isError && shown.length > 0 && (
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>اولویت</TableHead>
                <TableHead>مجریان</TableHead>
                <TableHead>ددلاین</TableHead>
                <TableHead>پیشرفت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((t) => {
                const c = colOf(t);
                const overdue = isOverdue(t.dueDate, t.status);
                return (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => openTask(t.id)}>
                    <TableCell className="max-w-[17.5rem]">
                      <span className="block truncate font-medium">{t.title}</span>
                      <span className="text-[11px] text-muted-foreground">{t.id}</span>
                    </TableCell>
                    <TableCell>{c && <ColumnBadge title={c.title} color={c.color} />}</TableCell>
                    <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                    <TableCell>
                      <span className="flex -space-x-2 space-x-reverse">
                        {t.assignees?.map((u) => <UserAvatar key={u.id} name={u.name} src={u.avatarUrl} size="sm" className="ring-2 ring-card" />)}
                        {!t.assignees?.length && <span className="text-xs text-muted-foreground">—</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      {t.dueDate ? (
                        <span className={cn("flex items-center gap-1 text-xs", overdue && "font-bold text-destructive")}>
                          <CalendarDays className="h-3.5 w-3.5" />{formatShortDateFa(t.dueDate)}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><span className="text-xs tnum">{toFaDigits(t.progress)}٪</span></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Mobile/tablet grouped cards */}
      <div className="flex flex-col gap-5 lg:hidden">
        {grouped.map(([title, list]) => (
          <div key={title}>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
              {title}<Badge variant="secondary" className="tnum">{toFaDigits(list.length)}</Badge>
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {list.map((t) => <TaskCard key={t.id} task={t} compact onOpen={() => openTask(t.id)} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
