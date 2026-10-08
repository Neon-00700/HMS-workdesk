"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  ListTodo, CheckCircle2, Clock, AlertTriangle, CalendarDays, Activity as ActivityIcon,
  FolderKanban, Sprout, MoreVertical, LayoutDashboard, Settings as SettingsIcon,
  Database, Globe, Smartphone, ShoppingCart, Briefcase, Check,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/states";
import { PROJECT_STATUS_META } from "@/config/constants";
import { timeAgoFa, formatShortDateFa, formatDateFa, weekdayFa, isOverdue } from "@/lib/format";
import { toFaDigits, cn } from "@/lib/utils";
import { useProjects, useTasks, useTaskStats, useActivity, useWorkload, useMoveTask, qk } from "@/services/queries";
import { projectsApi, boardsApi } from "@/services/api";
import { db } from "@/services/mock-db";
import { isTaskDone } from "@/lib/task-state";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { usePermission } from "@/hooks/use-permission";
import type { Task, TaskPriority, ProjectMember } from "@/types/models";

/* ─── helpers ─── */
/* Completion is a property of the task's column, not a status string.
   Synchronous read so it stays usable inside plain array filters. */
const isDone = (t: Task) => isTaskDone(t, db.board(t.boardId));
const ACTIVE_STATUSES = ["in_progress", "fixing", "review", "testing", "verification", "deploy", "investigating"];
const isActive = (t: Task) => ACTIVE_STATUSES.includes(t.status);
const isOverdueTask = (t: Task) =>
  !isTaskDone(t, db.board(t.boardId)) && isOverdue(t.dueDate);

