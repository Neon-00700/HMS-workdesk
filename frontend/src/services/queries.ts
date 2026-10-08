/* ─── TanStack Query hooks — the ONLY way UI reads server state ─── */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/types/models";
import { toast } from "sonner";
import {
  authApi, usersApi, rolesApi, projectsApi, boardsApi, tasksApi,
  chatApi, notificationsApi, calendarApi, filesApi, reportsApi, searchApi,
  type TaskQuery, ApiError,
} from "./api";

export const qk = {
  me: ["me"] as const,
  users: ["users"] as const,
  user: (id: string) => ["users", id] as const,
  roles: ["roles"] as const,
  projects: ["projects"] as const,
  taskStats: (q: TaskQuery) => ["task-stats", q] as const,
  project: (id: string) => ["projects", id] as const,
  members: (pid: string) => ["projects", pid, "members"] as const,
  milestones: (pid: string) => ["projects", pid, "milestones"] as const,
  epics: (pid: string) => ["projects", pid, "epics"] as const,
  activity: (pid?: string) => ["activity", pid ?? "all"] as const,
  boards: (pid: string) => ["projects", pid, "boards"] as const,
  board: (id: string) => ["boards", id] as const,
  tasks: (q: TaskQuery) => ["tasks", q] as const,
  task: (id: string) => ["tasks", id] as const,
  boardTasks: (bid: string) => ["boards", bid, "tasks"] as const,
  conversations: ["chat", "conversations"] as const,
  messages: (cid: string) => ["chat", cid, "messages"] as const,
  notifications: ["notifications"] as const,
  events: (pid?: string) => ["events", pid ?? "all"] as const,
  files: (pid?: string) => ["files", pid ?? "all"] as const,
  workload: (pid?: string) => ["reports", "workload", pid ?? "all"] as const,
  burn: (pid: string) => ["reports", "burn", pid] as const,
  streams: (pid: string) => ["reports", "streams", pid] as const,
  trend: (pid?: string) => ["reports", "trend", pid ?? "all"] as const,
  projectStats: ["reports", "project-stats"] as const,
  overview: (pid?: string) => ["reports", "overview", pid ?? "all"] as const,
  search: (q: string) => ["search", q] as const,
};

function errMsg(e: unknown, fallback = "خطایی رخ داد."): string {
  if (e instanceof ApiError) return e.message;
  return fallback;
}

/* ── users/roles ── */
export const useUsers = () => useQuery({ queryKey: qk.users, queryFn: usersApi.list });
export const useRoles = () => useQuery({ queryKey: qk.roles, queryFn: rolesApi.list });
export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.users }); toast.success("کاربر با موفقیت ایجاد شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
};
export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof usersApi.update>[1] }) => usersApi.update(id, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.users }); toast.success("تغییرات ذخیره شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
};
export const useUpdateRolePerms = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) => rolesApi.updatePermissions(roleId, permissions),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.roles }); qc.invalidateQueries({ queryKey: qk.users }); toast.success("دسترسی‌ها به‌روز شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
};

/* ── projects ── */
export const useProjects = () => useQuery({ queryKey: qk.projects, queryFn: projectsApi.list });
export const useProject = (id: string) => useQuery({ queryKey: qk.project(id), queryFn: () => projectsApi.get(id), enabled: !!id });
export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.projects }); toast.success("پروژه ایجاد شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
};
export const useUpdateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof projectsApi.update>[1] }) => projectsApi.update(id, patch),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: qk.projects }); qc.invalidateQueries({ queryKey: qk.project(v.id) }); toast.success("پروژه به‌روز شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
};
export const useMembers = (pid: string) => useQuery({ queryKey: qk.members(pid), queryFn: () => projectsApi.members(pid), enabled: !!pid });
export const useAddMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pid, userId, role }: { pid: string; userId: string; role: string }) => projectsApi.addMember(pid, userId, role),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: qk.members(v.pid) }); toast.success("عضو اضافه شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
};
export const useRemoveMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pid, userId }: { pid: string; userId: string }) => projectsApi.removeMember(pid, userId),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: qk.members(v.pid) }); toast.success("عضو حذف شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
};
export const useMilestones = (pid: string) => useQuery({ queryKey: qk.milestones(pid), queryFn: () => projectsApi.milestones(pid), enabled: !!pid });
export const useEpics = (pid: string) => useQuery({ queryKey: qk.epics(pid), queryFn: () => projectsApi.epics(pid), enabled: !!pid });
export const useActivity = (pid?: string) => useQuery({ queryKey: qk.activity(pid), queryFn: () => projectsApi.activity(pid) });

