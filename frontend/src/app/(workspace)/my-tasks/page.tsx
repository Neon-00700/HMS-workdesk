"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { TaskCard } from "@/components/shared/task-card";
import { EmptyState, ErrorState, LoadingList } from "@/components/shared/states";
import { PRIORITY_META } from "@/config/constants";
import { toFaDigits } from "@/lib/utils";
import { useTasks, useProjects, useBoards } from "@/services/queries";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { CheckSquare } from "lucide-react";

type Filter = "all" | "today" | "overdue" | "blocked" | "done";

function MyTasksInner() {
  const params = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const openTask = useUIStore((s) => s.openTask);
  const openCreateTask = useUIStore((s) => s.openCreateTask);
  const { data, isLoading, isError, refetch } = useTasks({ assigneeId: user?.id, pageSize: 200 });
  const { data: projects = [] } = useProjects();

  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("all");
  const [project, setProject] = useState("all");

  useEffect(() => {
    const f = params.get("filter");
    if (f === "overdue" || f === "blocked" || f === "today") setFilter(f);
  }, [params]);

  const all = data?.items ?? [];
  const counts = useMemo(() => ({
    all: all.length,
    today: all.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length,
    overdue: all.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== "done" && t.status !== "released").length,
    blocked: all.filter((t) => t.isBlocked).length,
    done: all.filter((t) => t.status === "done" || t.status === "released").length,
  }), [all]);

  const shown = useMemo(() => all.filter((t) => {
    if (filter === "today" && !(t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString())) return false;
    if (filter === "overdue" && !(t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== "done" && t.status !== "released")) return false;
    if (filter === "blocked" && !t.isBlocked) return false;
    if (filter === "done" && !(t.status === "done" || t.status === "released")) return false;
    if (filter === "all" && (t.status === "done" || t.status === "released")) return false;
    if (priority !== "all" && t.priority !== priority) return false;
    if (project !== "all" && t.projectId !== project) return false;
    if (q && !t.title.includes(q)) return false;
    return true;
  }), [all, filter, priority, project, q]);

  const pname = (pid: string) => projects.find((p) => p.id === pid)?.name ?? "";

  return (
    <div>
      <PageHeader
        title="وظایف من"
        description="همه تسک‌هایی که به شما تخصیص داده شده، در همه پروژه‌ها."
        actions={<Button size="sm" onClick={() => openCreateTask()}><Plus className="h-4 w-4" /> تسک جدید</Button>}
      />

      <div className="mb-4 flex flex-col gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all">بازها <Badge variant="secondary" className="ms-1 tnum">{toFaDigits(counts.all - counts.done)}</Badge></TabsTrigger>
            <TabsTrigger value="today">امروز <Badge variant="secondary" className="ms-1 tnum">{toFaDigits(counts.today)}</Badge></TabsTrigger>
            <TabsTrigger value="overdue">معوق <Badge variant="destructive" className="ms-1 tnum">{toFaDigits(counts.overdue)}</Badge></TabsTrigger>
            <TabsTrigger value="blocked">مسدود <Badge variant="warning" className="ms-1 tnum">{toFaDigits(counts.blocked)}</Badge></TabsTrigger>
            <TabsTrigger value="done">تکمیل‌شده <Badge variant="secondary" className="ms-1 tnum">{toFaDigits(counts.done)}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[11.25rem] flex-1 sm:max-w-64">
            <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="جست‌وجو…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 ps-8" />
          </div>
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="پروژه" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه پروژه‌ها</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="اولویت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه اولویت‌ها</SelectItem>
              {Object.entries(PRIORITY_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <LoadingList rows={6} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && shown.length === 0 && (
        <EmptyState icon={<CheckSquare className="h-6 w-6" />} title="تسکی در این بخش نیست" description="فیلتر دیگری را امتحان کنید." />
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((t) => (
          <div key={t.id} className="flex flex-col gap-1">
            <TaskCard task={t} onOpen={() => openTask(t.id)} />
            <p className="px-1 text-[11px] text-muted-foreground">{pname(t.projectId)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyTasksPage() {
  return (
    <Suspense>
      <MyTasksInner />
    </Suspense>
  );
}
