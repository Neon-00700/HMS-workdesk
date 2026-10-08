import type { TaskPriority, Task } from "@/types/models";

export const APP_NAME = "همیاران ورک‌اسپیس";
export const APP_NAME_EN = "Hamyaran Workdesk";
export const WORKSPACE_NAME = "همیاران";

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  lowest: { label: "خیلی کم", color: "text-slate-500", bg: "bg-slate-500/10" },
  low: { label: "کم", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10" },
  medium: { label: "متوسط", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  high: { label: "زیاد", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
  critical: { label: "بحرانی", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
};

export const STREAM_META: Record<NonNullable<Task["stream"]>, { label: string; color: string }> = {
  frontend: { label: "فرانت‌اند", color: "#0ea5e9" },
  backend: { label: "بک‌اند", color: "#8b5cf6" },
  database: { label: "دیتابیس", color: "#f59e0b" },
  infra: { label: "زیرساخت", color: "#64748b" },
  qa: { label: "تست", color: "#ec4899" },
  design: { label: "دیزاین", color: "#14b8a6" },
  other: { label: "سایر", color: "#22c55e" },
};

export const PROJECT_STATUS_META = {
  active: { label: "فعال", color: "#16a34a" },
  on_hold: { label: "متوقف", color: "#f59e0b" },
  completed: { label: "تکمیل‌شده", color: "#0ea5e9" },
  archived: { label: "بایگانی", color: "#64748b" },
} as const;

export const HEALTH_META = {
  on_track: { label: "سالم", color: "#16a34a" },
  at_risk: { label: "در خطر", color: "#f59e0b" },
  off_track: { label: "بحرانی", color: "#dc2626" },
} as const;

export const FILE_FOLDERS = ["دیزاین", "اسناد", "توسعه", "گزارش‌ها", "سایر"] as const;

/* Upload policies — client mirrors backend FilePolicy. */
export interface UploadPolicy {
  accept: string; // input accept attr
  extensions: string[];
  maxSizeBytes: number;
  maxFiles: number;
  label: string;
}

export const UPLOAD_POLICIES: Record<string, UploadPolicy> = {
  avatar: {
    accept: "image/png,image/jpeg,image/webp",
    extensions: ["png", "jpg", "jpeg", "webp"],
    maxSizeBytes: 2 * 1024 * 1024,
    maxFiles: 1,
    label: "تصویر پروفایل (فقط PNG/JPG/WebP تا ۲ مگابایت)",
  },
  chatImage: {
    accept: "image/png,image/jpeg,image/webp,image/gif",
    extensions: ["png", "jpg", "jpeg", "webp", "gif"],
    maxSizeBytes: 10 * 1024 * 1024,
    maxFiles: 5,
    label: "تصویر (تا ۱۰ مگابایت)",
  },
  chatFile: {
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.png,.jpg,.jpeg,.webp",
    extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "png", "jpg", "jpeg", "webp"],
    maxSizeBytes: 25 * 1024 * 1024,
    maxFiles: 5,
    label: "سند یا تصویر (تا ۲۵ مگابایت)",
  },
  taskAttachment: {
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.zip,.png,.jpg,.jpeg,.webp,.fig,.sql",
    extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "zip", "png", "jpg", "jpeg", "webp", "fig", "sql"],
    maxSizeBytes: 50 * 1024 * 1024,
    maxFiles: 10,
    label: "فایل مجاز پروژه (تا ۵۰ مگابایت)",
  },
  projectFile: {
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.zip,.png,.jpg,.jpeg,.webp,.fig,.sql,.csv",
    extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "zip", "png", "jpg", "jpeg", "webp", "fig", "sql", "csv"],
    maxSizeBytes: 100 * 1024 * 1024,
    maxFiles: 10,
    label: "فایل مجاز پروژه (تا ۱۰۰ مگابایت)",
  },
  chatBackground: {
    accept: "image/png,image/jpeg,image/webp",
    extensions: ["png", "jpg", "jpeg", "webp"],
    maxSizeBytes: 5 * 1024 * 1024,
    maxFiles: 1,
    label: "پس‌زمینه گفتگو (تصویر تا ۵ مگابایت)",
  },
};

export const CHAT_BACKGROUND_PRESETS: { key: string; label: string; type: "color" | "pattern"; value: string }[] = [
  { key: "default", label: "پیش‌فرض", type: "color", value: "transparent" },
  { key: "mint", label: "نعنایی", type: "color", value: "#e6f4ec" },
  { key: "sand", label: "شنی", type: "color", value: "#f3ecdd" },
  { key: "sky", label: "آبی", type: "color", value: "#e3eefb" },
  { key: "rose", label: "رز", type: "color", value: "#f8e4e4" },
  { key: "lavender", label: "یاسی", type: "color", value: "#e9e4f7" },
  { key: "dots", label: "نقطه‌ای", type: "pattern", value: "dots" },
  { key: "grid", label: "شبکه‌ای", type: "pattern", value: "grid" },
];