const PRI: Record<TaskPriority, { label: string; cls: string }> = {
  critical: { label: "بحرانی", cls: "bg-red-500/10 text-red-600 dark:text-red-400" },
  high: { label: "بالا", cls: "bg-red-500/10 text-red-600 dark:text-red-400" },
  medium: { label: "متوسط", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  low: { label: "کم", cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  lowest: { label: "خیلی کم", cls: "bg-slate-500/10 text-slate-500 dark:text-slate-400" },
};

const PROJECT_ICONS = [Database, Globe, Smartphone, ShoppingCart, Briefcase, FolderKanban];
const iconFor = (id: string) =>
  PROJECT_ICONS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % PROJECT_ICONS.length];

const WORKLOAD_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#94a3b8", "#f59e0b"];

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

function DashCard({ title, icon, linkHref, sub, area, children, className }: {
  title: string;
  icon?: React.ReactNode;
  linkHref?: string;
  sub?: string;
  area?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col", area, className)}>
      <CardContent className="flex flex-1 flex-col gap-1 p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
            {icon}
            {title}
          </h3>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            {linkHref && (
              <Link href={linkHref} className="text-xs font-medium text-primary hover:underline">
                مشاهده همه
              </Link>
            )}
            {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
          </span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function MiniEmpty({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <EmptyState
      title={title}
      action={action}
      className="flex-1 border-0 bg-transparent py-8 shadow-none"
    />
  );
}

/* ─── page ─── */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const openTask = useUIStore((s) => s.openTask);
  const openCreateTask = useUIStore((s) => s.openCreateTask);
  const { can } = usePermission();
  const move = useMoveTask();

  const { data: projects = [], isLoading: pLoading } = useProjects();
  const myQ = { assigneeId: user?.id ?? "__none__" } as const;
  const { data: myTasksData, isLoading: tLoading } = useTasks(myQ);
  /* Counts come from the aggregate endpoint so they never hit a page ceiling. */
  const { data: myStats } = useTaskStats(myQ);
  const { data: activity = [] } = useActivity();
  const { data: workload = [] } = useWorkload();

  const myTasks = useMemo(() => myTasksData?.items ?? [], [myTasksData]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const projectName = (pid: string) => projectMap.get(pid) ?? "—";

  /* stats */
  const done = useMemo(() => myTasks.filter(isDone), [myTasks]);
  const overdue = useMemo(() => myTasks.filter(isOverdueTask), [myTasks]);
  const active = useMemo(() => myTasks.filter((t) => !isDone(t) && isActive(t)), [myTasks]);
  /* Aggregate totals — the KPI cards and donut read these, not the page. */
  const statDone = myStats?.done ?? done.length;
  const statOverdue = myStats?.overdue ?? overdue.length;
  const statOpen = myStats?.open ?? myTasks.filter((t) => !isDone(t)).length;
  const statTotal = myStats?.total ?? myTasks.length;

  /* today's tasks: open, overdue first */
  const todayTasks = useMemo(
    () =>
      myTasks
        .filter((t) => !isDone(t))
        .sort((a, b) => {
          const ao = isOverdueTask(a) ? 0 : 1;
          const bo = isOverdueTask(b) ? 0 : 1;
          if (ao !== bo) return ao - bo;
          return (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9");
        })
        .slice(0, 5),
    [myTasks],
  );

  /* board columns for the done-checkbox (real move, no fake toggle) */
  const boardQueries = useQueries({
    queries: todayTasks.map((t) => ({
      queryKey: qk.board(t.boardId),
      queryFn: () => boardsApi.get(t.boardId),
      staleTime: 60_000,
    })),
  });
  const toggleDone = (t: Task) => {
    const cols = boardQueries.find((q) => q.data?.id === t.boardId)?.data?.columns ?? [];
    const target = cols.find((c) => c.isDoneColumn);
    if (!target) { openTask(t.id); return; }
    move.mutate({ id: t.id, columnId: target.id });
  };

  /* upcoming deadlines */
  const deadlines = useMemo(
    () =>
      myTasks
        .filter((t) => !isDone(t) && t.dueDate)
        .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
        .slice(0, 4),
    [myTasks],
  );

  /* projects + members */
  const visibleProjects = useMemo(() => projects.slice(0, 4), [projects]);
  const memberQueries = useQueries({
    queries: visibleProjects.map((p) => ({
      queryKey: qk.members(p.id),
      queryFn: () => projectsApi.members(p.id),
    })),
  });
  const membersMap: Record<string, ProjectMember[]> = {};
  visibleProjects.forEach((p, i) => { membersMap[p.id] = memberQueries[i]?.data ?? []; });

  /* donut distribution (partition, precedence: done > overdue > active > backlog) */
  const dist = useMemo(() => {
    const rest = myTasks.filter((t) => !isDone(t) && !isOverdueTask(t) && !isActive(t));
    return [
      { key: "done", label: "انجام‌شده", value: statDone, color: "#22c55e" },
      { key: "active", label: "در حال انجام", value: Math.max(0, statOpen - statOverdue - rest.length), color: "#3b82f6" },
      { key: "overdue", label: "عقب‌افتاده", value: statOverdue, color: "#ef4444" },
      { key: "backlog", label: "بک‌لاگ", value: rest.length, color: "#cbd5e1" },
    ];
  }, [myTasks, statDone, statOpen, statOverdue]);
  const total = statTotal;

  /* workload rows (open tasks per member) */
  const loadRows = useMemo(
    () =>
      workload
        .map((r) => ({ ...r, open: r.assigned - r.completed }))
        .sort((a, b) => b.open - a.open)
        .slice(0, 5),
    [workload],
  );
  const maxLoad = Math.max(1, ...loadRows.map((r) => r.open));

  /* hero */
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "شب بخیر" : hour < 12 ? "صبح بخیر" : hour < 14 ? "ظهر بخیر" : hour < 18 ? "عصر بخیر" : "شب بخیر";
  const firstName = user?.name?.split(" ")[0] ?? "";
  const todayLine = `امروز ${weekdayFa(new Date())}، ${formatDateFa(new Date())}`;

  const loading = pLoading || tLoading;

  const stats = [
    { label: "کل کارها", value: total, icon: <ListTodo className="h-6 w-6" />, chip: "bg-blue-500/10 text-blue-500" },
    { label: "انجام شده", value: done.length, icon: <CheckCircle2 className="h-6 w-6" />, chip: "bg-emerald-500/10 text-emerald-500" },
    { label: "در حال انجام", value: active.length, icon: <Clock className="h-6 w-6" />, chip: "bg-orange-500/10 text-orange-500" },
    { label: "کارهای عقب‌افتاده", value: overdue.length, icon: <AlertTriangle className="h-6 w-6" />, chip: "bg-red-500/10 text-red-500" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero — full-bleed image with overlaid text */}
      <div className="relative min-h-[13rem] overflow-hidden rounded-3xl shadow-card">
        <img src="/images/hero-mountains.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/25 to-transparent" />
        <div className="relative z-10 flex min-h-[13rem] flex-col justify-center p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold text-white drop-shadow sm:text-[1.7rem]">{greeting}، {firstName}!</h1>
          <p className="mt-1.5 text-[13px] text-white/85">{todayLine}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/85">
            <Sprout className="h-4 w-4 text-emerald-300" />
            امیدوارم روز خوبی داشته باشی
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[6.5rem]" />)
          : stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-center justify-between gap-3 p-5">
                  <span>
                    <span className="block text-3xl font-extrabold tnum">{toFaDigits(s.value)}</span>
                    <span className="mt-1 block text-[13px] text-muted-foreground">{s.label}</span>
                  </span>
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", s.chip)}>
                    {s.icon}
                  </span>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 xl:[grid-template-areas:'activity_today_deadlines'_'activity_projects_projects']">
        {/* Today's tasks */}
        <DashCard
          title="کارهای امروز"
          icon={<CheckCircle2 className="h-[18px] w-[18px] text-muted-foreground" />}
          linkHref="/my-tasks"
          sub={todayTasks.length > 0 ? `${toFaDigits(todayTasks.length)} مورد` : undefined}
          area="xl:[grid-area:today]"
        >
          {loading ? (
            <div className="flex flex-col gap-2 py-1">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : todayTasks.length === 0 ? (
            <MiniEmpty
              title="کاری برای امروز نداری"
              action={can("tasks.create") ? <Button size="sm" onClick={() => openCreateTask()}>ایجاد تسک</Button> : undefined}
            />
          ) : (
            todayTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50">
                <button
                  onClick={() => toggleDone(t)}
                  aria-label="انجام شد"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-input bg-card transition-colors hover:border-primary hover:bg-primary/10"
                >
                  {move.isPending ? null : <Check className="h-3.5 w-3.5 opacity-0" />}
                </button>
                <button className="min-w-0 flex-1 text-start" onClick={() => openTask(t.id)}>
                  <span className="block truncate text-[13px] font-medium">{t.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{projectName(t.projectId)}</span>
                </button>
                <span className={cn("shrink-0 rounded-md px-2 py-1 text-[11px] font-medium", PRI[t.priority].cls)}>
                  {PRI[t.priority].label}
                </span>
              </div>
            ))
          )}
        </DashCard>

        {/* Upcoming deadlines */}
        <DashCard
          title="موعدهای نزدیک"
          icon={<CalendarDays className="h-[18px] w-[18px] text-muted-foreground" />}
          linkHref="/my-tasks"
          area="xl:[grid-area:deadlines]"
        >
          {loading ? (
            <div className="flex flex-col gap-2 py-1">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : deadlines.length === 0 ? (
            <MiniEmpty
              title="موعد نزدیکی نیست"
              action={<Button size="sm" variant="outline" asChild><Link href="/calendar">مشاهده تقویم</Link></Button>}
            />
          ) : (
            deadlines.map((t) => {
              const d = new Date(t.dueDate!);
              const today = new Date().toDateString() === d.toDateString();
              const tomorrow = new Date(Date.now() + 86400_000).toDateString() === d.toDateString();
              const past = d.getTime() < Date.now() && !today;
              const chip = today || past ? "امروز" : tomorrow ? "فردا" : formatShortDateFa(d);
              const dot = today || past ? "#ef4444" : tomorrow ? "#f59e0b" : "#cbd5e1";
              return (
                <div key={t.id} className="flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-muted/50">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
                  <button className="min-w-0 flex-1 text-start" onClick={() => openTask(t.id)}>
                    <span className="block truncate text-[13px] font-medium">{t.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{projectName(t.projectId)}</span>
                  </button>
                  <span className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium",
                    today || past ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-muted text-muted-foreground",
                  )}>
                    {chip}
                  </span>
                </div>
              );
            })
          )}
        </DashCard>

        {/* My projects */}
        <DashCard
          title="پروژه‌های من"
          icon={<FolderKanban className="h-[18px] w-[18px] text-muted-foreground" />}
          linkHref="/projects"
          area="md:col-span-2 xl:col-span-1 xl:[grid-area:projects]"
        >
          {loading ? (
            <div className="flex flex-col gap-2 py-1">{[0, 1].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : visibleProjects.length === 0 ? (
            <MiniEmpty
              title="هنوز پروژه‌ای نساخته‌ای"
              action={can("projects.create") ? <Button size="sm" asChild><Link href="/projects">ایجاد پروژه</Link></Button> : undefined}
            />
          ) : (
            visibleProjects.map((p) => {
              const Icon = iconFor(p.id);
              const members = membersMap[p.id] ?? [];
              const statusLabel = PROJECT_STATUS_META[p.status]?.label ?? p.status;
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/50">
                  <Link
                    href={`/projects/${p.id}/overview`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${p.iconColor}1A`, color: p.iconColor }}
                    aria-label={p.name}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                  <Link href={`/projects/${p.id}/overview`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{p.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground tnum">
                      {toFaDigits(members.length)} عضو · {toFaDigits(p.openTasks)} وظیفه باز · {statusLabel}
                    </span>
                  </Link>
                  <span className="hidden w-32 shrink-0 items-center gap-2 sm:flex">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: p.iconColor }} />
                    </span>
                    <span className="w-9 shrink-0 text-[11px] text-muted-foreground tnum">{toFaDigits(p.progress)}٪</span>
                  </span>
                  <span className="hidden shrink-0 items-center md:flex">
                    <span className="flex -space-x-2 space-x-reverse">
                      {members.slice(0, 3).map((m) => (
                        <UserAvatar key={m.userId} name={m.user.name} src={m.user.avatarUrl} size="xs" className="ring-2 ring-card" />
                      ))}
                    </span>
                    {members.length > 3 && (
                      <span className="ms-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground tnum">
                        +{toFaDigits(members.length - 3)}
                      </span>
                    )}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="اقدامات پروژه">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${p.id}/overview`}><LayoutDashboard className="h-4 w-4" /> نمای کلی</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${p.id}/settings`}><SettingsIcon className="h-4 w-4" /> تنظیمات</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </DashCard>

        {/* Activity */}
        <DashCard
          title="آخرین فعالیت‌ها"
          icon={<ActivityIcon className="h-[18px] w-[18px] text-muted-foreground" />}
          sub={activity.length > 0 ? `${toFaDigits(Math.min(6, activity.length))} فعالیت اخیر` : undefined}
          area="md:col-span-2 xl:col-span-1 xl:[grid-area:activity]"
        >
          {activity.length === 0 ? (
            <MiniEmpty title="هنوز فعالیتی ثبت نشده" />
          ) : (
            activity.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 p-2">
                <UserAvatar name={a.actor?.name ?? "؟"} src={a.actor?.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-bold">{a.actor?.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgoFa(a.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {a.actionFa}
                    {a.entityTitle && <span className="font-medium text-foreground/80"> «{a.entityTitle}»</span>}
                  </p>
                </div>
              </div>
            ))
          )}
        </DashCard>
      </div>

      {/* Bottom row */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* Overall progress */}
        <DashCard title="پیشرفت کلی پروژه‌ها" linkHref="/projects">
          {visibleProjects.length === 0 ? (
            <MiniEmpty title="پروژه‌ای نیست" />
          ) : (
            visibleProjects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}/overview`} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50">
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.name}</span>
                <span className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-muted sm:w-32">
                  <span className="block h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: p.iconColor }} />
                </span>
                <span className="w-10 shrink-0 text-end text-xs text-muted-foreground tnum">{toFaDigits(p.progress)}٪</span>
              </Link>
            ))
          )}
        </DashCard>

        {/* Task status donut */}
        <DashCard title="وضعیت وظایف">
          <div className="flex flex-1 items-center gap-4">
            <div className="min-w-0 flex-1">
              {dist.map((d) => (
                <div key={d.key} className="flex items-center gap-2 py-1.5 text-[13px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="min-w-0 flex-1 truncate">{d.label}</span>
                  <span className="font-bold tnum">{toFaDigits(d.value)}</span>
                  <span className="w-11 shrink-0 text-end text-[11px] text-muted-foreground tnum">
                    ({toFaDigits(total ? Math.round((d.value / total) * 100) : 0)}٪)
                  </span>
                </div>
              ))}
            </div>
            <div className="relative h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={total ? dist : [{ key: "empty", value: 1 }]}
                    dataKey="value"
                    nameKey="key"
                    innerRadius="74%"
                    outerRadius="100%"
                    strokeWidth={0}
                    paddingAngle={total ? 3 : 0}
                  >
                    {total
                      ? dist.map((d) => <Cell key={d.key} fill={d.color} />)
                      : <Cell fill="#dfe7e1" />}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold tnum">{toFaDigits(total)}</span>
                <span className="text-[11px] text-muted-foreground">کل وظایف</span>
              </div>
            </div>
          </div>
        </DashCard>

        {/* Team workload */}
        <DashCard title="بار کاری تیم" linkHref="/reports" className="md:col-span-2 xl:col-span-1">
          {loadRows.length === 0 ? (
            <MiniEmpty title="باری ثبت نشده" />
          ) : (
            loadRows.map((r, i) => (
              <div key={r.userId} className="flex items-center gap-3 p-2">
                <UserAvatar name={r.user.name} src={r.user.avatarUrl} size="sm" />
                <span className="w-24 shrink-0 truncate text-[13px] font-medium">{r.user.name}</span>
                <span className="w-6 shrink-0 text-end text-[13px] font-bold tnum">{toFaDigits(r.open)}</span>
                <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.round((r.open / maxLoad) * 100)}%`, backgroundColor: WORKLOAD_COLORS[i % WORKLOAD_COLORS.length] }}
                  />
                </span>
              </div>
            ))
          )}
        </DashCard>
      </div>
    </div>
  );
}
