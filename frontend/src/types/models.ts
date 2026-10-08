/* ─── Shared domain types (mirror backend DTOs) ─────────────────── */

export type ID = string;

export type ThemeMode = "light" | "dark" | "system";

export interface Role {
  id: ID;
  name: string;
  titleFa: string;
  permissions: string[];
  membersCount: number;
  isSystem?: boolean;
}

export interface User {
  id: ID;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: string; // role name
  roleTitleFa: string;
  department: string;
  position: string;
  about?: string;
  status: "active" | "invited" | "disabled";
  isOnline: boolean;
  lastSeenAt: string;
  permissions: string[];
  /** Demo-adapter only: salted demo-grade hash. Never exposed by the real API. */
  passwordHash?: string;
  forcePasswordChange?: boolean;
  createdAt: string;
}

export interface Project {
  id: ID;
  name: string;
  key: string;
  description: string;
  iconColor: string;
  status: "active" | "on_hold" | "completed" | "archived";
  health: "on_track" | "at_risk" | "off_track";
  ownerId: ID;
  startDate: string;
  targetDate: string;
  progress: number; // 0..100
  membersCount: number;
  openTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  lastActivityAt: string;
  isFavorite?: boolean;
}

export interface ProjectMember {
  userId: ID;
  user: User;
  roleInProject: string;
  joinedAt: string;
}

export type TaskPriority = "lowest" | "low" | "medium" | "high" | "critical";
export type TaskStatus = string; // column key

export interface Label {
  id: ID;
  name: string;
  color: string;
}

export interface Subtask {
  id: ID;
  title: string;
  isDone: boolean;
  assigneeId?: ID;
  dueDate?: string;
}

export interface ChecklistItem {
  id: ID;
  text: string;
  isDone: boolean;
  assigneeId?: ID;
}

export interface TaskDependency {
  id: ID;
  taskId: ID;
  dependsOnTaskId: ID;
  kind: "blocks" | "blocked_by" | "depends_on" | "related_to";
  dependsOnTask?: Task;
}

export interface Comment {
  id: ID;
  taskId?: ID;
  authorId: ID;
  author?: User;
  body: string;
  mentions: ID[];
  createdAt: string;
  updatedAt: string;
  edited?: boolean;
}

export interface Attachment {
  id: ID;
  taskId?: ID;
  fileName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: ID;
  uploadedBy?: User;
  version: number;
  createdAt: string;
  url: string;
}

export interface TimeEntry {
  id: ID;
  taskId: ID;
  userId: ID;
  user?: User;
  minutes: number;
  note?: string;
  startedAt: string;
  endedAt?: string;
  isRunning?: boolean;
}

export interface Task {
  id: ID;
  key: string; // human key: PROJECTKEY-12
  projectId: ID;
  boardId: ID;
  columnId: ID;
  epicId?: ID;
  parentId?: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: ID[];
  assignees?: User[];
  reviewerId?: ID;
  reviewer?: User;
  watcherIds: ID[];
  creatorId: ID;
  creator?: User;
  startDate?: string;
  dueDate?: string;
  estimateMinutes?: number;
  spentMinutes: number;
  labels: Label[];
  stream?: "frontend" | "backend" | "database" | "infra" | "qa" | "design" | "other";
  subtasks: Subtask[];
  checklist: ChecklistItem[];
  dependencies: TaskDependency[];
  blockedBy: ID[];
  blocking: ID[];
  comments: Comment[];
  attachments: Attachment[];
  timeEntries: TimeEntry[];
  progress: number;
  order: number;
  isBlocked: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BoardColumn {
  id: ID;
  boardId: ID;
  title: string;
  key: string;
  color: string;
  order: number;
  wipLimit?: number;
  isDoneColumn?: boolean;
}

export interface Board {
  id: ID;
  projectId: ID;
  name: string;
  kind: "main" | "urgent" | "custom";
  description?: string;
  columns: BoardColumn[];
  isDefault?: boolean;
  createdAt: string;
}

export interface Epic {
  id: ID;
  projectId: ID;
  boardId?: ID;
  title: string;
  description?: string;
  color: string;
  progress: number;
  taskIds: ID[];
}

export interface Milestone {
  id: ID;
  projectId: ID;
  title: string;
  dueDate: string;
  isDone: boolean;
  progress: number;
}

export type ConversationKind = "project_channel" | "dm" | "group";

export interface Conversation {
  id: ID;
  kind: ConversationKind;
  title: string;
  projectId?: ID;
  channelKey?: string;
  memberIds: ID[];
  members?: User[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  background?: ChatBackground;
  updatedAt: string;
  typingUserIds?: ID[];
}

export interface ChatBackground {
  type: "default" | "color" | "pattern" | "image";
  value: string; // color hex | pattern key | image url
  overlayOpacity: number; // 0..0.9 readability overlay
}

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  sender?: User;
  body: string;
  replyToId?: ID;
  replyTo?: Message;
  mentions: ID[];
  reactions: { emoji: string; userIds: ID[] }[];
  attachments: Attachment[];
  isEdited?: boolean;
  isPinned?: boolean;
  readByIds: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: ID;
  userId: ID;
  type:
    | "task_assigned"
    | "mention"
    | "deadline_soon"
    | "deadline_missed"
    | "comment"
    | "project"
    | "file"
    | "message"
    | "dependency";
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: ID;
  title: string;
  kind: "task" | "milestone" | "meeting" | "project_event" | "personal";
  projectId?: ID;
  taskId?: ID;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  color?: string;
  description?: string;
  attendees?: ID[];
}

export interface ProjectFile {
  id: ID;
  projectId: ID;
  folder: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  uploadedById: ID;
  uploadedBy?: User;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface ActivityEntry {
  id: ID;
  projectId?: ID;
  actorId: ID;
  actor?: User;
  action: string;
  actionFa: string;
  entityType: string;
  entityId?: ID;
  entityTitle?: string;
  detail?: string;
  createdAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  errors?: Record<string, string[]>;
}

/* ─── Reports ─── */
export interface WorkloadRow {
  userId: ID;
  user: User;
  assigned: number;
  completed: number;
  overdue: number;
  estimateMinutes: number;
  spentMinutes: number;
  capacityMinutes: number;
}

export interface BurnPoint {
  date: string;
  remaining: number;
  ideal: number;
}

export interface StreamProgress {
  stream: NonNullable<Task["stream"]>;
  total: number;
  done: number;
  progress: number;
}