/* ── boards ── */
export const useBoards = (pid: string) => useQuery({ queryKey: qk.boards(pid), queryFn: () => boardsApi.ofProject(pid), enabled: !!pid });
export const useBoard = (id: string) => useQuery({ queryKey: qk.board(id), queryFn: () => boardsApi.get(id), enabled: !!id });
export const useCreateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pid, name }: { pid: string; name: string }) => boardsApi.create(pid, name),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: qk.boards(v.pid) }); toast.success("بورد ایجاد شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
};
export const useBoardColumns = () => {
  const qc = useQueryClient();
  const invalidate = (bid: string) => {
    qc.invalidateQueries({ queryKey: qk.board(bid) });
    qc.invalidateQueries({ queryKey: ["projects"], exact: false });
  };
  const add = useMutation({
    mutationFn: ({ bid, title }: { bid: string; title: string }) => boardsApi.addColumn(bid, title),
    onSuccess: (_, v) => { invalidate(v.bid); toast.success("ستون اضافه شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const update = useMutation({
    mutationFn: ({ bid, cid, patch }: { bid: string; cid: string; patch: Parameters<typeof boardsApi.updateColumn>[2] }) => boardsApi.updateColumn(bid, cid, patch),
    onSuccess: (_, v) => invalidate(v.bid),
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: ({ bid, cid }: { bid: string; cid: string }) => boardsApi.removeColumn(bid, cid),
    onSuccess: (_, v) => { invalidate(v.bid); qc.invalidateQueries({ queryKey: qk.boardTasks(v.bid) }); toast.success("ستون حذف شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const reorder = useMutation({
    mutationFn: ({ bid, ids }: { bid: string; ids: string[] }) => boardsApi.reorderColumns(bid, ids),
    onSuccess: (_, v) => invalidate(v.bid),
  });
  return { add, update, remove, reorder };
};

/* ── tasks ── */
export const useTasks = (q: TaskQuery) => useQuery({ queryKey: qk.tasks(q), queryFn: () => tasksApi.list(q) });
/** Counts over the full set — use for stats, never derive from a paged list. */
export const useTaskStats = (q: TaskQuery) =>
  useQuery({ queryKey: qk.taskStats(q), queryFn: () => tasksApi.stats(q) });
export const useBoardTasks = (bid: string) => useQuery({ queryKey: qk.boardTasks(bid), queryFn: () => tasksApi.list({ boardId: bid, pageSize: 500 }), enabled: !!bid });
export const useTask = (id: string) => useQuery({ queryKey: qk.task(id), queryFn: () => tasksApi.get(id), enabled: !!id });

function useInvalidateTask() {
  const qc = useQueryClient();
  return (task?: { id: string; boardId: string; projectId: string }) => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["boards"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["task-stats"] });
    if (task) {
      qc.invalidateQueries({ queryKey: qk.task(task.id) });
      qc.invalidateQueries({ queryKey: qk.boardTasks(task.boardId) });
    }
  };
}
export const useCreateTask = () => {
  const inv = useInvalidateTask();
  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: (t) => { inv(t); toast.success("تسک ایجاد شد."); },
    onError: (e) => toast.error(errMsg(e)),
  });
};
export const useUpdateTask = () => {
  const inv = useInvalidateTask();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof tasksApi.update>[1] }) => tasksApi.update(id, patch),
    onSuccess: (t) => inv(t),
    onError: (e) => toast.error(errMsg(e)),
  });
};
export const useMoveTask = () => {
  const inv = useInvalidateTask();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, columnId, order }: { id: string; columnId: string; order?: number }) =>
      tasksApi.move(id, columnId, order),
    // Drop feels instant: rewrite the board cache up front, roll back on failure.
    onMutate: async ({ id, columnId, order }) => {
      await qc.cancelQueries({ queryKey: ["boards"] });
      const snapshots = qc.getQueriesData<Task[]>({ queryKey: ["boards"] });
      qc.setQueriesData<Task[]>({ queryKey: ["boards"] }, (old) => {
        if (!old) return old;
        let moved = false;
        const next = old.map((t) => {
          if (t.id === id) { moved = true; return { ...t, columnId, order: order ?? t.order }; }
          return t;
        });
        return moved ? next : old;
      });
      return { snapshots };
    },
    onError: (e, _v, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(errMsg(e));
    },
    onSuccess: (t) => inv(t),
    onSettled: () => { inv(); },
  });
};
export const useTaskActions = () => {
  const inv = useInvalidateTask();
  const qc = useQueryClient();
  // Only task-scoped caches are stale here, so avoid the full board sweep.
  const wrapTask = <T, V>(fn: (v: V) => Promise<T>, msg?: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: (t) => {
        qc.invalidateQueries({ queryKey: ["tasks"] });
        const task = t as { id?: string } | undefined;
        if (task?.id) qc.invalidateQueries({ queryKey: qk.task(task.id) });
        if (msg) toast.success(msg);
      },
      onError: (e) => toast.error(errMsg(e)),
    });
  const wrap = <T, V>(fn: (v: V) => Promise<T>, msg?: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: (t) => { inv(t as unknown as { id: string; boardId: string; projectId: string }); if (msg) toast.success(msg); },
      onError: (e) => toast.error(errMsg(e)),
    });
  return {
    remove: wrap((id: string) => tasksApi.remove(id), "تسک بایگانی شد."),
    duplicate: wrap((id: string) => tasksApi.duplicate(id), "تسک کپی شد."),
    addComment: useMutation({
      mutationFn: ({ id, body }: { id: string; body: string }) => tasksApi.addComment(id, body),
      // Comments live on the task, so only that task's cache is stale.
      onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); },
      onError: (e) => toast.error(errMsg(e)),
    }),
    deleteComment: wrap(({ id, cid }: { id: string; cid: string }) => tasksApi.deleteComment(id, cid).then(() => tasksApi.get(id))),
    toggleChecklist: wrapTask(({ id, item }: { id: string; item: string }) => tasksApi.toggleChecklist(id, item)),
    addChecklist: wrapTask(({ id, text, assigneeId }: { id: string; text: string; assigneeId?: string }) => tasksApi.addChecklist(id, text, assigneeId)),
    assignChecklist: wrapTask(({ id, item, assigneeId }: { id: string; item: string; assigneeId?: string }) => tasksApi.assignChecklist(id, item, assigneeId)),
    deleteChecklist: wrapTask(({ id, item }: { id: string; item: string }) => tasksApi.deleteChecklist(id, item)),
    addSubtask: wrapTask(({ id, title }: { id: string; title: string }) => tasksApi.addSubtask(id, title)),
    toggleSubtask: wrapTask(({ id, st }: { id: string; st: string }) => tasksApi.toggleSubtask(id, st)),
    deleteSubtask: wrapTask(({ id, st }: { id: string; st: string }) => tasksApi.deleteSubtask(id, st)),
    addDependency: wrap(({ id, depId, kind }: { id: string; depId: string; kind?: "blocks" | "blocked_by" | "depends_on" | "related_to" }) => tasksApi.addDependency(id, depId, kind), "وابستگی ثبت شد."),
    removeDependency: wrap(({ id, dep }: { id: string; dep: string }) => tasksApi.removeDependency(id, dep)),
    addAttachment: wrap(({ id, meta }: { id: string; meta: { fileName: string; mimeType: string; sizeBytes: number; blob?: Blob } }) => tasksApi.addAttachment(id, meta), "فایل پیوست شد."),
    toggleWatcher: wrap((id: string) => tasksApi.toggleWatcher(id)),
    startTimer: wrap((id: string) => tasksApi.startTimer(id).then(() => tasksApi.get(id)), "تایمر شروع شد."),
    stopTimer: wrap(({ id, entry }: { id: string; entry: string }) => tasksApi.stopTimer(id, entry).then(() => tasksApi.get(id)), "تایمر متوقف شد."),
    logTime: wrap(({ id, minutes, note }: { id: string; minutes: number; note?: string }) => tasksApi.logTime(id, minutes, note).then(() => tasksApi.get(id)), "زمان ثبت شد."),
    moveToBoard: wrap(({ id, boardId, columnId }: { id: string; boardId: string; columnId: string }) => tasksApi.moveToBoard(id, boardId, columnId), "تسک منتقل شد."),
  };
};

