/* ─── Typed API client ────────────────────────────────────────────
   Single entry-point for all server communication. Today it runs on the
   local mock adapter (same DTOs as the ASP.NET backend); pointing
   NEXT_PUBLIC_API_URL at the real API + swapping the transport keeps every
   call-site unchanged. */
import { db, pushActivity, pushNotification } from "./mock-db";
import { uid, sleep } from "@/lib/utils";
import {
  isTaskDone, recomputeProgress, syncCompletion, matchesText, byOrder, taskTimeState,
  type TaskTimeState,
} from "@/lib/task-state";
import { hashPassword, verifyPassword } from "@/lib/password";
import { storeFileBlob } from "@/lib/file-store";
import type {
  User, Project, Board, BoardColumn, Task, Conversation, Message,
  NotificationItem, CalendarEvent, ProjectFile, ActivityEntry, Role,
  ProjectMember, Milestone, Comment, TimeEntry, Paged, WorkloadRow,
  BurnPoint, StreamProgress, ChatBackground, Epic,
} from "@/types/models";

export class ApiError extends Error {
  code: string;
  status: number;
  errors?: Record<string, string[]>;
  constructor(code: string, message: string, status = 400, errors?: Record<string, string[]>) {
    super(message);
    this.code = code;
    this.status = status;
    this.errors = errors;
  }
}

/* Simulated network latency, in ms, as "min:max".
   The local adapter answers from memory, so this defaults to 0 and every
   interaction is instant. Set NEXT_PUBLIC_API_LATENCY (e.g. "150:400") to
   exercise loading/spinner states against a server-like delay. */
const LATENCY = (() => {
  const raw = process.env.NEXT_PUBLIC_API_LATENCY?.trim();
  if (!raw) return { min: 0, max: 0 };
  const [min, max] = raw.split(":").map(Number);
  const lo = Number.isFinite(min) ? Math.max(0, min) : 0;
  const hi = Number.isFinite(max as number) ? Math.max(0, max as number) : lo;
  return { min: lo, max: Math.max(lo, hi) };
})();
async function latency(): Promise<void> {
  if (LATENCY.max <= 0) return;
  await sleep(LATENCY.min + Math.random() * (LATENCY.max - LATENCY.min));
}
const now = () => new Date().toISOString();
const me = () => db.currentUser();

export interface TaskQuery {
  projectId?: string;
  boardId?: string;
  assigneeId?: string;
  search?: string;
  priorities?: string[];
  streams?: string[];
  overdueOnly?: boolean;
  blockedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

/** Aggregates for boards, dashboards and panels. Counted over the whole
    task set, so they never hit a page ceiling. */
export interface TaskStats {
  total: number;
  done: number;
  open: number;
  overdue: number;
  scheduled: number;
  unscheduled: number;
  blocked: number;
  unassigned: number;
  remainingMinutes: number;
  progress: number;
}

/* ═══════════ AUTH ═══════════ */
export const authApi = {
  async login(username: string, password: string): Promise<{ user: User; mustChangePassword: boolean }> {
    await latency();
    const user = db.get().users.find(
      (u) => (u.username === username || u.email === username) && u.status === "active",
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new ApiError("invalid_credentials", "نام کاربری یا رمز عبور اشتباه است.", 401);
    }
    db.update((d) => {
      const u = d.users.find((x) => x.id === user.id)!;
      u.isOnline = true;
      u.lastSeenAt = now();
    });
    pushActivity({ projectId: undefined, actorId: user.id, action: "auth.login", actionFa: "وارد سامانه شد", entityType: "session" });
    return { user: db.user(user.id)!, mustChangePassword: !!user.forcePasswordChange };
  },
  async logout(): Promise<void> {
    await latency();
    pushActivity({ actorId: me().id, action: "auth.logout", actionFa: "از سامانه خارج شد", entityType: "session" });
  },
  async changePassword(current: string, next: string): Promise<void> {
    await latency();
    if (next.length < 8) throw new ApiError("weak_password", "رمز جدید باید حداقل ۸ کاراکتر باشد.", 422);
    let ok = false;
    db.update((d) => {
      const u = d.users.find((x) => x.id === me().id)!;
      if (!verifyPassword(current, u.passwordHash)) return;
      u.passwordHash = hashPassword(next);
      u.forcePasswordChange = false;
      ok = true;
    });
    if (!ok) throw new ApiError("wrong_password", "رمز فعلی اشتباه است.", 400);
  },
  sessions() {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const device = /Android|iPhone|iPad|Mobile/i.test(ua) ? "مرورگر موبایل" : "مرورگر دسکتاپ";
    return [{ id: "s_current", device, ip: "—", lastActive: now(), current: true }];
  },
};

/* ═══════════ USERS / ROLES ═══════════ */
export const usersApi = {
  async list(): Promise<User[]> {
    await latency();
    return db.get().users;
  },
  async get(id: string): Promise<User> {
    await latency();
    const u = db.user(id);
    if (!u) throw new ApiError("not_found", "کاربر یافت نشد.", 404);
    return u;
  },
  async updateMe(patch: { name?: string; avatarUrl?: string; about?: string }): Promise<User> {
    await latency();
    let out: User | undefined;
    db.update((d) => {
      const u = d.users.find((x) => x.id === me().id);
      if (!u) throw new ApiError("not_found", "کاربر یافت نشد.", 404);
      Object.assign(u, patch);
      out = u;
    });
    return out!;
  },
  async create(input: Partial<User> & { password: string }): Promise<User> {
    await latency();
    if (db.get().users.some((u) => u.username === input.username || u.email === input.email)) {
      throw new ApiError("duplicate", "نام کاربری یا ایمیل تکراری است.", 409);
    }
    const roleName = input.role ?? "Employee";
    const user: User = {
      id: uid("u"), name: input.name ?? "", username: input.username ?? "",
      email: input.email ?? "", role: roleName,
      roleTitleFa: db.get().roles.find((r) => r.name === roleName)?.titleFa ?? roleName,
      department: input.department ?? "", position: input.position ?? "",
      status: "active", isOnline: false, lastSeenAt: now(),
      permissions: db.get().roles.find((r) => r.name === roleName)?.permissions ?? [],
      passwordHash: hashPassword(input.password),
      forcePasswordChange: true, createdAt: now(),
    };
    db.update((d) => { d.users.push(user); });
    pushActivity({ actorId: me().id, action: "user.create", actionFa: "کاربر جدید ساخت", entityType: "user", entityTitle: user.name });
    return user;
  },
  async update(id: string, patch: Partial<User>): Promise<User> {
    await latency();
    let out: User | undefined;
    db.update((d) => {
      const u = d.users.find((x) => x.id === id);
      if (!u) throw new ApiError("not_found", "کاربر یافت نشد.", 404);
      const { passwordHash: _ignored, ...safePatch } = patch;
      Object.assign(u, safePatch);
      if (safePatch.role) {
        const r = d.roles.find((x) => x.name === safePatch.role);
        if (r) { u.permissions = [...r.permissions]; u.roleTitleFa = r.titleFa; }
      }
      out = u;
    });
    return out!;
  },
  async setStatus(id: string, status: User["status"]): Promise<User> {
    return this.update(id, { status });
  },
};

export const rolesApi = {
  async list(): Promise<Role[]> {
    await latency();
    const d = db.get();
    // Live member counts — never stale.
    return d.roles.map((r) => ({
      ...r,
      membersCount: d.users.filter((u) => u.role === r.name).length,
    }));
  },
  async updatePermissions(roleId: string, permissions: string[]): Promise<Role> {
    await latency();
    let out: Role | undefined;
    db.update((d) => {
      const r = d.roles.find((x) => x.id === roleId);
      if (!r) throw new ApiError("not_found", "نقش یافت نشد.", 404);
      r.permissions = permissions;
      d.users.forEach((u) => { if (u.role === r.name) u.permissions = permissions; });
      out = r;
    });
    pushActivity({ actorId: me().id, action: "role.update", actionFa: "دسترسی‌های نقش را تغییر داد", entityType: "role", entityTitle: out!.titleFa });
    return out!;
  },
};

/* ═══════════ PROJECTS ═══════════ */
/** Live project stats computed from real data — never stale. */
function withLiveStats(p: Project): Project {
  const d = db.get();
  const tasks = d.tasks.filter((t) => t.projectId === p.id && !t.isArchived);
  const boardOf = new Map(d.boards.map((b) => [b.id, b]));
  const done = (t: Task) => isTaskDone(t, boardOf.get(t.boardId));
  const open = tasks.filter((t) => !done(t));
  const doneCount = tasks.length - open.length;
  return {
    ...p,
    membersCount: (d.members[p.id] ?? []).length,
    openTasks: open.length,
    overdueTasks: open.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now()).length,
    blockedTasks: open.filter((t) => t.isBlocked).length,
    progress: tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0,
  };
}

