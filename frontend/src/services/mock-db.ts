/* ─── Central in-memory database (local demo adapter) ──────────────
   Mirrors the backend API contract. All reads/writes go through `db`.
   Mutations persist to localStorage so the demo keeps user changes.
   The workspace starts EMPTY with a single admin account (see seed.ts). */
import type {
  User, Project, Board, Task, Conversation, Message,
  NotificationItem, CalendarEvent, ProjectFile, ActivityEntry, Role,
  ProjectMember, Milestone, Epic,
} from "@/types/models";
import { SEED_ROLES, SEED_LABELS, ADMIN_ID, buildAdminUser } from "./seed";
import { useAuthStore } from "@/stores/auth-store";

const STORAGE_KEY = "hamyaran_db_v2";
const LEGACY_KEYS = ["hamyaran_db_v1"];

export interface DBShape {
  users: User[];
  roles: Role[];
  projects: Project[];
  boards: Board[];
  tasks: Task[];
  members: Record<string, ProjectMember[]>;
  milestones: Milestone[];
  epics: Epic[];
  conversations: Conversation[];
  messages: Message[];
  notifications: NotificationItem[];
  events: CalendarEvent[];
  files: ProjectFile[];
  activity: ActivityEntry[];
}

function freshDB(): DBShape {
  return {
    users: [buildAdminUser()],
    roles: structuredClone(SEED_ROLES),
    projects: [],
    boards: [],
    tasks: [],
    members: {},
    milestones: [],
    epics: [],
    conversations: [],
    messages: [],
    notifications: [],
    events: [],
    files: [],
    activity: [],
  };
}

/** A valid snapshot must at least carry a users array. */
function isValidShape(v: unknown): v is DBShape {
  return !!v && typeof v === "object" && Array.isArray((v as DBShape).users);
}

/** Backfill human keys (PROJECTKEY-12) for tasks created before keys existed. */
function backfillTaskKeys(d: DBShape): void {
  const counters = new Map<string, number>();
  d.tasks.forEach((t) => {
    const m = /^.+?-(\d+)$/.exec(t.key ?? "");
    if (m) counters.set(t.projectId, Math.max(counters.get(t.projectId) ?? 0, Number(m[1])));
  });
  d.tasks.forEach((t) => {
    if (!t.key) {
      const pkey = d.projects.find((p) => p.id === t.projectId)?.key ?? "TSK";
      const n = (counters.get(t.projectId) ?? 0) + 1;
      counters.set(t.projectId, n);
      t.key = `${pkey}-${n}`;
    }
  });
}

class MockDB {
  private data: DBShape | null = null;
  private listeners = new Set<() => void>();

  private ensure(): DBShape {
    if (this.data) return this.data;
    if (typeof window !== "undefined") {
      try {
        LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isValidShape(parsed)) {
            // Safety net: the workspace always keeps at least the admin.
            if (parsed.users.length === 0) parsed.users = [buildAdminUser()];
            backfillTaskKeys(parsed);
            this.data = parsed;
            return this.data;
          }
        }
      } catch { /* corrupted snapshot -> reseed */ }
    }
    this.data = freshDB();
    return this.data;
  }

  get(): DBShape {
    return this.ensure();
  }

  /** Mutate + persist + notify realtime subscribers. */
  update(fn: (db: DBShape) => void): void {
    fn(this.ensure());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch { /* quota -> ignore */ }
    this.listeners.forEach((l) => l());
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  reset(): void {
    this.data = freshDB();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch { /* ignore */ }
    this.listeners.forEach((l) => l());
  }

  // ── lookups ──
  /** The currently signed-in user (falls back to admin when signed out). */
  currentUser(): User {
    const d = this.ensure();
    const sid = useAuthStore.getState().user?.id;
    return d.users.find((u) => u.id === sid)
      ?? d.users.find((u) => u.id === ADMIN_ID)
      ?? d.users[0];
  }
  user(id: string): User | undefined {
    return this.ensure().users.find((u) => u.id === id);
  }
  project(id: string): Project | undefined {
    return this.ensure().projects.find((p) => p.id === id);
  }
  boardsOf(projectId: string): Board[] {
    return this.ensure().boards.filter((b) => b.projectId === projectId);
  }
  board(id: string): Board | undefined {
    return this.ensure().boards.find((b) => b.id === id);
  }
  tasksOf(boardId: string): Task[] {
    return this.ensure().tasks
      .filter((t) => t.boardId === boardId && !t.isArchived)
      .sort((a, b) => a.order - b.order);
  }
  task(id: string): Task | undefined {
    return this.ensure().tasks.find((t) => t.id === id);
  }
  projectTasks(projectId: string): Task[] {
    return this.ensure().tasks.filter((t) => t.projectId === projectId && !t.isArchived);
  }
}

export const db = new MockDB();
export { SEED_LABELS };

export function pushActivity(entry: Omit<ActivityEntry, "id" | "createdAt" | "actor"> & { actorId: string }): void {
  const actor = db.user(entry.actorId);
  db.update((d) => {
    d.activity.unshift({
      ...entry, actor, id: `a_${Date.now().toString(36)}`, createdAt: new Date().toISOString(),
    } as ActivityEntry);
    d.activity = d.activity.slice(0, 300);
  });
}

export function pushNotification(n: Omit<NotificationItem, "id" | "createdAt" | "isRead">): void {
  db.update((d) => {
    d.notifications.unshift({ ...n, id: `n_${Date.now().toString(36)}`, createdAt: new Date().toISOString(), isRead: false });
  });
}