/* ── chat ── */
export const useConversations = () => useQuery({ queryKey: qk.conversations, queryFn: chatApi.conversations, refetchInterval: 5000 });
export const useMessages = (cid: string) => useQuery({ queryKey: qk.messages(cid), queryFn: () => chatApi.messages(cid), enabled: !!cid, refetchInterval: 4000 });
export const useChatActions = () => {
  const qc = useQueryClient();
  const inv = (cid?: string) => {
    qc.invalidateQueries({ queryKey: qk.conversations });
    if (cid) qc.invalidateQueries({ queryKey: qk.messages(cid) });
  };
  return {
    send: useMutation({
      mutationFn: ({ cid, body, reply }: { cid: string; body: string; reply?: string }) => chatApi.send(cid, body, reply),
      onSuccess: (_, v) => inv(v.cid),
      onError: (e) => toast.error(errMsg(e)),
    }),
    edit: useMutation({
      mutationFn: ({ cid, mid, body }: { cid: string; mid: string; body: string }) => chatApi.edit(mid, body),
      onSuccess: (_, v) => inv(v.cid),
      onError: (e) => toast.error(errMsg(e)),
    }),
    remove: useMutation({
      mutationFn: ({ cid, mid }: { cid: string; mid: string }) => chatApi.remove(mid),
      onSuccess: (_, v) => inv(v.cid),
      onError: (e) => toast.error(errMsg(e)),
    }),
    react: useMutation({
      mutationFn: ({ cid, mid, emoji }: { cid: string; mid: string; emoji: string }) => chatApi.react(mid, emoji),
      onSuccess: (_, v) => inv(v.cid),
    }),
    togglePin: useMutation({
      mutationFn: ({ cid, mid }: { cid: string; mid: string }) => chatApi.togglePin(mid),
      onSuccess: (_, v) => { inv(v.cid); toast.success("وضعیت سنجاق تغییر کرد."); },
    }),
    markRead: useMutation({
      mutationFn: (cid: string) => chatApi.markRead(cid),
      onSuccess: (_, cid) => inv(cid),
    }),
    setBackground: useMutation({
      mutationFn: ({ cid, bg }: { cid: string; bg: Parameters<typeof chatApi.setBackground>[1] }) => chatApi.setBackground(cid, bg),
      onSuccess: (_, v) => { inv(v.cid); toast.success("پس‌زمینه تغییر کرد."); },
    }),
    createGroup: useMutation({
      mutationFn: ({ title, members }: { title: string; members: string[] }) => chatApi.createGroup(title, members),
      onSuccess: () => { inv(); toast.success("گروه ایجاد شد."); },
      onError: (e) => toast.error(errMsg(e)),
    }),
    ensureChannel: useMutation({
      mutationFn: (pid: string) => chatApi.ensureProjectChannel(pid),
      onSuccess: () => inv(),
      onError: (e) => toast.error(errMsg(e)),
    }),
    toggleMute: useMutation({
      mutationFn: (cid: string) => chatApi.toggleMute(cid),
      onSuccess: (_, cid) => inv(cid),
    }),
  };
};

