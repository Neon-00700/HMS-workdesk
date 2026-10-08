"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive, ArrowLeft, Check, ChevronLeft, CircleCheck, Clock,
  Copy, Download, FileText, Flag, Link2, ListChecks, MessageSquare,
  MoreVertical, Paperclip, Pencil, Play, Plus, Send, Square, Star,
  Timer, Trash2, Users, GitBranch, Layers, CopyPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityBadge, ColumnBadge, LabelChip } from "@/components/shared/badges";
import { UserPicker } from "@/components/shared/user-picker";
import { FileUploader } from "@/components/shared/file-uploader";
import { RichTextEditor, SafeHtml } from "@/components/shared/rich-text";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { PRIORITY_META, STREAM_META } from "@/config/constants";
import { formatDateFa, timeAgoFa, isOverdue } from "@/lib/format";
import { formatMinutes, formatBytes, toFaDigits, cn } from "@/lib/utils";
import { downloadStoredFile } from "@/lib/file-store";
import {
  useTask, useTasks, useTaskActions, useUpdateTask, useMoveTask,
  useBoards, useUsers, useMembers, useActivity, useProjects,
} from "@/services/queries";
import { useAuthStore } from "@/stores/auth-store";
import { usePermission } from "@/hooks/use-permission";
import { SEED_LABELS } from "@/services/mock-db";
import type { Task, TaskPriority } from "@/types/models";
import { toast } from "sonner";

export function TaskDetailContent({ taskId, onDeleted }: { taskId: string; onDeleted?: () => void }) {
  const { data: task, isLoading, isError, refetch } = useTask(taskId);
  if (isLoading) return <DetailSkeleton />;
  if (isError || !task) return <ErrorState title="تسک یافت نشد" onRetry={() => refetch()} />;
  return <DetailBody task={task} onDeleted={onDeleted} />;
}

function DetailSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="h-5 w-64 rounded bg-muted" />
      <div className="h-9 w-96 rounded bg-muted" />
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="h-96 rounded-2xl bg-muted" />
        <div className="h-96 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

const TABS = [
  { id: "details", label: "جزئیات", icon: FileText },
  { id: "checklist", label: "چک‌لیست", icon: ListChecks },
  { id: "files", label: "فایل‌ها", icon: Paperclip },
  { id: "comments", label: "کامنت‌ها", icon: MessageSquare },
  { id: "activity", label: "فعالیت‌ها", icon: Clock },
  { id: "time", label: "زمان صرف شده", icon: Timer },
  { id: "deps", label: "وابستگی‌ها", icon: Link2 },
  { id: "subtasks", label: "زیرکارها", icon: Layers },
] as const;

