/* Granular permission catalog. Backend enforces; frontend mirrors for UX. */

export const PERMISSIONS = {
  // Projects
  "projects.view": "مشاهده پروژه‌ها",
  "projects.create": "ایجاد پروژه",
  "projects.edit": "ویرایش پروژه",
  "projects.delete": "حذف پروژه",
  "projects.manage_members": "مدیریت اعضای پروژه",
  // Boards
  "boards.view": "مشاهده بوردها",
  "boards.create": "ایجاد بورد",
  "boards.edit": "ویرایش بورد",
  "boards.delete": "حذف بورد",
  "boards.manage_columns": "مدیریت ستون‌ها",
  // Tasks
  "tasks.view": "مشاهده وظایف",
  "tasks.create": "ایجاد وظیفه",
  "tasks.edit": "ویرایش وظیفه",
  "tasks.delete": "حذف وظیفه",
  "tasks.assign": "تخصیص وظیفه",
  "tasks.move": "جابه‌جایی وظیفه",
  "tasks.manage_dependencies": "مدیریت وابستگی‌ها",
  // Chat
  "chat.view": "مشاهده گفتگوها",
  "chat.send": "ارسال پیام",
  "chat.edit": "ویرایش پیام",
  "chat.delete": "حذف پیام",
  "chat.manage": "مدیریت گفتگوها",
  // Files
  "files.view": "مشاهده فایل‌ها",
  "files.upload": "آپلود فایل",
  "files.download": "دانلود فایل",
  "files.delete": "حذف فایل",
  // Reports / calendar
  "reports.view": "مشاهده گزارش‌ها",
  "calendar.manage": "مدیریت رویدادها",
  // Users / admin
  "users.view": "مشاهده کاربران",
  "users.create": "ایجاد کاربر",
  "users.edit": "ویرایش کاربر",
  "users.disable": "غیرفعال‌سازی کاربر",
  "roles.manage": "مدیریت نقش‌ها",
  "system.settings": "تنظیمات سامانه",
  "audit.view": "مشاهده لاگ حسابرسی",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_GROUPS: { title: string; keys: PermissionKey[] }[] = [
  {
    title: "پروژه‌ها",
    keys: ["projects.view", "projects.create", "projects.edit", "projects.delete", "projects.manage_members"],
  },
  {
    title: "بوردها",
    keys: ["boards.view", "boards.create", "boards.edit", "boards.delete", "boards.manage_columns"],
  },
  {
    title: "وظایف",
    keys: ["tasks.view", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign", "tasks.move", "tasks.manage_dependencies"],
  },
  { title: "گفتگو", keys: ["chat.view", "chat.send", "chat.edit", "chat.delete", "chat.manage"] },
  { title: "فایل‌ها", keys: ["files.view", "files.upload", "files.download", "files.delete"] },
  { title: "گزارش و تقویم", keys: ["reports.view", "calendar.manage"] },
  {
    title: "کاربران و مدیریت",
    keys: ["users.view", "users.create", "users.edit", "users.disable", "roles.manage", "system.settings", "audit.view"],
  },
];