export const projectsApi = {
  async list(): Promise<Project[]> {
    await latency();
    return [...db.get().projects]
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
      .map(withLiveStats);
  },
  async get(id: string): Promise<Project> {
    await latency();
    const p = db.project(id);
    if (!p) throw new ApiError("not_found", "پروژه یافت نشد.", 404);
    return withLiveStats(p);
  },
  async create(input: { name: string; key: string; description?: string; targetDate?: string }): Promise<Project> {
    await latency();
    const p: Project = {
      id: uid("p"), name: input.name, key: input.key.toUpperCase().slice(0, 5),
      description: input.description ?? "", iconColor: "#16a34a", status: "active",
      health: "on_track", ownerId: me().id, startDate: now(),
      targetDate: input.targetDate ?? new Date(Date.now() + 90 * 86400_000).toISOString(),
      progress: 0, membersCount: 1, openTasks: 0, overdueTasks: 0, blockedTasks: 0,
      lastActivityAt: now(),
    };
    db.update((d) => {
      d.projects.push(p);
      const mkCols = (bid: string, defs: [string, string, string][]): BoardColumn[] =>
        defs.map(([title, key, color], i) => ({ id: `${bid}_${key}`, boardId: bid, title, key, color, order: i, isDoneColumn: key === "done" || key === "released" }));
      d.boards.push(
        { id: `${p.id}_main`, projectId: p.id, name: "توسعه اصلی", kind: "main", isDefault: true, createdAt: now(), columns: mkCols(`${p.id}_main`, [["بک‌لاگ", "backlog", "#64748b"], ["برنامه‌ریزی‌شده", "planned", "#0ea5e9"], ["در حال انجام", "in_progress", "#8b5cf6"], ["بازبینی", "review", "#f59e0b"], ["تست", "testing", "#ec4899"], ["انجام‌شده", "done", "#16a34a"]]) },
        { id: `${p.id}_hot`, projectId: p.id, name: "فوری / هات‌فیکس", kind: "urgent", createdAt: now(), columns: mkCols(`${p.id}_hot`, [["جدید", "new", "#dc2626"], ["در حال بررسی", "investigating", "#f59e0b"], ["در حال رفع", "fixing", "#8b5cf6"], ["راستی‌آزمایی", "verification", "#0ea5e9"], ["منتشرشده", "released", "#16a34a"]]) },
      );
      d.members[p.id] = [{ userId: me().id, user: me(), roleInProject: "مدیر پروژه", joinedAt: now() }];
    });
    pushActivity({ projectId: p.id, actorId: me().id, action: "project.create", actionFa: "پروژه جدید ساخت", entityType: "project", entityTitle: p.name });
    return p;
  },
  async update(id: string, patch: Partial<Project>): Promise<Project> {
    await latency();
    let out: Project | undefined;
    db.update((d) => {
      const p = d.projects.find((x) => x.id === id);
      if (!p) throw new ApiError("not_found", "پروژه یافت نشد.", 404);
      Object.assign(p, patch, { lastActivityAt: now() });
      out = p;
    });
    return out!;
  },
  async remove(id: string): Promise<void> {
    await latency();
    db.update((d) => {
      d.projects = d.projects.filter((p) => p.id !== id);
      // Cascade: a deleted project must not leave orphaned records behind.
      const boardIds = new Set(d.boards.filter((b) => b.projectId === id).map((b) => b.id));
      const taskIds = new Set(d.tasks.filter((t) => t.projectId === id).map((t) => t.id));
      const convIds = new Set(d.conversations.filter((c) => c.projectId === id).map((c) => c.id));

      d.boards = d.boards.filter((b) => b.projectId !== id);
      d.tasks = d.tasks.filter((t) => t.projectId !== id);
      d.members = Object.fromEntries(
        Object.entries(d.members).filter(([pid]) => pid !== id),
      );
      d.milestones = d.milestones.filter((m) => m.projectId !== id);
      d.epics = d.epics.filter((e) => e.projectId !== id);
      d.files = d.files.filter((f) => f.projectId !== id);
      d.events = d.events.filter((e) => e.projectId !== id);
      d.activity = d.activity.filter((a) => a.projectId !== id);
      d.conversations = d.conversations.filter((c) => c.projectId !== id);
      d.messages = d.messages.filter((m) => !convIds.has(m.conversationId));
      d.notifications = d.notifications.filter(
        (n) => !n.link || !taskIds.has(n.link.replace(/^\/tasks\//, "")),
      );

      // Drop task references held by the surviving tasks.
      d.tasks.forEach((t) => {
        t.dependencies = t.dependencies.filter((dep) => !taskIds.has(dep.dependsOnTaskId));
        t.blockedBy = t.blockedBy.filter((x) => !taskIds.has(x));
        t.blocking = t.blocking.filter((x) => !taskIds.has(x));
      });
      void boardIds;
    });
    pushActivity({ actorId: me().id, action: "project.delete", actionFa: "پروژه را حذف کرد", entityType: "project" });
  },
  async members(projectId: string): Promise<ProjectMember[]> {
    await latency();
    return db.get().members[projectId] ?? [];
  },
  async addMember(projectId: string, userId: string, roleInProject: string): Promise<ProjectMember[]> {
    await latency();
    const user = db.user(userId);
    if (!user) throw new ApiError("not_found", "کاربر یافت نشد.", 404);
    db.update((d) => {
      d.members[projectId] = d.members[projectId] ?? [];
      if (!d.members[projectId].some((m) => m.userId === userId)) {
        d.members[projectId].push({ userId, user, roleInProject, joinedAt: now() });
      }
      const p = d.projects.find((x) => x.id === projectId);
      if (p) p.membersCount = d.members[projectId].length;
    });
    return db.get().members[projectId];
  },
  async removeMember(projectId: string, userId: string): Promise<ProjectMember[]> {
    await latency();
    db.update((d) => {
      d.members[projectId] = (d.members[projectId] ?? []).filter((m) => m.userId !== userId);
      const p = d.projects.find((x) => x.id === projectId);
      if (p) p.membersCount = d.members[projectId].length;
    });
    return db.get().members[projectId];
  },
  async milestones(projectId: string): Promise<Milestone[]> {
    await latency();
    return db.get().milestones.filter((m) => m.projectId === projectId);
  },
  async epics(projectId: string): Promise<Epic[]> {
    await latency();
    return db.get().epics.filter((e) => e.projectId === projectId);
  },
  async activity(projectId?: string): Promise<ActivityEntry[]> {
    await latency();
    const all = db.get().activity;
    return projectId ? all.filter((a) => a.projectId === projectId) : all;
  },
};

/* ═══════════ BOARDS ═══════════ */
export const boardsApi = {
  async ofProject(projectId: string): Promise<Board[]> {
    await latency();
    return db.boardsOf(projectId);
  },
  async get(id: string): Promise<Board> {
    await latency();
    const b = db.board(id);
    if (!b) throw new ApiError("not_found", "بورد یافت نشد.", 404);
    return b;
  },
  async create(projectId: string, name: string, kind: Board["kind"] = "custom"): Promise<Board> {
    await latency();
    const bid = uid("b");
    const board: Board = {
      id: bid, projectId, name, kind, createdAt: now(),
      columns: [["بک‌لاگ", "backlog", "#64748b"], ["در حال انجام", "in_progress", "#8b5cf6"], ["بازبینی", "review", "#f59e0b"], ["انجام‌شده", "done", "#16a34a"]]
        .map(([title, key, color], i) => ({ id: `${bid}_${key}`, boardId: bid, title, key, color, order: i, isDoneColumn: key === "done" })),
    };
    db.update((d) => { d.boards.push(board); });
    pushActivity({ projectId, actorId: me().id, action: "board.create", actionFa: "بورد جدید ساخت", entityType: "board", entityTitle: name });
    return board;
  },
  async addColumn(boardId: string, title: string, color = "#0ea5e9"): Promise<Board> {
    await latency();
    let out: Board | undefined;
    db.update((d) => {
      const b = d.boards.find((x) => x.id === boardId);
      if (!b) throw new ApiError("not_found", "بورد یافت نشد.", 404);
      const key = `col_${Date.now().toString(36)}`;
      b.columns.push({ id: `${boardId}_${key}`, boardId, title, key, color, order: b.columns.length });
      out = b;
    });
    return out!;
  },
  async updateColumn(boardId: string, columnId: string, patch: Partial<BoardColumn>): Promise<Board> {
    await latency();
    let out: Board | undefined;
    db.update((d) => {
      const b = d.boards.find((x) => x.id === boardId);
      const c = b?.columns.find((x) => x.id === columnId);
      if (!b || !c) throw new ApiError("not_found", "ستون یافت نشد.", 404);
      Object.assign(c, patch);
      // Completion is a board-level flag: exactly one column may hold it, so
      // promoting one demotes the others and every task in a column that just
      // lost the flag has its progress/completion recomputed.
      if (c.isDoneColumn === true) {
        b.columns.forEach((x) => { if (x.id !== c.id) x.isDoneColumn = false; });
        d.tasks.filter((t) => t.boardId === b.id).forEach((t) => {
          t.progress = recomputeProgress(t, b);
          syncCompletion(t, b);
        });
      }
      out = b;
    });
    return out!;
  },
  async removeColumn(boardId: string, columnId: string): Promise<Board> {
    await latency();
    let out: Board | undefined;
    db.update((d) => {
      const b = d.boards.find((x) => x.id === boardId);
      if (!b) throw new ApiError("not_found", "بورد یافت نشد.", 404);
      if (b.columns.length <= 1) throw new ApiError("invalid", "بورد باید حداقل یک ستون داشته باشد.", 400);
      b.columns = b.columns.filter((x) => x.id !== columnId);
      // Move orphan tasks to first column
      d.tasks.forEach((t) => {
        if (t.boardId === boardId && t.columnId === columnId) {
          t.columnId = b.columns[0].id;
          t.status = b.columns[0].key;
        }
      });
      out = b;
    });
    return out!;
  },
  async reorderColumns(boardId: string, columnIds: string[]): Promise<Board> {
    await latency();
    let out: Board | undefined;
    db.update((d) => {
      const b = d.boards.find((x) => x.id === boardId);
      if (!b) return;
      b.columns.sort((a, b2) => columnIds.indexOf(a.id) - columnIds.indexOf(b2.id));
      b.columns.forEach((c, i) => (c.order = i));
      out = b;
    });
    return out!;
  },
};

/* ═══════════ TASKS ═══════════ */
function taskMatches(t: Task, q: TaskQuery): boolean {
  if (q.projectId && t.projectId !== q.projectId) return false;
  if (q.boardId && t.boardId !== q.boardId) return false;
  if (q.assigneeId && !t.assigneeIds.includes(q.assigneeId)) return false;
  if (q.priorities?.length && !q.priorities.includes(t.priority)) return false;
  // A task with no stream is never excluded by a stream filter.
  if (q.streams?.length && t.stream && !q.streams.includes(t.stream)) return false;
  if (q.overdueOnly) {
    if (isTaskDone(t, db.board(t.boardId))) return false;
    if (!t.dueDate || new Date(t.dueDate).getTime() > Date.now()) return false;
  }
  if (q.blockedOnly && !t.isBlocked) return false;
  if (q.search) {
    if (!matchesText(t.title, q.search) && !matchesText(t.description, q.search)) return false;
  }
  return true;
}

export const tasksApi = {
  async list(q: TaskQuery = {}): Promise<Paged<Task>> {
    await latency();
    const all = db.get().tasks.filter((t) => !t.isArchived && taskMatches(t, q));
    const page = q.page ?? 1;
    // Boards must render whole columns, so the default page covers a whole board.
    const pageSize = q.pageSize ?? 500;
    return {
      items: all.slice((page - 1) * pageSize, page * pageSize).sort(byOrder),
      total: all.length,
      page,
      pageSize,
    };
  },
  /** Counts over the FULL task set, never over a page. */
  async stats(q: TaskQuery = {}): Promise<TaskStats> {
    await latency();
    const d = db.get();
    const tasks = d.tasks.filter((t) => !t.isArchived && taskMatches(t, q));
    const boardOf = new Map(d.boards.map((b) => [b.id, b]));
    const byState = (s: TaskTimeState) =>
      tasks.filter((t) => taskTimeState(t, boardOf.get(t.boardId)) === s).length;
    const done = byState("done");
    const openTasks = tasks.filter((t) => !isTaskDone(t, boardOf.get(t.boardId)));
    return {
      total: tasks.length,
      done,
      open: tasks.length - done,
      overdue: byState("overdue"),
      scheduled: byState("scheduled"),
      unscheduled: byState("unscheduled"),
      blocked: openTasks.filter((t) => t.isBlocked).length,
      unassigned: openTasks.filter((t) => t.assigneeIds.length === 0).length,
      remainingMinutes: openTasks.reduce(
        (s, t) => s + Math.max(0, (t.estimateMinutes ?? 0) - t.spentMinutes),
        0,
      ),
      progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    };
  },
  async get(id: string): Promise<Task> {
    await latency();
    const t = db.task(id);
    if (!t) throw new ApiError("not_found", "تسک یافت نشد.", 404);
    return t;
  },
  async create(input: Partial<Task> & { title: string; projectId: string; boardId: string; columnId: string }): Promise<Task> {
    await latency();
    const board = db.board(input.boardId);
    const col = board?.columns.find((c) => c.id === input.columnId);
    const pkey = db.project(input.projectId)?.key ?? "TSK";
    const maxNum = db.get().tasks
      .filter((x) => x.projectId === input.projectId)
      .map((x) => Number(/^.+?-(\d+)$/.exec(x.key ?? "")?.[1] ?? 0))
      .reduce((a, b) => Math.max(a, b), 0);
    const t: Task = {
      id: uid("t"), key: `${pkey}-${maxNum + 1}`,
      projectId: input.projectId, boardId: input.boardId, columnId: input.columnId,
      title: input.title, description: input.description ?? "", status: col?.key ?? "backlog",
      priority: input.priority ?? "medium", assigneeIds: input.assigneeIds ?? [],
      assignees: (input.assigneeIds ?? []).map((id) => db.user(id)!).filter(Boolean),
      reviewerId: input.reviewerId, watcherIds: [], creatorId: me().id, creator: me(),
      startDate: input.startDate, dueDate: input.dueDate, estimateMinutes: input.estimateMinutes,
      spentMinutes: 0, labels: input.labels ?? [], stream: input.stream,
      epicId: input.epicId, parentId: input.parentId,
      subtasks: [], checklist: [], dependencies: [], blockedBy: [], blocking: [],
      comments: [], attachments: [], timeEntries: [],
      progress: 0, order: Date.now(), isBlocked: false,
      createdAt: now(), updatedAt: now(),
    };
    db.update((d) => { d.tasks.push(t); });
    pushActivity({ projectId: t.projectId, actorId: me().id, action: "task.create", actionFa: "تسک جدید ساخت", entityType: "task", entityId: t.id, entityTitle: t.title });
    t.assigneeIds.forEach((aid) => {
      if (aid === me().id) return;
      pushNotification({ userId: aid, type: "task_assigned", title: "تسک جدید به شما تخصیص یافت", body: `${t.key} · ${t.title}`, link: `/tasks/${t.id}` });
    });
    return t;
  },
  async update(id: string, patch: Partial<Task>): Promise<Task> {
    await latency();
    let out: Task | undefined;
    const before = db.task(id);
    const oldAssignees = before?.assigneeIds ?? [];
    const oldReviewer = before?.reviewerId;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (!t) throw new ApiError("not_found", "تسک یافت نشد.", 404);
      if (patch.assigneeIds) patch.assignees = patch.assigneeIds.map((aid) => db.user(aid)!).filter(Boolean);
      if (patch.reviewerId) patch.reviewer = db.user(patch.reviewerId);
      Object.assign(t, patch, { updatedAt: now() });
      out = t;
    });
    const t = out!;
    if (patch.assigneeIds) {
      patch.assigneeIds
        .filter((aid) => !oldAssignees.includes(aid) && aid !== me().id)
        .forEach((aid) => {
          pushNotification({ userId: aid, type: "task_assigned", title: "تسکی به شما تخصیص یافت", body: `${t.key} · ${t.title}`, link: `/tasks/${t.id}` });
        });
    }
    if (patch.reviewerId && patch.reviewerId !== oldReviewer && patch.reviewerId !== me().id) {
      pushNotification({ userId: patch.reviewerId, type: "task_assigned", title: "بازبینی تسک به شما سپرده شد", body: `${t.key} · ${t.title}`, link: `/tasks/${t.id}` });
    }
    return out!;
  },
  async move(id: string, columnId: string, order?: number): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (!t) throw new ApiError("not_found", "تسک یافت نشد.", 404);
      const board = d.boards.find((b) => b.id === t.boardId);
      const col = board?.columns.find((c) => c.id === columnId);
      if (!col) throw new ApiError("not_found", "ستون مقصد یافت نشد.", 404);
      const wasDone = isTaskDone(t, board);
      const nowDone = col.isDoneColumn === true;
      // Remember where it came from so a one-click complete can be undone.
      if (nowDone && !wasDone) t.previousColumnId = t.columnId;
      if (!nowDone && wasDone) t.previousColumnId = undefined;
      t.columnId = columnId;
      t.status = col.key;
      t.order = order ?? Date.now();
      t.isBlocked = col.key === "blocked";
      t.progress = recomputeProgress(t, board);
      syncCompletion(t, board);
      t.updatedAt = now();
      out = t;
    });
    pushActivity({ projectId: out!.projectId, actorId: me().id, action: "task.move", actionFa: "تسک را جابه‌جا کرد", entityType: "task", entityId: out!.id, entityTitle: out!.title });
    return out!;
  },
  async moveToBoard(id: string, boardId: string, columnId: string): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      const board = d.boards.find((b) => b.id === boardId);
      const col = board?.columns.find((c) => c.id === columnId);
      if (!t || !board || !col) throw new ApiError("not_found", "مقصد نامعتبر است.", 404);
      t.boardId = boardId; t.columnId = columnId; t.status = col.key;
      t.isBlocked = col.key === "blocked";
      t.order = Date.now(); t.updatedAt = now();
      t.progress = recomputeProgress(t, board);
      syncCompletion(t, board);
      out = t;
    });
    return out!;
  },
  async remove(id: string): Promise<void> {
    await latency();
    const t = db.task(id);
    db.update((d) => {
      const x = d.tasks.find((y) => y.id === id);
      if (x) x.isArchived = true;
    });
    pushActivity({ projectId: t?.projectId, actorId: me().id, action: "task.archive", actionFa: "تسک را بایگانی کرد", entityType: "task", entityId: id, entityTitle: t?.title });
  },
  async duplicate(id: string): Promise<Task> {
    const src = await this.get(id);
    return this.create({
      title: `${src.title} (کپی)`, projectId: src.projectId, boardId: src.boardId,
      columnId: src.columnId, description: src.description, priority: src.priority,
      assigneeIds: [...src.assigneeIds], estimateMinutes: src.estimateMinutes,
      stream: src.stream, labels: [...src.labels], dueDate: src.dueDate,
    });
  },
  // — comments —
  async addComment(taskId: string, body: string): Promise<Comment> {
    await latency();
    const c: Comment = {
      id: uid("c"), taskId, authorId: me().id, author: me(), body,
      mentions: [...body.matchAll(/@([\w.آ-ی]+)/g)].map((m) => m[1]),
      createdAt: now(), updatedAt: now(),
    };
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      t?.comments.push(c);
      if (t) t.updatedAt = now();
    });
    const t = db.task(taskId);
    pushActivity({ projectId: t?.projectId, actorId: me().id, action: "task.comment", actionFa: "نظر گذاشت", entityType: "task", entityId: taskId, entityTitle: t?.title });
    if (t) {
      const targets = new Set<string>([...t.watcherIds, ...t.assigneeIds]);
      targets.delete(me().id);
      targets.forEach((uid) => {
        pushNotification({ userId: uid, type: "comment", title: `نظر جدید در ${t.key}`, body: `${me().name}: ${body.slice(0, 80)}`, link: `/tasks/${t.id}` });
      });
      // @mentions (by username or name)
      c.mentions.forEach((m) => {
        const mentioned = db.get().users.find((u) => u.username === m || u.name === m);
        if (mentioned && mentioned.id !== me().id && !targets.has(mentioned.id)) {
          pushNotification({ userId: mentioned.id, type: "mention", title: `از شما در ${t.key} نام برده شد`, body: `${me().name}: ${body.slice(0, 80)}`, link: `/tasks/${t.id}` });
        }
      });
    }
    return c;
  },
  async deleteComment(taskId: string, commentId: string): Promise<void> {
    await latency();
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (t) t.comments = t.comments.filter((c) => c.id !== commentId);
    });
  },
  // — checklist / subtasks —
  async toggleChecklist(taskId: string, itemId: string): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      const it = t?.checklist.find((x) => x.id === itemId);
      if (t && it) {
        it.isDone = !it.isDone;
        t.progress = recomputeProgress(t, d.boards.find((b) => b.id === t.boardId));
        t.updatedAt = now(); out = t;
      }
    });
    return out!;
  },
  async addChecklist(taskId: string, text: string, assigneeId?: string): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (t) {
        t.checklist.push({ id: uid("ch"), text, isDone: false, assigneeId });
        t.progress = recomputeProgress(t, d.boards.find((b) => b.id === t.boardId));
        out = t;
      }
    });
    return out!;
  },
  async assignChecklist(taskId: string, item: string, assigneeId?: string): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      const it = t?.checklist.find((x) => x.id === item);
      if (t && it) { it.assigneeId = assigneeId; t.updatedAt = now(); out = t; }
    });
    return out!;
  },
  async deleteChecklist(taskId: string, item: string): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (t) {
        t.checklist = t.checklist.filter((x) => x.id !== item);
        t.progress = recomputeProgress(t, d.boards.find((b) => b.id === t.boardId));
        t.updatedAt = now(); out = t;
      }
    });
    return out!;
  },
  async addSubtask(taskId: string, title: string): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (t) {
        t.subtasks.push({ id: uid("st"), title, isDone: false });
        t.progress = recomputeProgress(t, d.boards.find((b) => b.id === t.boardId));
        out = t;
      }
    });
    return out!;
  },
  async deleteSubtask(taskId: string, subId: string): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (t) {
        t.subtasks = t.subtasks.filter((x) => x.id !== subId);
        t.progress = recomputeProgress(t, d.boards.find((b) => b.id === t.boardId));
        t.updatedAt = now(); out = t;
      }
    });
    return out!;
  },
  async toggleSubtask(taskId: string, subtaskId: string): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      const st = t?.subtasks.find((x) => x.id === subtaskId);
      if (t && st) {
        st.isDone = !st.isDone;
        t.progress = recomputeProgress(t, d.boards.find((b) => b.id === t.boardId));
        t.updatedAt = now(); out = t;
      }
    });
    return out!;
  },
  // — dependencies —
  async addDependency(taskId: string, dependsOnTaskId: string, kind: "blocks" | "blocked_by" | "depends_on" | "related_to" = "depends_on"): Promise<Task> {
    await latency();
    if (taskId === dependsOnTaskId) throw new ApiError("invalid", "تسک نمی‌تواند به خودش وابسته باشد.", 400);
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (!t || !d.tasks.some((x) => x.id === dependsOnTaskId)) throw new ApiError("not_found", "تسک یافت نشد.", 404);
      if (t.dependencies.some((x) => x.dependsOnTaskId === dependsOnTaskId)) throw new ApiError("duplicate", "این وابستگی قبلاً ثبت شده است.", 409);
      t.dependencies.push({ id: uid("dep"), taskId, dependsOnTaskId, kind });
      if (kind === "blocks") {
        const other = d.tasks.find((x) => x.id === dependsOnTaskId);
        if (other) other.blockedBy = [...new Set([...other.blockedBy, taskId])];
      } else if (kind === "depends_on" || kind === "blocked_by") {
        t.blockedBy = [...new Set([...t.blockedBy, dependsOnTaskId])];
      }
      out = t;
    });
    return out!;
  },
  async removeDependency(taskId: string, depId: string): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (t) {
        const dep = t.dependencies.find((x) => x.id === depId);
        t.dependencies = t.dependencies.filter((x) => x.id !== depId);
        if (dep) {
          t.blockedBy = t.blockedBy.filter((x) => x !== dep.dependsOnTaskId);
          if (dep.kind === "blocks") {
            const other = d.tasks.find((x) => x.id === dep.dependsOnTaskId);
            if (other) other.blockedBy = other.blockedBy.filter((x) => x !== taskId);
          }
        }
        out = t;
      }
    });
    return out!;
  },
  // — watchers —
  async toggleWatcher(taskId: string, userId?: string): Promise<Task> {
    await latency();
    const uid = userId ?? me().id;
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (t) {
        t.watcherIds = t.watcherIds.includes(uid)
          ? t.watcherIds.filter((x) => x !== uid)
          : [...t.watcherIds, uid];
        out = t;
      }
    });
    return out!;
  },
  // — time tracking —
  async startTimer(taskId: string): Promise<TimeEntry> {
    await latency();
    const entry: TimeEntry = { id: uid("te"), taskId, userId: me().id, user: me(), minutes: 0, startedAt: now(), isRunning: true };
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (!t) throw new ApiError("not_found", "تسک یافت نشد.", 404);
      // stop other running timers on this task
      t.timeEntries.forEach((e) => {
        if (e.isRunning) {
          e.isRunning = false;
          e.endedAt = now();
          e.minutes += Math.max(1, Math.round((Date.now() - new Date(e.startedAt).getTime()) / 60000));
        }
      });
      t.timeEntries.push(entry);
    });
    return entry;
  },
  async stopTimer(taskId: string, entryId: string): Promise<TimeEntry> {
    await latency();
    let out: TimeEntry | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      const e = t?.timeEntries.find((x) => x.id === entryId);
      if (!t || !e) throw new ApiError("not_found", "رکورد زمانی یافت نشد.", 404);
      e.isRunning = false;
      e.endedAt = now();
      const mins = Math.max(1, Math.round((Date.now() - new Date(e.startedAt).getTime()) / 60000));
      e.minutes += mins;
      t.spentMinutes += mins;
      out = e;
    });
    return out!;
  },
  async logTime(taskId: string, minutes: number, note?: string): Promise<TimeEntry> {
    await latency();
    const entry: TimeEntry = { id: uid("te"), taskId, userId: me().id, user: me(), minutes, note, startedAt: now(), endedAt: now() };
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (!t) throw new ApiError("not_found", "تسک یافت نشد.", 404);
      t.timeEntries.push(entry);
      t.spentMinutes += minutes;
    });
    return entry;
  },
  async addAttachment(taskId: string, meta: { fileName: string; mimeType: string; sizeBytes: number; blob?: Blob }): Promise<Task> {
    await latency();
    let out: Task | undefined;
    db.update((d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (!t) throw new ApiError("not_found", "تسک یافت نشد.", 404);
      const attId = uid("f");
      if (meta.blob) storeFileBlob(attId, meta.blob);
      t.attachments.push({
        id: attId, taskId, fileName: meta.fileName,
        storedName: `${Date.now()}_${meta.fileName}`, mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes, uploadedById: me().id, uploadedBy: me(),
        version: 1, createdAt: now(), url: "#",
      });
      t.updatedAt = now();
      out = t;
    });
    return out!;
  },
};

