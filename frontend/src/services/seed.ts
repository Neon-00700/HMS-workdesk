/* ─── Initial workspace data: system config ONLY — no sample content ───
   The workspace starts EMPTY with a single administrator account:

     username: admin      password: admin123

   Everything else (users, projects, boards, tasks, …) is created by the
   user through the UI and persisted to the browser's localStorage. */
import type { User, Role, Label } from "@/types/models";
import type { PermissionKey } from "@/config/permissions";
import { hashPassword } from "@/lib/password";

const ALL_PERMS: PermissionKey[] = [
  "projects.view", "projects.create", "projects.edit", "projects.delete", "projects.manage_members",
  "boards.view", "boards.create", "boards.edit", "boards.delete", "boards.manage_columns",
  "tasks.view", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign", "tasks.move", "tasks.manage_dependencies",
  "chat.view", "chat.send", "chat.edit", "chat.delete", "chat.manage",
  "files.view", "files.upload", "files.download", "files.delete",
  "reports.view", "calendar.manage",
  "users.view", "users.create", "users.edit", "users.disable",
  "roles.manage", "system.settings", "audit.view",
];

export const ADMIN_ID = "u_admin";
export const ADMIN_CREDENTIALS = { username: "admin", password: "admin123" };

export function buildAdminUser(): User {
  const now = new Date().toISOString();
  return {
    id: ADMIN_ID,
    name: "مدیر سامانه",
    username: ADMIN_CREDENTIALS.username,
    email: "admin@hamyaran.app",
    role: "Admin",
    roleTitleFa: "مدیر سامانه",
    department: "مدیریت",
    position: "راهبر سامانه",
    status: "active",
    isOnline: true,
    lastSeenAt: now,
    permissions: [...ALL_PERMS],
    passwordHash: hashPassword(ADMIN_CREDENTIALS.password),
    forcePasswordChange: false,
    createdAt: now,
  };
}

export const SEED_ROLES: Role[] = [
  { id: "r_admin", name: "Admin", titleFa: "مدیر سامانه", permissions: [...ALL_PERMS], membersCount: 1, isSystem: true },
  {
    id: "r_owner", name: "Project Owner", titleFa: "مالک پروژه",
    permissions: ["projects.view", "projects.create", "projects.edit", "projects.manage_members", "boards.view", "boards.create", "boards.edit", "boards.manage_columns", "tasks.view", "tasks.create", "tasks.edit", "tasks.assign", "tasks.move", "tasks.manage_dependencies", "chat.view", "chat.send", "chat.edit", "chat.delete", "files.view", "files.upload", "files.download", "reports.view", "calendar.manage", "users.view"],
    membersCount: 0, isSystem: true,
  },
  {
    id: "r_pm", name: "Project Manager", titleFa: "مدیر پروژه",
    permissions: ["projects.view", "projects.edit", "projects.manage_members", "boards.view", "boards.create", "boards.edit", "boards.manage_columns", "tasks.view", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign", "tasks.move", "tasks.manage_dependencies", "chat.view", "chat.send", "chat.edit", "chat.delete", "chat.manage", "files.view", "files.upload", "files.download", "files.delete", "reports.view", "calendar.manage", "users.view"],
    membersCount: 0, isSystem: true,
  },
  {
    id: "r_lead", name: "Team Lead", titleFa: "سرپرست تیم",
    permissions: ["projects.view", "boards.view", "boards.edit", "boards.manage_columns", "tasks.view", "tasks.create", "tasks.edit", "tasks.assign", "tasks.move", "tasks.manage_dependencies", "chat.view", "chat.send", "chat.edit", "chat.delete", "files.view", "files.upload", "files.download", "reports.view", "calendar.manage", "users.view"],
    membersCount: 0, isSystem: true,
  },
  {
    id: "r_dev", name: "Developer", titleFa: "توسعه‌دهنده",
    permissions: ["projects.view", "boards.view", "tasks.view", "tasks.create", "tasks.edit", "tasks.move", "chat.view", "chat.send", "chat.edit", "chat.delete", "files.view", "files.upload", "files.download", "calendar.manage", "users.view"],
    membersCount: 0, isSystem: true,
  },
  {
    id: "r_designer", name: "Designer", titleFa: "طراح",
    permissions: ["projects.view", "boards.view", "tasks.view", "tasks.create", "tasks.edit", "tasks.move", "chat.view", "chat.send", "chat.edit", "chat.delete", "files.view", "files.upload", "files.download", "users.view"],
    membersCount: 0, isSystem: true,
  },
  {
    id: "r_qa", name: "QA", titleFa: "کارشناس تست",
    permissions: ["projects.view", "boards.view", "tasks.view", "tasks.create", "tasks.edit", "tasks.move", "chat.view", "chat.send", "chat.edit", "chat.delete", "files.view", "files.upload", "files.download", "users.view"],
    membersCount: 0, isSystem: true,
  },
  {
    id: "r_devops", name: "DevOps", titleFa: "کارشناس زیرساخت",
    permissions: ["projects.view", "boards.view", "tasks.view", "tasks.create", "tasks.edit", "tasks.move", "chat.view", "chat.send", "chat.edit", "chat.delete", "files.view", "files.upload", "files.download", "users.view"],
    membersCount: 0, isSystem: true,
  },
  {
    id: "r_emp", name: "Employee", titleFa: "کارمند",
    permissions: ["projects.view", "boards.view", "tasks.view", "tasks.create", "tasks.edit", "chat.view", "chat.send", "files.view", "files.download", "users.view"],
    membersCount: 0, isSystem: true,
  },
  {
    id: "r_obs", name: "Observer", titleFa: "ناظر",
    permissions: ["projects.view", "boards.view", "tasks.view", "chat.view", "files.view", "users.view"],
    membersCount: 0, isSystem: true,
  },
];

/** Default label taxonomy (workspace config, not sample content). */
export const SEED_LABELS: Label[] = [
  { id: "l_bug", name: "باگ", color: "#dc2626" },
  { id: "l_feature", name: "قابلیت", color: "#16a34a" },
  { id: "l_ui", name: "رابط کاربری", color: "#0ea5e9" },
  { id: "l_api", name: "API", color: "#8b5cf6" },
  { id: "l_urgent", name: "فوری", color: "#f97316" },
  { id: "l_docs", name: "مستندات", color: "#64748b" },
  { id: "l_perf", name: "پرفورمنس", color: "#14b8a6" },
  { id: "l_sec", name: "امنیت", color: "#a21caf" },
];
