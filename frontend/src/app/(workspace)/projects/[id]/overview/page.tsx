"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Flag, AlertTriangle, Clock, FileText, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/ui/avatar";
import { SectionTitle } from "@/components/shared/page-header";
import { TaskCard } from "@/components/shared/task-card";
import { OverviewCards, StreamProgress, WorkloadTable, BurnChart } from "@/features/reports/report-widgets";
import { EmptyState } from "@/components/shared/states";
import { formatShortDateFa, timeAgoFa } from "@/lib/format";
import { toFaDigits } from "@/lib/utils";
import {
  useTasks, useMilestones, useActivity, useFiles, useConversations, useProject, useEpics,
} from "@/services/queries";
import { db } from "@/services/mock-db";
import { isTaskDone } from "@/lib/task-state";
import { useUIStore } from "@/stores/ui-store";

export default function ProjectOverviewPage() {
  const { id } = useParams() as { id: string };
  const openTask = useUIStore((s) => s.openTask);
  const { data: project } = useProject(id);
  const { data: tasksData } = useTasks({ projectId: id, pageSize: 200 });
  const { data: milestones = [] } = useMilestones(id);
  const { data: activity = [] } = useActivity(id);
  const { data: files = [] } = useFiles(id);
  const { data: convs = [] } = useConversations();
  const { data: epics = [] } = useEpics(id);

  const tasks = tasksData?.items ?? [];
  const blocked = tasks.filter((t) => t.isBlocked).slice(0, 3);
  const isDone = (t: (typeof tasks)[number]) => isTaskDone(t, db.board(t.boardId));
  const overdue = tasks.filter((t) => !isDone(t) && t.dueDate && new Date(t.dueDate).getTime() < Date.now()).slice(0, 4);
  const dueSoon = tasks.filter((t) => {
    if (!t.dueDate || isDone(t)) return false;
    const dt = new Date(t.dueDate).getTime() - Date.now();
    return dt > 0 && dt < 72 * 3600_000;
  }).slice(0, 4);
  const recentFiles = files.slice(0, 4);
  const projectConvs = convs.filter((c) => c.projectId === id).slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <OverviewCards projectId={id} />

      {/* Bottlenecks */}
      {(blocked.length > 0 || overdue.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {blocked.length > 0 && (
            <Card className="border-warning/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4" /> گلوگاه‌ها — تسک‌های مسدود
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 pt-0 sm:grid-cols-1">
                {blocked.map((t) => <TaskCard key={t.id} task={t} compact onOpen={() => openTask(t.id)} />)}
              </CardContent>
            </Card>
          )}
          {overdue.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                  <Clock className="h-4 w-4" /> معوق‌ها — نیازمند اقدام فوری
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 pt-0">
                {overdue.map((t) => (
                  <button key={t.id} onClick={() => openTask(t.id)} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-[13px] hover:bg-muted/60">
                    <span className="truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-destructive">{t.dueDate && formatShortDateFa(t.dueDate)}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <BurnChart projectId={id} />
          <div className="grid gap-6 lg:grid-cols-2">
            <StreamProgress projectId={id} />
            {/* Milestones */}
            <Card>
              <CardHeader>
                <CardTitle>مایلستون‌ها</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${m.isDone ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      <Flag className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{m.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Progress value={m.progress} className="h-1.5" />
                        <span className="shrink-0 text-[11px] text-muted-foreground">{formatShortDateFa(m.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {milestones.length === 0 && <p className="text-[13px] text-muted-foreground">مایلستونی ثبت نشده است.</p>}
              </CardContent>
            </Card>
          </div>

          {/* Epics */}
          {epics.length > 0 && (
            <section>
              <SectionTitle title="فیچرها / اپیک‌ها" description="گروه‌بندی کارها در سطح فیچر." />
              <div className="grid gap-3 sm:grid-cols-2">
                {epics.map((e) => (
                  <Card key={e.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                        <p className="flex-1 truncate text-sm font-semibold">{e.title}</p>
                        <span className="text-xs text-muted-foreground tnum">{toFaDigits(e.progress)}٪</span>
                      </div>
                      {e.description && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{e.description}</p>}
                      <Progress value={e.progress} className="mt-2 h-1.5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <WorkloadTable projectId={id} />
        </div>

        <div className="flex flex-col gap-6">
          {/* Due soon */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ددلاین‌های نزدیک</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-0">
              {dueSoon.map((t) => (
                <button key={t.id} onClick={() => openTask(t.id)} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-[13px] hover:bg-muted/60">
                  <span className="truncate">{t.title}</span>
                  <Badge variant="warning" className="shrink-0">{t.dueDate && formatShortDateFa(t.dueDate)}</Badge>
                </button>
              ))}
              {dueSoon.length === 0 && <p className="p-2 text-xs text-muted-foreground">ددلاین نزدیکی نیست.</p>}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">فعالیت‌های اخیر</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link href={`/projects/${id}/activity`}>همه <ArrowLeft className="h-3.5 w-3.5" /></Link></Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {activity.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <UserAvatar name={a.actor?.name ?? "?"} size="sm" />
                  <div className="min-w-0 text-xs leading-5">
                    <span className="font-semibold">{a.actor?.name}</span> <span className="text-muted-foreground">{a.actionFa}</span>{" "}
                    {a.entityTitle && <span className="font-medium">«{a.entityTitle}»</span>}
                    <p className="text-[11px] text-muted-foreground">{timeAgoFa(a.createdAt)}</p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-xs text-muted-foreground">فعالیتی ثبت نشده است.</p>}
            </CardContent>
          </Card>

          {/* Recent files */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">فایل‌های اخیر</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link href={`/projects/${id}/files`}>همه <ArrowLeft className="h-3.5 w-3.5" /></Link></Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-0">
              {recentFiles.map((f) => (
                <Link key={f.id} href={`/projects/${id}/files`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-muted/60">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{f.fileName}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgoFa(f.updatedAt)}</span>
                </Link>
              ))}
              {recentFiles.length === 0 && <p className="p-2 text-xs text-muted-foreground">فایلی نیست.</p>}
            </CardContent>
          </Card>

          {/* Chat preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">گفتگوی پروژه</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link href={`/projects/${id}/chat`}>ورود <ArrowLeft className="h-3.5 w-3.5" /></Link></Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 pt-0">
              {projectConvs.map((c) => (
                <Link key={c.id} href={`/projects/${id}/chat`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-muted/60">
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium"># {c.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{c.lastMessage?.body ?? "بدون پیام"}</span>
                  </span>
                  {c.unreadCount > 0 && <Badge className="tnum">{toFaDigits(c.unreadCount)}</Badge>}
                </Link>
              ))}
              {projectConvs.length === 0 && <p className="p-2 text-xs text-muted-foreground">کانالی نیست.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