/* ═══════════ CHAT ═══════════ */
export const chatApi = {
  async conversations(): Promise<Conversation[]> {
    await latency();
    return [...db.get().conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async messages(conversationId: string): Promise<Message[]> {
    await latency();
    return db.get().messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async send(conversationId: string, body: string, replyToId?: string): Promise<Message> {
    await latency();
    const m: Message = {
      id: uid("msg"), conversationId, senderId: me().id, sender: me(), body, replyToId,
      mentions: [...body.matchAll(/@([\w.آ-ی]+)/g)].map((x) => x[1]),
      reactions: [], attachments: [], readByIds: [me().id], createdAt: now(), updatedAt: now(),
    };
    db.update((d) => {
      if (replyToId) m.replyTo = d.messages.find((x) => x.id === replyToId);
      d.messages.push(m);
      const c = d.conversations.find((x) => x.id === conversationId);
      if (c) { c.lastMessage = m; c.updatedAt = now(); }
    });
    return m;
  },
  async edit(messageId: string, body: string): Promise<Message> {
    await latency();
    let out: Message | undefined;
    db.update((d) => {
      const m = d.messages.find((x) => x.id === messageId);
      if (!m) throw new ApiError("not_found", "پیام یافت نشد.", 404);
      m.body = body; m.isEdited = true; m.updatedAt = now();
      out = m;
    });
    return out!;
  },
  async remove(messageId: string): Promise<void> {
    await latency();
    db.update((d) => {
      d.messages = d.messages.filter((x) => x.id !== messageId);
    });
  },
  async react(messageId: string, emoji: string): Promise<Message> {
    await latency();
    let out: Message | undefined;
    db.update((d) => {
      const m = d.messages.find((x) => x.id === messageId);
      if (!m) throw new ApiError("not_found", "پیام یافت نشد.", 404);
      const r = m.reactions.find((x) => x.emoji === emoji);
      if (r) {
        r.userIds = r.userIds.includes(me().id) ? r.userIds.filter((x) => x !== me().id) : [...r.userIds, me().id];
        if (!r.userIds.length) m.reactions = m.reactions.filter((x) => x.emoji !== emoji);
      } else {
        m.reactions.push({ emoji, userIds: [me().id] });
      }
      out = m;
    });
    return out!;
  },
  async togglePin(messageId: string): Promise<Message> {
    await latency();
    let out: Message | undefined;
    db.update((d) => {
      const m = d.messages.find((x) => x.id === messageId);
      if (m) { m.isPinned = !m.isPinned; out = m; }
    });
    return out!;
  },
  async markRead(conversationId: string): Promise<void> {
    await latency();
    db.update((d) => {
      const c = d.conversations.find((x) => x.id === conversationId);
      if (c) c.unreadCount = 0;
      d.messages.forEach((m) => {
        if (m.conversationId === conversationId && !m.readByIds.includes(me().id)) m.readByIds.push(me().id);
      });
    });
  },
  async setBackground(conversationId: string, bg: ChatBackground): Promise<void> {
    await latency();
    db.update((d) => {
      const c = d.conversations.find((x) => x.id === conversationId);
      if (c) c.background = bg;
    });
  },
  async createGroup(title: string, memberIds: string[]): Promise<Conversation> {
    await latency();
    const c: Conversation = {
      id: uid("c"), kind: "group", title, memberIds: [me().id, ...memberIds],
      members: [me(), ...memberIds.map((id) => db.user(id)!).filter(Boolean)],
      unreadCount: 0, updatedAt: now(),
      background: { type: "default", value: "default", overlayOpacity: 0 },
    };
    db.update((d) => { d.conversations.unshift(c); });
    return c;
  },
  /** Find-or-create the project channel (idempotent). */
  async ensureProjectChannel(projectId: string): Promise<Conversation> {
    await latency();
    const existing = db.get().conversations.find((c) => c.projectId === projectId && c.kind === "project_channel");
    if (existing) return existing;
    const p = db.project(projectId);
    if (!p) throw new ApiError("not_found", "پروژه یافت نشد.", 404);
    const memberIds = (db.get().members[projectId] ?? []).map((m) => m.userId);
    if (!memberIds.includes(me().id)) memberIds.unshift(me().id);
    const c: Conversation = {
      id: uid("c"), kind: "project_channel", projectId, title: `کانال ${p.name}`,
      memberIds, members: memberIds.map((id) => db.user(id)!).filter(Boolean),
      unreadCount: 0, updatedAt: now(),
      background: { type: "default", value: "default", overlayOpacity: 0 },
    };
    db.update((d) => { d.conversations.unshift(c); });
    return c;
  },
  async toggleMute(conversationId: string): Promise<void> {
    await latency();
    db.update((d) => {
      const c = d.conversations.find((x) => x.id === conversationId);
      if (c) c.isMuted = !c.isMuted;
    });
  },
};

/* ═══════════ NOTIFICATIONS ═══════════ */
export const notificationsApi = {
  async list(): Promise<NotificationItem[]> {
    await latency();
    return [...db.get().notifications]
      .filter((n) => n.userId === me().id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async markRead(id: string): Promise<void> {
    await latency();
    db.update((d) => {
      const n = d.notifications.find((x) => x.id === id && x.userId === me().id);
      if (n) n.isRead = true;
    });
  },
  async markAllRead(): Promise<void> {
    await latency();
    db.update((d) => { d.notifications.forEach((n) => { if (n.userId === me().id) n.isRead = true; }); });
  },
};

/* ═══════════ CALENDAR ═══════════ */
export const calendarApi = {
  async events(projectId?: string): Promise<CalendarEvent[]> {
    await latency();
    const evs = db.get().events.filter((e) => !projectId || e.projectId === projectId || !e.projectId);
    // Task deadlines as events
    const tasks = db.get().tasks.filter((t) => t.dueDate && (!projectId || t.projectId === projectId) && !t.isArchived);
    const taskEvs: CalendarEvent[] = tasks.map((t) => ({
      id: `t_${t.id}`, title: t.title, kind: "task", projectId: t.projectId, taskId: t.id,
      startsAt: t.dueDate!, endsAt: t.dueDate!, allDay: true,
      color: t.priority === "critical" ? "#dc2626" : t.priority === "high" ? "#f59e0b" : "#16a34a",
    }));
    return [...evs, ...taskEvs];
  },
  async create(input: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
    await latency();
    const e: CalendarEvent = { ...input, id: uid("ev") };
    db.update((d) => { d.events.push(e); });
    return e;
  },
  async update(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent> {
    await latency();
    let out: CalendarEvent | undefined;
    db.update((d) => {
      const e = d.events.find((x) => x.id === id);
      if (!e) throw new ApiError("not_found", "رویداد یافت نشد.", 404);
      Object.assign(e, patch);
      out = e;
    });
    return out!;
  },
  async remove(id: string): Promise<void> {
    await latency();
    db.update((d) => { d.events = d.events.filter((x) => x.id !== id); });
  },
};

/* ═══════════ FILES ═══════════ */
export const filesApi = {
  async list(projectId?: string): Promise<ProjectFile[]> {
    await latency();
    const all = db.get().files;
    return [...(projectId ? all.filter((f) => f.projectId === projectId) : all)]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async upload(projectId: string, folder: string, meta: { fileName: string; mimeType: string; sizeBytes: number; blob?: Blob }): Promise<ProjectFile> {
    await latency();
    const f: ProjectFile = {
      id: uid("f"), projectId, folder, fileName: meta.fileName, mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes, version: 1, uploadedById: me().id, uploadedBy: me(),
      createdAt: now(), updatedAt: now(), url: "#",
    };
    if (meta.blob) storeFileBlob(f.id, meta.blob);
    db.update((d) => { d.files.unshift(f); });
    pushActivity({ projectId, actorId: me().id, action: "file.upload", actionFa: "فایل بارگذاری کرد", entityType: "file", entityTitle: f.fileName });
    return f;
  },
  async rename(id: string, fileName: string): Promise<ProjectFile> {
    await latency();
    let out: ProjectFile | undefined;
    db.update((d) => {
      const f = d.files.find((x) => x.id === id);
      if (!f) throw new ApiError("not_found", "فایل یافت نشد.", 404);
      f.fileName = fileName; f.updatedAt = now();
      out = f;
    });
    return out!;
  },
  async move(id: string, folder: string): Promise<ProjectFile> {
    await latency();
    let out: ProjectFile | undefined;
    db.update((d) => {
      const f = d.files.find((x) => x.id === id);
      if (!f) throw new ApiError("not_found", "فایل یافت نشد.", 404);
      f.folder = folder; f.updatedAt = now();
      out = f;
    });
    return out!;
  },
  async remove(id: string): Promise<void> {
    await latency();
    db.update((d) => { d.files = d.files.filter((x) => x.id !== id); });
    pushActivity({ actorId: me().id, action: "file.delete", actionFa: "فایل را حذف کرد", entityType: "file" });
  },
};

/* ═══════════ REPORTS ═══════════ */
export const reportsApi = {
  /** Real completion trend: created vs completed per day (last 14 days). */
  async trend(projectId?: string): Promise<{ date: string; created: number; completed: number }[]> {
    await latency();
    const tasks = db.get().tasks.filter((t) => (!projectId || t.projectId === projectId) && !t.isArchived);
    const points: { date: string; created: number; completed: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400_000);
      const key = day.toISOString().slice(0, 10);
      points.push({
        date: key,
        created: tasks.filter((t) => t.createdAt.slice(0, 10) === key).length,
        completed: tasks.filter((t) => t.completedAt?.slice(0, 10) === key).length,
      });
    }
    return points;
  },
  async workload(projectId?: string): Promise<WorkloadRow[]> {
    await latency();
    const d = db.get();
    const tasks = d.tasks.filter((t) => (!projectId || t.projectId === projectId) && !t.isArchived);
    const byUser = new Map<string, Task[]>();
    tasks.forEach((t) => t.assigneeIds.forEach((aid) => {
      if (!byUser.has(aid)) byUser.set(aid, []);
      byUser.get(aid)!.push(t);
    }));
    const rows: WorkloadRow[] = [];
    byUser.forEach((ts, userId) => {
      const user = db.user(userId);
      if (!user) return;
      const boardOf = new Map(d.boards.map((b) => [b.id, b]));
      const done = ts.filter((t) => isTaskDone(t, boardOf.get(t.boardId))).length;
      const overdue = ts.filter((t) => {
        if (isTaskDone(t, boardOf.get(t.boardId))) return false;
        return !!t.dueDate && new Date(t.dueDate).getTime() < Date.now();
      }).length;
      rows.push({
        userId, user, assigned: ts.length, completed: done, overdue,
        estimateMinutes: ts.reduce((s, t) => s + (t.estimateMinutes ?? 0), 0),
        spentMinutes: ts.reduce((s, t) => s + t.spentMinutes, 0),
        capacityMinutes: 40 * 60 * 2, // 2 weeks
      });
    });
    return rows.sort((a, b) => b.assigned - a.assigned);
  },
  async burn(projectId: string): Promise<BurnPoint[]> {
    await latency();
    // Real burndown from actual task creation/completion dates (last 14 days).
    const tasks = db.get().tasks.filter((t) => t.projectId === projectId && !t.isArchived);
    const days = 14;
    const points: BurnPoint[] = [];
    const startScope = tasks.filter((t) => new Date(t.createdAt).getTime() <= Date.now() - days * 86400_000).length;
    for (let i = days; i >= 0; i--) {
      const dayEnd = new Date(Date.now() - i * 86400_000);
      dayEnd.setHours(23, 59, 59, 999);
      const end = dayEnd.getTime();
      const scope = tasks.filter((t) => new Date(t.createdAt).getTime() <= end).length;
      const doneCount = tasks.filter((t) => t.completedAt && new Date(t.completedAt).getTime() <= end).length;
      points.push({
        date: dayEnd.toISOString().slice(0, 10),
        remaining: Math.max(0, scope - doneCount),
        ideal: Math.max(0, Math.round(startScope * (i / days))),
      });
    }
    return points;
  },
  async streams(projectId: string): Promise<StreamProgress[]> {
    await latency();
    const d = db.get();
    const boardOf = new Map(d.boards.map((b) => [b.id, b]));
    // Tasks without a stream are grouped under "other" rather than dropped.
    const tasks = d.tasks.filter((t) => t.projectId === projectId && !t.isArchived);
    const map = new Map<string, { total: number; done: number }>();
    tasks.forEach((t) => {
      const s = t.stream ?? "other";
      if (!map.has(s)) map.set(s, { total: 0, done: 0 });
      const e = map.get(s)!;
      e.total += 1;
      if (isTaskDone(t, boardOf.get(t.boardId))) e.done += 1;
    });
    return [...map.entries()].map(([stream, v]) => ({
      stream: stream as StreamProgress["stream"],
      total: v.total, done: v.done,
      progress: v.total ? Math.round((v.done / v.total) * 100) : 0,
    }));
  },
  /** Per-project completion stats for the manager overview. */
  async projects(): Promise<{ id: string; key: string; name: string; iconColor: string; total: number; done: number; progress: number }[]> {
    await latency();
    const d = db.get();
    return d.projects.map((p) => {
      const tasks = d.tasks.filter((t) => t.projectId === p.id && !t.isArchived);
      const boardOf = new Map(d.boards.map((b) => [b.id, b]));
      const done = tasks.filter((t) => isTaskDone(t, boardOf.get(t.boardId))).length;
      return {
        id: p.id, key: p.key, name: p.name, iconColor: p.iconColor,
        total: tasks.length, done,
        progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      };
    });
  },
  async overview(projectId?: string): Promise<{
    total: number; completed: number; inProgress: number; blocked: number;
    overdue: number; dueSoon: number; completionRate: number;
    plannedMinutes: number; spentMinutes: number;
  }> {
    await latency();
    const d = db.get();
    const tasks = d.tasks.filter((t) => (!projectId || t.projectId === projectId) && !t.isArchived);
    const boardOf = new Map(d.boards.map((b) => [b.id, b]));
    const isDone = (t: Task) => isTaskDone(t, boardOf.get(t.boardId));
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now() && !isDone(t)).length;
    const dueSoon = tasks.filter((t) => {
      if (!t.dueDate || isDone(t)) return false;
      const dt = new Date(t.dueDate).getTime() - Date.now();
      return dt > 0 && dt < 48 * 3600_000;
    }).length;
    const completed = tasks.filter(isDone).length;
    return {
      total: tasks.length, completed,
      inProgress: tasks.filter((t) => ["in_progress", "fixing", "review", "testing"].includes(t.status)).length,
      blocked: tasks.filter((t) => t.isBlocked).length,
      overdue, dueSoon,
      completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      plannedMinutes: tasks.reduce((s, t) => s + (t.estimateMinutes ?? 0), 0),
      spentMinutes: tasks.reduce((s, t) => s + t.spentMinutes, 0),
    };
  },
};

/* ═══════════ GLOBAL SEARCH ═══════════ */
export interface SearchResults {
  projects: Project[];
  tasks: Task[];
  users: User[];
  files: ProjectFile[];
  messages: Message[];
}
export const searchApi = {
  async global(q: string): Promise<SearchResults> {
    await latency();
    const s = q.trim();
    if (!s) return { projects: [], tasks: [], users: [], files: [], messages: [] };
    const d = db.get();
    return {
      projects: d.projects.filter((p) => matchesText(p.name, s) || matchesText(p.key, s)).slice(0, 5),
      tasks: d.tasks.filter((t) => !t.isArchived && matchesText(t.title, s)).slice(0, 8),
      users: d.users.filter((u) => matchesText(u.name, s) || matchesText(u.username, s)).slice(0, 5),
      files: d.files.filter((f) => matchesText(f.fileName, s)).slice(0, 5),
      messages: d.messages.filter((m) => matchesText(m.body, s)).slice(0, 5),
    };
  },
};