function DetailBody({ task, onDeleted }: { task: Task; onDeleted?: () => void }) {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const { can } = usePermission();
  const canEdit = can("tasks.edit");
  const update = useUpdateTask();
  const move = useMoveTask();
  const actions = useTaskActions();
  const { data: boards = [] } = useBoards(task.projectId);
  const { data: users = [] } = useUsers();
  const { data: members = [] } = useMembers(task.projectId);
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === task.projectId);
  const { data: activity = [] } = useActivity(task.projectId);
  const { data: relRaw } = useTasks({ projectId: task.projectId, pageSize: 200 });

  const [tab, setTab] = useState<string>("details");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(task.description);
  const [comment, setComment] = useState("");
  const [copied, setCopied] = useState(false);

  const board = boards.find((b) => b.id === task.boardId);
  const columns = board?.columns ?? [];
  const column = columns.find((c) => c.id === task.columnId);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const related = useMemo(() => {
    const arr = Array.isArray(relRaw) ? relRaw : (relRaw as { items?: Task[] } | undefined)?.items ?? [];
    return arr.filter((t) => t.id !== task.id && !t.isArchived);
  }, [relRaw, task.id]);
  const taskActivity = useMemo(
    () => (Array.isArray(activity) ? activity.filter((a) => a.entityId === task.id) : []),
    [activity, task.id],
  );
  const memberOpts = useMemo(
    () => members.map((m) => ({ id: m.userId, name: m.user?.name ?? userById.get(m.userId)?.name ?? m.userId })),
    [members, userById],
  );
  const pickerMembers = memberOpts.length > 0 ? memberOpts : undefined;

  const checkDone = task.checklist.filter((c) => c.isDone).length;
  const checkPct = task.checklist.length ? Math.round((checkDone / task.checklist.length) * 100) : 0;
  const subDone = task.subtasks.filter((s) => s.isDone).length;
  const watching = !!me && task.watcherIds.includes(me.id);
  const prio = PRIORITY_META[task.priority];
  const excerpt = useMemo(
    () => task.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 150),
    [task.description],
  );
  const remaining = useMemo(() => {
    if (!task.dueDate) return null;
    const days = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400_000);
    if (days > 0) return { text: `${toFaDigits(days)} روز باقی مانده`, cls: "text-emerald-600" };
    if (days === 0) return { text: "مهلت امروز است", cls: "text-amber-600" };
    return { text: `${toFaDigits(Math.abs(days))} روز گذشته از مهلت`, cls: "text-destructive" };
  }, [task.dueDate]);

  const saveTitle = () => {
    setEditingTitle(false);
    const v = titleDraft.trim();
    if (v && v !== task.title) update.mutate({ id: task.id, patch: { title: v } });
    else setTitleDraft(task.title);
  };
  const saveDesc = () => {
    setEditingDesc(false);
    if (descDraft !== task.description) update.mutate({ id: task.id, patch: { description: descDraft } });
  };
  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(task.key);
      setCopied(true);
      toast.success("کلید تسک کپی شد.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("کپی نشد.");
    }
  };
  const submitComment = () => {
    if (!comment.trim()) return;
    actions.addComment.mutate({ id: task.id, body: comment.trim() });
    setComment("");
  };

  const tabBadge = (id: string): number | null => {
    if (id === "comments") return task.comments.length || null;
    if (id === "subtasks") return task.subtasks.length || null;
    if (id === "files") return task.attachments.length || null;
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center justify-between gap-2">
        <nav className="flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground">
          <Link href={`/projects/${task.projectId}/overview`} className="shrink-0 hover:text-foreground">
            {project?.name ?? "پروژه"}
          </Link>
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <Link href={`/projects/${task.projectId}/board`} className="shrink-0 hover:text-foreground">
            {board?.name ?? "بورد"}
          </Link>
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className="truncate font-medium text-foreground">{task.title}</span>
        </nav>
        <Button variant="ghost" size="icon-sm" asChild title="بازگشت به بورد">
          <Link href={`/projects/${task.projectId}/board`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
      </div>

      {/* ── Title row ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          {column && <ColumnBadge title={column.title} color={column.color} />}
          {task.isBlocked && <Badge variant="destructive">مسدود</Badge>}
          {task.stream && STREAM_META[task.stream] && (
            <Badge variant="outline">{STREAM_META[task.stream].label}</Badge>
          )}
          {editingTitle && canEdit ? (
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
              autoFocus
              className="h-10 min-w-[16rem] text-lg font-extrabold"
            />
          ) : (
            <h1
              className={cn("min-w-0 truncate text-xl font-extrabold sm:text-2xl", canEdit && "cursor-text")}
              onClick={() => { if (canEdit) { setTitleDraft(task.title); setEditingTitle(true); } }}
              title={canEdit ? "برای ویرایش کلیک کنید" : undefined}
            >
              {task.title}
            </h1>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <code className="rounded-lg bg-muted px-2 py-1 font-mono text-xs text-muted-foreground" dir="ltr">{task.key}</code>
          <Button variant="ghost" size="icon-sm" onClick={copyKey} title="کپی کلید تسک">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.duplicate.mutate(task.id, { onSuccess: (copy) => router.push(`/tasks/${copy.id}`) })}>
                <CopyPlus className="h-4 w-4" /> کپی تسک
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.toggleWatcher.mutate(task.id)}>
                <Star className={cn("h-4 w-4", watching && "fill-amber-400 text-amber-400")} />
                {watching ? "توقف دنبال کردن" : "دنبال کردن"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ConfirmDialog
                trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Archive className="h-4 w-4" /> بایگانی تسک</DropdownMenuItem>}
                title="بایگانی تسک"
                description={`«${task.title}» بایگانی می‌شود و از بورد حذف می‌گردد.`}
                confirmLabel="بایگانی"
                onConfirm={() => { actions.remove.mutate(task.id); onDeleted?.(); }}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Labels + priority row ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {task.labels.map((l) => <LabelChip key={l.name} name={l.name} color={l.color} />)}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" className="h-7 w-7 rounded-full" title="مدیریت برچسب‌ها"><Plus className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-auto">
                {SEED_LABELS.map((l) => (
                  <DropdownMenuCheckboxItem
                    key={l.name}
                    checked={task.labels.some((x) => x.name === l.name)}
                    onCheckedChange={(on) => {
                      const labels = on ? [...task.labels, l] : task.labels.filter((x) => x.name !== l.name);
                      update.mutate({ id: task.id, patch: { labels } });
                    }}
                  >
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />{l.name}</span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {canEdit ? (
            <Select value={task.priority} onValueChange={(v) => update.mutate({ id: task.id, patch: { priority: v as TaskPriority } })}>
              <SelectTrigger className={cn("h-8 w-auto gap-1.5 rounded-full border-0 text-[13px] font-semibold", prio.bg, prio.color)}>
                <Flag className="h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <PriorityBadge priority={task.priority} />
          )}
          <Button
            variant="ghost" size="icon-sm"
            onClick={() => actions.toggleWatcher.mutate(task.id)}
            title={watching ? "توقف دنبال کردن" : "دنبال کردن"}
          >
            <Star className={cn("h-5 w-5", watching ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
          </Button>
        </div>
      </div>

      {excerpt && <p className="line-clamp-2 text-[13px] leading-6 text-muted-foreground">{excerpt}</p>}

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-4 overflow-x-auto rounded-none border-b bg-transparent p-0">
          {TABS.map((t) => {
            const badge = tabBadge(t.id);
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="flex shrink-0 items-center gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-1 py-2.5 text-[13px] text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {badge != null && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">{toFaDigits(badge)}</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="grid items-start gap-4 pt-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          {/* ── Sidebar ── */}
          <aside className="flex order-2 flex-col gap-4 xl:order-1">
            <InfoCard
              task={task} columns={columns} boardTitle={board?.name}
              remaining={remaining} pickerMembers={pickerMembers}
              onEditTitle={() => { setTab("details"); setTitleDraft(task.title); setEditingTitle(true); }}
              onGoTime={() => setTab("time")}
            />
            <MembersCard task={task} userById={userById} pickerMembers={pickerMembers} />
            <DepsCard task={task} related={related} userById={userById} />
            <SubtasksCard task={task} onShowAll={() => setTab("subtasks")} />
          </aside>

          {/* ── Panels ── */}
          <div className="order-1 min-w-0 xl:order-2">
            <TabsContent value="details" className="mt-0 flex flex-col gap-4">
              <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[15px] font-bold">توضیحات</h2>
                  {canEdit && !editingDesc && (
                    <Button variant="ghost" size="sm" onClick={() => { setDescDraft(task.description); setEditingDesc(true); }}>
                      <Pencil className="h-4 w-4" /> ویرایش
                    </Button>
                  )}
                </div>
                {editingDesc ? (
                  <div className="flex flex-col gap-2">
                    <RichTextEditor value={descDraft} onChange={setDescDraft} minHeight={140} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveDesc}>ذخیره</Button>
                      <Button size="sm" variant="outline" onClick={() => { setDescDraft(task.description); setEditingDesc(false); }}>انصراف</Button>
                    </div>
                  </div>
                ) : task.description ? (
                  <SafeHtml html={task.description} className="prose-sm" />
                ) : (
                  <p className="text-[13px] text-muted-foreground">توضیحی ثبت نشده است.</p>
                )}
              </section>
              <ChecklistPanel task={task} users={users} />
            </TabsContent>

            <TabsContent value="checklist" className="mt-0">
              <ChecklistPanel task={task} users={users} />
            </TabsContent>

            <TabsContent value="files" className="mt-0">
              <FilesPanel task={task} userById={userById} />
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
                <h2 className="mb-3 text-[15px] font-bold">کامنت‌ها ({toFaDigits(task.comments.length)})</h2>
                <div className="flex flex-col gap-3">
                  {task.comments.length === 0 && <EmptyState title="نظری ثبت نشده است" description="اولین نظر را بنویسید." />}
                  {task.comments.map((c) => (
                    <div key={c.id} className="flex gap-2.5 rounded-xl bg-muted/50 p-3">
                      <UserAvatar name={c.author?.name ?? "?"} src={c.author?.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{c.author?.name ?? "کاربر"}</span>
                          {timeAgoFa(c.createdAt)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="نظر خود را بنویسید… (با @ می‌توانید همکاران را نام ببرید)"
                    className="min-h-[2.5rem]"
                    rows={2}
                  />
                  <Button onClick={submitComment} disabled={!comment.trim()} className="shrink-0">
                    <Send className="h-4 w-4" /> ارسال
                  </Button>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
                <h2 className="mb-3 text-[15px] font-bold">تاریخچه فعالیت‌های تسک</h2>
                {taskActivity.length === 0 ? (
                  <EmptyState title="فعالیتی ثبت نشده است" />
                ) : (
                  <ol className="relative flex flex-col gap-4 border-s-2 border-muted ps-4">
                    {taskActivity.map((a) => (
                      <li key={a.id} className="relative">
                        <span className="absolute -start-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                        <p className="text-[13px]">
                          <span className="font-semibold">{a.actor?.name ?? "کاربر"}</span>{" "}
                          <span className="text-muted-foreground">{a.actionFa}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgoFa(a.createdAt)}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </TabsContent>

            <TabsContent value="time" className="mt-0">
              <TimePanel task={task} />
            </TabsContent>

            <TabsContent value="deps" className="mt-0">
              <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
                <h2 className="mb-3 text-[15px] font-bold">وابستگی‌ها</h2>
                <DepsBody task={task} related={related} userById={userById} />
              </section>
            </TabsContent>

            <TabsContent value="subtasks" className="mt-0">
              <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
                <h2 className="mb-3 text-[15px] font-bold">
                  زیرکارها ({toFaDigits(subDone)} از {toFaDigits(task.subtasks.length)} انجام شده)
                </h2>
                <SubtasksBody task={task} />
              </section>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

/* ─── Sidebar: task info ─── */
function InfoCard({ task, columns, boardTitle, remaining, pickerMembers, onEditTitle, onGoTime }: {
  task: Task;
  columns: { id: string; title: string; color: string }[];
  boardTitle?: string;
  remaining: { text: string; cls: string } | null;
  pickerMembers?: { name: string; id: string }[];
  onEditTitle: () => void;
  onGoTime: () => void;
}) {
  const { can } = usePermission();
  const canEdit = can("tasks.edit");
  const update = useUpdateTask();
  const move = useMoveTask();
  const { data: users = [] } = useUsers();
  const col = columns.find((c) => c.id === task.columnId);
  const prio = PRIORITY_META[task.priority];

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">اطلاعات وظیفه</h2>
        {canEdit && (
          <Button variant="ghost" size="icon-sm" onClick={onEditTitle} title="ویرایش عنوان"><Pencil className="h-4 w-4" /></Button>
        )}
      </div>
      <dl className="flex flex-col gap-3 text-[13px]">
        <SideRow label="وضعیت">
          {canEdit ? (
            <Select value={task.columnId} onValueChange={(v) => move.mutate({ id: task.id, columnId: v })}>
              <SelectTrigger
                className="h-8 w-full gap-1.5 rounded-full border-0 text-[13px] font-semibold"
                style={col ? { backgroundColor: `${col.color}1a`, color: col.color } : undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : col ? <ColumnBadge title={col.title} color={col.color} /> : <span>—</span>}
        </SideRow>
        <SideRow label="اولویت">
          {canEdit ? (
            <Select value={task.priority} onValueChange={(v) => update.mutate({ id: task.id, patch: { priority: v as TaskPriority } })}>
              <SelectTrigger className={cn("h-8 w-full gap-1.5 rounded-full border-0 text-[13px] font-semibold", prio.bg, prio.color)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : <PriorityBadge priority={task.priority} />}
        </SideRow>
        <SideRow label="مسئول انجام">
          {canEdit ? (
            <UserPicker multiple value={task.assigneeIds} membersOnly={pickerMembers} onChange={(v) => update.mutate({ id: task.id, patch: { assigneeIds: (v as string[] | undefined) ?? [] } })} />
          ) : (
            <AssigneeAvatars ids={task.assigneeIds} users={users} />
          )}
        </SideRow>
        <SideRow label="ناظر">
          {canEdit ? (
            <UserPicker value={task.reviewerId} membersOnly={pickerMembers} onChange={(v) => update.mutate({ id: task.id, patch: { reviewerId: (v as string | undefined) ?? undefined } })} placeholder="بدون ناظر" />
          ) : task.reviewerId ? (
            <AssigneeAvatars ids={[task.reviewerId]} users={users} />
          ) : <span className="text-muted-foreground">—</span>}
        </SideRow>
        <SideRow label="تاریخ شروع">
          {canEdit ? (
            <Input type="date" value={task.startDate?.slice(0, 10) ?? ""} onChange={(e) => update.mutate({ id: task.id, patch: { startDate: e.target.value || undefined } })} className="h-9" />
          ) : <span>{task.startDate ? formatDateFa(task.startDate) : "—"}</span>}
        </SideRow>
        <SideRow label="مهلت انجام">
          {canEdit ? (
            <div className="flex w-full flex-col gap-1">
              <Input type="date" value={task.dueDate?.slice(0, 10) ?? ""} onChange={(e) => update.mutate({ id: task.id, patch: { dueDate: e.target.value || undefined } })} className="h-9" />
              {remaining && <span className={cn("text-xs", remaining.cls)}>{remaining.text}</span>}
            </div>
          ) : (
            <span className={cn(task.dueDate && isOverdue(task.dueDate) && "text-destructive")}>
              {task.dueDate ? formatDateFa(task.dueDate) : "—"}
            </span>
          )}
        </SideRow>
        <SideRow label="زمان تخمینی">
          {canEdit ? (
            <div className="flex w-full items-center gap-1.5">
              <Input
                type="number" min={0} step={0.5} key={task.id}
                defaultValue={(task.estimateMinutes ?? 0) / 60 || ""}
                placeholder="۰"
                onBlur={(e) => {
                  const h = Number(e.target.value);
                  if (!Number.isNaN(h)) update.mutate({ id: task.id, patch: { estimateMinutes: Math.round(h * 60) } });
                }}
                className="h-9"
              />
              <span className="shrink-0 text-xs text-muted-foreground">ساعت</span>
            </div>
          ) : <span>{task.estimateMinutes ? formatMinutes(task.estimateMinutes) : "—"}</span>}
        </SideRow>
        <SideRow label="زمان صرف شده">
          <span className="flex items-center gap-1.5">
            {formatMinutes(task.spentMinutes ?? 0)}
            <button onClick={onGoTime} className="text-xs text-primary hover:underline">ثبت زمان</button>
          </span>
        </SideRow>
        <SideRow label="پیشرفت">
          {canEdit ? (
            <div className="flex w-full items-center gap-1.5">
              <Input
                type="number" min={0} max={100} key={`p-${task.id}`}
                defaultValue={task.progress}
                onBlur={(e) => {
                  const v = Math.max(0, Math.min(100, Number(e.target.value)));
                  if (!Number.isNaN(v)) update.mutate({ id: task.id, patch: { progress: v } });
                }}
                className="h-9"
              />
              <span className="shrink-0 text-xs text-muted-foreground">٪</span>
            </div>
          ) : <span>{toFaDigits(task.progress)}٪</span>}
        </SideRow>
        <SideRow label="بورد">
          <Link href={`/projects/${task.projectId}/board`} className="text-primary hover:underline">{boardTitle ?? "—"}</Link>
        </SideRow>
        <SideRow label="ستون">
          {col ? <ColumnBadge title={col.title} color={col.color} /> : <span>—</span>}
        </SideRow>
      </dl>
      <p className="mt-3 border-t pt-2.5 text-[11px] leading-5 text-muted-foreground">
        ایجاد {formatDateFa(task.createdAt)}
        {task.creator ? ` · ${task.creator.name}` : ""}
      </p>
    </section>
  );
}

function SideRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center justify-end">{children}</dd>
    </div>
  );
}

function AssigneeAvatars({ ids, users }: { ids: string[]; users: { id: string; name: string; avatarUrl?: string }[] }) {
  if (!ids.length) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex -space-x-2 space-x-reverse">
      {ids.map((id) => {
        const u = users.find((x) => x.id === id);
        return <UserAvatar key={id} name={u?.name ?? "?"} src={u?.avatarUrl} size="sm" className="ring-2 ring-card" />;
      })}
    </span>
  );
}

/* ─── Sidebar: members ─── */
function MembersCard({ task, userById, pickerMembers }: {
  task: Task;
  userById: Map<string, { id: string; name: string; avatarUrl?: string }>;
  pickerMembers?: { name: string; id: string }[];
}) {
  const { can } = usePermission();
  const canEdit = can("tasks.edit");
  const update = useUpdateTask();
  const [adding, setAdding] = useState(false);
  const ids = [...new Set([...task.assigneeIds, ...(task.reviewerId ? [task.reviewerId] : [])])];

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold"><Users className="h-4 w-4" /> اعضا و همکاران</h2>
        <Link href={`/projects/${task.projectId}/team`} className="text-xs text-primary hover:underline">مدیریت</Link>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {ids.length === 0 && <span className="text-xs text-muted-foreground">عضوی ثبت نشده است.</span>}
        {ids.map((id) => {
          const u = userById.get(id);
          return <span key={id} title={u?.name}><UserAvatar name={u?.name ?? "?"} src={u?.avatarUrl} size="md" /></span>;
        })}
        {canEdit && (
          <Button variant="outline" size="icon-sm" className="h-9 w-9 rounded-full" onClick={() => setAdding((v) => !v)} title="افزودن مجری">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      {adding && canEdit && (
        <div className="mt-2">
          <UserPicker
            multiple value={task.assigneeIds} membersOnly={pickerMembers} placeholder="افزودن مجری…"
            onChange={(v) => update.mutate({ id: task.id, patch: { assigneeIds: (v as string[] | undefined) ?? [] } })}
          />
        </div>
      )}
    </section>
  );
}

/* ─── Sidebar + tab: dependencies ─── */
function DepsCard({ task, related, userById }: {
  task: Task;
  related: Task[];
  userById: Map<string, { id: string; name: string; avatarUrl?: string }>;
}) {
  const { can } = usePermission();
  const kinds = [...new Set(task.dependencies.map((d) => d.kind))];
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold"><GitBranch className="h-4 w-4" /> وابستگی‌ها</h2>
        {kinds.length > 0 && can("tasks.manage_dependencies") && (
          <span className="text-[11px] text-muted-foreground">{kinds.map((k) => DEP_KIND_FA[k] ?? k).join("، ")}</span>
        )}
      </div>
      <DepsBody task={task} related={related} userById={userById} compact />
    </section>
  );
}

const DEP_KIND_FA: Record<string, string> = {
  blocks: "مسدود می‌کند", blocked_by: "مسدود شده توسط", depends_on: "وابسته به", related_to: "مرتبط با",
};

function DepsBody({ task, related, userById, compact }: {
  task: Task;
  related: Task[];
  userById: Map<string, { id: string; name: string; avatarUrl?: string }>;
  compact?: boolean;
}) {
  const { can } = usePermission();
  const actions = useTaskActions();
  const [pick, setPick] = useState("");
  const [kind, setKind] = useState<"blocks" | "blocked_by" | "depends_on" | "related_to">("depends_on");
  const blockedOthers = related.filter((t) => t.blockedBy.includes(task.id));

  return (
    <div>
      <div className="flex flex-col gap-1.5">
        {task.dependencies.length === 0 && <p className="text-xs text-muted-foreground">وابستگی ثبت نشده است.</p>}
        {task.dependencies.map((d) => (
          <DepRow key={d.id} taskId={task.id} dep={d} userById={userById} />
        ))}
      </div>
      {can("tasks.manage_dependencies") && (
        <div className={cn("mt-2 flex gap-2", compact && "flex-col")}>
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="h-9"><SelectValue placeholder="افزودن وابستگی…" /></SelectTrigger>
            <SelectContent>
              {related.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">{t.key}</span> {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DEP_KIND_FA).map(([k, fa]) => <SelectItem key={k} value={k}>{fa}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="sm" className="h-9 shrink-0" disabled={!pick}
              onClick={() => { actions.addDependency.mutate({ id: task.id, depId: pick, kind }); setPick(""); }}
            >
              افزودن
            </Button>
          </div>
        </div>
      )}
      {blockedOthers.length > 0 && (
        <div className="mt-2 rounded-lg bg-warning/10 p-2 text-xs text-warning">
          <p>این تسک {toFaDigits(blockedOthers.length)} تسک دیگر را مسدود کرده است:</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {blockedOthers.map((t) => (
              <Link key={t.id} href={`/tasks/${t.id}`} className="rounded bg-warning/15 px-1.5 py-0.5 font-mono hover:underline" dir="ltr">
                {t.key}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DepRow({ taskId, dep, userById }: {
  taskId: string;
  dep: Task["dependencies"][number];
  userById: Map<string, { id: string; name: string; avatarUrl?: string }>;
}) {
  const { data: depTask } = useTask(dep.dependsOnTaskId);
  const actions = useTaskActions();
  const { can } = usePermission();
  const firstAssignee = depTask?.assigneeIds?.[0] ? userById.get(depTask.assigneeIds[0]) : undefined;
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-[13px]">
      <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Link href={`/tasks/${dep.dependsOnTaskId}`} className="min-w-0 flex-1 truncate hover:text-primary">
        <span className="me-1 font-mono text-[11px] text-muted-foreground" dir="ltr">{depTask?.key}</span>
        {depTask?.title ?? "…"}
      </Link>
      {firstAssignee && <UserAvatar name={firstAssignee.name} src={firstAssignee.avatarUrl} size="sm" />}
      <span className="shrink-0 text-[11px] text-muted-foreground">{DEP_KIND_FA[dep.kind] ?? dep.kind}</span>
      {can("tasks.manage_dependencies") && (
        <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => actions.removeDependency.mutate({ id: taskId, dep: dep.id })} title="حذف وابستگی">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      )}
    </div>
  );
}

/* ─── Sidebar: subtasks mini ─── */
function SubtasksCard({ task, onShowAll }: { task: Task; onShowAll: () => void }) {
  const actions = useTaskActions();
  const { can } = usePermission();
  const canEdit = can("tasks.edit");
  const [val, setVal] = useState("");
  const done = task.subtasks.filter((s) => s.isDone).length;
  const add = () => {
    if (!val.trim()) return;
    actions.addSubtask.mutate({ id: task.id, title: val.trim() });
    setVal("");
  };
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <Layers className="h-4 w-4" /> زیرکارها
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {toFaDigits(done)}/{toFaDigits(task.subtasks.length)}
          </span>
        </h2>
        {task.subtasks.length > 3 && (
          <button onClick={onShowAll} className="text-xs text-primary hover:underline">مشاهده همه</button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {task.subtasks.length === 0 && <p className="text-xs text-muted-foreground">زیرکاری ثبت نشده است.</p>}
        {task.subtasks.slice(0, 3).map((s) => (
          <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-[13px]">
            <Checkbox checked={s.isDone} onCheckedChange={() => actions.toggleSubtask.mutate({ id: task.id, st: s.id })} disabled={!canEdit} />
            <span className={cn("min-w-0 flex-1 truncate", s.isDone && "text-muted-foreground line-through")}>{s.title}</span>
          </label>
        ))}
      </div>
      {canEdit && (
        <div className="mt-2 flex gap-2">
          <Input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="زیرکار جدید…" className="h-9" />
          <Button size="sm" className="h-9 shrink-0" onClick={add} disabled={!val.trim()}><Plus className="h-4 w-4" /></Button>
        </div>
      )}
    </section>
  );
}

function SubtasksBody({ task }: { task: Task }) {
  const actions = useTaskActions();
  const { can } = usePermission();
  const canEdit = can("tasks.edit");
  const [val, setVal] = useState("");
  const add = () => {
    if (!val.trim()) return;
    actions.addSubtask.mutate({ id: task.id, title: val.trim() });
    setVal("");
  };
  return (
    <div>
      <div className="flex flex-col gap-1.5">
        {task.subtasks.length === 0 && <EmptyState title="زیرکاری ثبت نشده است" />}
        {task.subtasks.map((s) => (
          <div key={s.id} className="group flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-[13px]">
            <Checkbox checked={s.isDone} onCheckedChange={() => actions.toggleSubtask.mutate({ id: task.id, st: s.id })} disabled={!canEdit} />
            <span className={cn("min-w-0 flex-1", s.isDone && "text-muted-foreground line-through")}>{s.title}</span>
            {canEdit && (
              <Button variant="ghost" size="icon-sm" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => actions.deleteSubtask.mutate({ id: task.id, st: s.id })} title="حذف">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="mt-2 flex gap-2">
          <Input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="زیرکار جدید…" className="h-9" />
          <Button size="sm" className="h-9 shrink-0" onClick={add} disabled={!val.trim()}>افزودن</Button>
        </div>
      )}
    </div>
  );
}

/* ─── Checklist (details tab + checklist tab) ─── */
function ChecklistPanel({ task, users }: {
  task: Task;
  users: { id: string; name: string; avatarUrl?: string }[];
}) {
  const actions = useTaskActions();
  const { can } = usePermission();
  const canEdit = can("tasks.edit");
  const [val, setVal] = useState("");
  const done = task.checklist.filter((c) => c.isDone).length;
  const pct = task.checklist.length ? Math.round((done / task.checklist.length) * 100) : 0;
  const add = () => {
    if (!val.trim()) return;
    actions.addChecklist.mutate({ id: task.id, text: val.trim() });
    setVal("");
  };

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold"><ListChecks className="h-4 w-4" /> چک‌لیست</h2>
        <span className="text-xs text-muted-foreground">
          {toFaDigits(done)} از {toFaDigits(task.checklist.length)} · {toFaDigits(pct)}٪
        </span>
      </div>
      {task.checklist.length > 0 && <Progress value={pct} className="mb-3 h-1.5" />}
      <div className="flex flex-col gap-1.5">
        {task.checklist.length === 0 && <p className="text-[13px] text-muted-foreground">موردی ثبت نشده است.</p>}
        {task.checklist.map((c) => {
          const assignee = users.find((u) => u.id === c.assigneeId);
          return (
            <div key={c.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-muted/50">
              <Checkbox checked={c.isDone} onCheckedChange={() => actions.toggleChecklist.mutate({ id: task.id, item: c.id })} disabled={!canEdit} />
              <span className={cn("min-w-0 flex-1 text-[13px]", c.isDone && "text-muted-foreground line-through")}>{c.text}</span>
              {canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="shrink-0 rounded-full" title={assignee ? `مسئول: ${assignee.name}` : "تعیین مسئول"}>
                      {assignee ? (
                        <UserAvatar name={assignee.name} src={assignee.avatarUrl} size="sm" className="ring-2 ring-card" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed text-muted-foreground hover:border-primary hover:text-primary">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-64 w-52 overflow-auto">
                    <DropdownMenuItem onClick={() => actions.assignChecklist.mutate({ id: task.id, item: c.id, assigneeId: undefined })}>
                      <span className="text-muted-foreground">بدون مسئول</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {users.map((u) => (
                      <DropdownMenuItem key={u.id} onClick={() => actions.assignChecklist.mutate({ id: task.id, item: c.id, assigneeId: u.id })}>
                        <UserAvatar name={u.name} src={u.avatarUrl} size="sm" />
                        <span className="truncate">{u.name}</span>
                        {u.id === c.assigneeId && <Check className="ms-auto h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : assignee ? (
                <UserAvatar name={assignee.name} src={assignee.avatarUrl} size="sm" />
              ) : null}
              {canEdit && (
                <Button variant="ghost" size="icon-sm" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => actions.deleteChecklist.mutate({ id: task.id, item: c.id })} title="حذف">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {canEdit && (
        <div className="mt-2 flex gap-2">
          <Input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="مورد جدید به چک‌لیست…" className="h-9" />
          <Button size="sm" className="h-9 shrink-0" onClick={add} disabled={!val.trim()}><Plus className="h-4 w-4" /> افزودن</Button>
        </div>
      )}
    </section>
  );
}

/* ─── Files ─── */
function FilesPanel({ task, userById }: {
  task: Task;
  userById: Map<string, { id: string; name: string; avatarUrl?: string }>;
}) {
  const { can } = usePermission();
  const canEdit = can("tasks.edit");
  const actions = useTaskActions();
  const [showUpload, setShowUpload] = useState(false);

  const download = (attId: string, fileName: string) => {
    const ok = downloadStoredFile(attId, fileName);
    if (!ok) toast.warning("فایل در این نشست موجود نیست؛ پس از رفرش صفحه، محتوای فایل‌ها پاک می‌شود.");
  };

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold"><Paperclip className="h-4 w-4" /> فایل‌ها ({toFaDigits(task.attachments.length)})</h2>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setShowUpload((v) => !v)}>
            <Plus className="h-4 w-4" /> افزودن فایل
          </Button>
        )}
      </div>
      {showUpload && canEdit && (
        <div className="mb-3">
          <FileUploader
            policyKey="taskAttachment" multiple
            onUploaded={async (files) => {
              for (const f of files) {
                await actions.addAttachment.mutateAsync({ id: task.id, meta: f });
              }
              setShowUpload(false);
            }}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {task.attachments.length === 0 && <EmptyState title="فایلی پیوست نشده است" />}
        {task.attachments.map((a) => (
          <div key={a.id} className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{a.fileName}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatBytes(a.sizeBytes)} · {userById.get(a.uploadedById)?.name ?? "کاربر"} · {formatDateFa(a.createdAt)}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => download(a.id, a.fileName)} title="دانلود">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Time tracking ─── */
function TimePanel({ task }: { task: Task }) {
  const me = useAuthStore((s) => s.user);
  const { can } = usePermission();
  const canEdit = can("tasks.edit");
  const actions = useTaskActions();
  const [logMin, setLogMin] = useState("");
  const [logNote, setLogNote] = useState("");
  const running = task.timeEntries.find((e) => !e.endedAt && e.userId === me?.id);
  const myTotal = task.timeEntries.filter((e) => e.userId === me?.id).reduce((s, e) => s + (e.minutes ?? 0), 0);

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold"><Timer className="h-4 w-4" /> زمان صرف شده</h2>
        {canEdit && (
          running ? (
            <Button size="sm" variant="destructive" onClick={() => actions.stopTimer.mutate({ id: task.id, entry: running.id })}>
              <Square className="h-4 w-4" /> توقف تایمر
            </Button>
          ) : (
            <Button size="sm" onClick={() => actions.startTimer.mutate(task.id)}>
              <Play className="h-4 w-4" /> شروع تایمر
            </Button>
          )
        )}
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/50 p-2.5">
          <p className="text-base font-extrabold">{formatMinutes(task.spentMinutes ?? 0)}</p>
          <p className="text-[11px] text-muted-foreground">مجموع تسک</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-2.5">
          <p className="text-base font-extrabold">{formatMinutes(myTotal)}</p>
          <p className="text-[11px] text-muted-foreground">سهم من</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-2.5">
          <p className="text-base font-extrabold">{task.estimateMinutes ? formatMinutes(task.estimateMinutes) : "—"}</p>
          <p className="text-[11px] text-muted-foreground">تخمین</p>
        </div>
      </div>
      {running && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          تایمر شما از {timeAgoFa(running.startedAt)} در حال اجراست.
        </p>
      )}
      {canEdit && (
        <div className="mb-3 flex gap-2">
          <Input value={logMin} onChange={(e) => setLogMin(e.target.value)} placeholder="دقیقه" type="number" min={1} className="h-9 w-24" />
          <Input value={logNote} onChange={(e) => setLogNote(e.target.value)} placeholder="توضیح (اختیاری)…" className="h-9" />
          <Button
            size="sm" variant="outline" className="h-9 shrink-0"
            onClick={() => {
              const m = Number(logMin);
              if (m > 0) {
                actions.logTime.mutate({ id: task.id, minutes: m, note: logNote.trim() || undefined });
                setLogMin(""); setLogNote("");
              }
            }}
          >
            ثبت دستی
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {task.timeEntries.length === 0 && <p className="text-[13px] text-muted-foreground">زمانی ثبت نشده است.</p>}
        {task.timeEntries.map((e) => (
          <div key={e.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px]">
            <CircleCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              {e.user?.name ?? "کاربر"} · {timeAgoFa(e.startedAt)}
              {e.note ? ` · ${e.note}` : ""}
            </span>
            <span className="shrink-0 font-semibold">{e.minutes != null ? formatMinutes(e.minutes) : "در حال اجرا"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