/* ── notifications ── */
export const useNotifications = () => useQuery({ queryKey: qk.notifications, queryFn: notificationsApi.list, refetchInterval: 8000 });
export const useNotifActions = () => {
  const qc = useQueryClient();
  return {
    markRead: useMutation({
      mutationFn: (id: string) => notificationsApi.markRead(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
    }),
    markAllRead: useMutation({
      mutationFn: notificationsApi.markAllRead,
      onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
    }),
  };
};

/* ── calendar / files / reports / search ── */
export const useEvents = (pid?: string) => useQuery({ queryKey: qk.events(pid), queryFn: () => calendarApi.events(pid) });
export const useEventActions = () => {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["events"] });
  return {
    create: useMutation({
      mutationFn: calendarApi.create,
      onSuccess: () => { inv(); toast.success("رویداد ایجاد شد."); },
      onError: (e) => toast.error(errMsg(e)),
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof calendarApi.update>[1] }) => calendarApi.update(id, patch),
      onSuccess: () => { inv(); toast.success("رویداد به‌روز شد."); },
      onError: (e) => toast.error(errMsg(e)),
    }),
    remove: useMutation({
      mutationFn: (id: string) => calendarApi.remove(id),
      onSuccess: () => { inv(); toast.success("رویداد حذف شد."); },
      onError: (e) => toast.error(errMsg(e)),
    }),
  };
};
export const useFiles = (pid?: string) => useQuery({ queryKey: qk.files(pid), queryFn: () => filesApi.list(pid) });
export const useFileActions = () => {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["files"] });
  return {
    upload: useMutation({
      mutationFn: ({ pid, folder, meta }: { pid: string; folder: string; meta: Parameters<typeof filesApi.upload>[2] }) => filesApi.upload(pid, folder, meta),
      onSuccess: () => { inv(); toast.success("فایل بارگذاری شد."); },
      onError: (e) => toast.error(errMsg(e)),
    }),
    rename: useMutation({
      mutationFn: ({ id, name }: { id: string; name: string }) => filesApi.rename(id, name),
      onSuccess: () => { inv(); toast.success("نام فایل تغییر کرد."); },
      onError: (e) => toast.error(errMsg(e)),
    }),
    move: useMutation({
      mutationFn: ({ id, folder }: { id: string; folder: string }) => filesApi.move(id, folder),
      onSuccess: () => { inv(); toast.success("فایل منتقل شد."); },
      onError: (e) => toast.error(errMsg(e)),
    }),
    remove: useMutation({
      mutationFn: (id: string) => filesApi.remove(id),
      onSuccess: () => { inv(); toast.success("فایل حذف شد."); },
      onError: (e) => toast.error(errMsg(e)),
    }),
  };
};
export const useWorkload = (pid?: string) => useQuery({ queryKey: qk.workload(pid), queryFn: () => reportsApi.workload(pid) });
export const useBurn = (pid: string) => useQuery({ queryKey: qk.burn(pid), queryFn: () => reportsApi.burn(pid), enabled: !!pid });
export const useStreams = (pid: string) => useQuery({ queryKey: qk.streams(pid), queryFn: () => reportsApi.streams(pid), enabled: !!pid });
export const useTrend = (pid?: string) => useQuery({ queryKey: qk.trend(pid), queryFn: () => reportsApi.trend(pid) });
export const useProjectsStats = () => useQuery({ queryKey: qk.projectStats, queryFn: () => reportsApi.projects() });
export const useOverview = (pid?: string) => useQuery({ queryKey: qk.overview(pid), queryFn: () => reportsApi.overview(pid) });
export const useGlobalSearch = (q: string) =>
  useQuery({ queryKey: qk.search(q), queryFn: () => searchApi.global(q), enabled: q.trim().length >= 2 });
