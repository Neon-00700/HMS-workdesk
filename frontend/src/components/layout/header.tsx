"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Menu, Search, Bell, MessagesSquare, Plus, Sun, Moon, CheckCheck, FolderKanban, CheckSquare, CalendarPlus, UserPlus, Check, LogOut, User as UserIcon, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationItem } from "@/components/shared/notification-item";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useNotifications, useNotifActions, useConversations } from "@/services/queries";
import { toFaDigits, cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  const btn = (active: boolean) =>
    cn(
      "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
      active ? "bg-amber-400/25 text-amber-500" : "text-muted-foreground hover:text-foreground",
    );
  return (
    <div className={cn("flex items-center gap-0.5 rounded-full bg-card p-1 shadow-card", className)} role="group" aria-label="تغییر تم">
      <button onClick={() => setTheme("light")} aria-label="حالت روشن" className={btn(!dark)}>
        <Sun className="h-[18px] w-[18px]" />
      </button>
      <button onClick={() => setTheme("dark")} aria-label="حالت تیره" className={btn(dark)}>
        <Moon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

const circleBtn =
  "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-card transition-colors hover:bg-muted";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white tnum">
      {toFaDigits(count)}
    </span>
  );
}

export function Header() {
  const setMobileNav = useUIStore((s) => s.setMobileNav);
  const setCommand = useUIStore((s) => s.setCommand);
  const openCreateTask = useUIStore((s) => s.openCreateTask);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const can = useAuthStore((s) => s.hasPermission);
  const activePid = useWorkspaceStore((s) => s.activeProjectId);
  const { data: notifs = [] } = useNotifications();
  const { markRead, markAllRead } = useNotifActions();
  const { data: convs = [] } = useConversations();
  const unreadNotifs = notifs.filter((n) => !n.isRead).length;
  const unreadMsgs = convs.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <header className="header-surface sticky top-0 z-20 flex h-20 shrink-0 items-center gap-2.5 px-4 sm:gap-3 sm:px-6">
      <Button variant="ghost" size="icon" className="shrink-0 rounded-full bg-card shadow-card lg:hidden" onClick={() => setMobileNav(true)} aria-label="باز کردن منو">
        <Menu className="h-5 w-5" />
      </Button>

      <ThemeToggle className="hidden shrink-0 sm:flex" />

      {/* Global search */}
      <button
        onClick={() => setCommand(true)}
        className="mx-auto hidden h-12 w-full max-w-xl flex-1 items-center gap-2.5 rounded-2xl bg-card px-4 text-[13px] text-muted-foreground shadow-card transition-shadow hover:shadow-pop md:flex"
        aria-label="جست‌وجوی سراسری"
      >
        <Search className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 truncate text-start">جستجو در پروژه‌ها، وظایف، افراد و …</span>
        <kbd className="hidden rounded-lg border bg-muted px-2 py-1 font-sans text-[10px] lg:inline" dir="ltr">Ctrl K</kbd>
      </button>
      <button onClick={() => setCommand(true)} aria-label="جست‌وجو" className={cn(circleBtn, "md:hidden")}>
        <Search className="h-5 w-5" />
      </button>

      <div className="ms-auto flex shrink-0 items-center gap-2.5 sm:gap-3">
        {/* Global create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="ایجاد جدید" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card transition-colors hover:bg-primary/90">
              <Plus className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>ایجاد جدید</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {can("tasks.create") && (
              <DropdownMenuItem onClick={() => openCreateTask(activePid ? { projectId: activePid } : {})}>
                <CheckSquare className="h-4 w-4" /> تسک جدید
              </DropdownMenuItem>
            )}
            {can("projects.create") && (
              <DropdownMenuItem asChild>
                <Link href="/projects?new=1"><FolderKanban className="h-4 w-4" /> پروژه جدید</Link>
              </DropdownMenuItem>
            )}
            {can("calendar.manage") && (
              <DropdownMenuItem asChild>
                <Link href="/calendar?new=1"><CalendarPlus className="h-4 w-4" /> رویداد جدید</Link>
              </DropdownMenuItem>
            )}
            {can("users.create") && (
              <DropdownMenuItem asChild>
                <Link href="/admin/users?new=1"><UserPlus className="h-4 w-4" /> کاربر جدید</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Messages shortcut */}
        <Link href="/messages" aria-label="پیام‌ها" className={circleBtn}>
          <MessagesSquare className="h-5 w-5" />
          <CountBadge count={unreadMsgs} />
        </Link>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="اعلان‌ها" className={circleBtn}>
              <Bell className="h-5 w-5" />
              <CountBadge count={unreadNotifs} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[23rem] max-w-[calc(100vw-2rem)] p-2">
            <DropdownMenuLabel className="flex items-center justify-between">
              اعلان‌ها
              {unreadNotifs > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllRead.mutate()}>
                  <CheckCheck className="h-3.5 w-3.5" /> خواندن همه
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[25rem] overflow-y-auto">
              {notifs.slice(0, 8).map((n) => (
                <NotificationItem key={n.id} notif={n} onRead={(x) => markRead.mutate(x.id)} />
              ))}
              {notifs.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">اعلانی وجود ندارد.</p>}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User chip */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-2xl bg-card py-1.5 pe-2 ps-2 shadow-card transition-shadow hover:shadow-pop">
                <UserAvatar name={user.name} src={user.avatarUrl} size="md" online={user.isOnline} />
                <span className="hidden min-w-0 text-start min-[480px]:block">
                  <span className="block max-w-[9rem] truncate text-[13px] font-bold leading-5">{user.name}</span>
                  <span className="block max-w-[9rem] truncate text-[11px] leading-4 text-muted-foreground">{user.position || user.roleTitleFa}</span>
                </span>
                <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground min-[480px]:flex">
                  <Check className="h-4 w-4" />
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate">{user.name}</span>
                <span className="block truncate text-[11px] font-normal">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile"><UserIcon className="h-4 w-4" /> پروفایل من</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings"><Settings className="h-4 w-4" /> تنظیمات حساب</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem danger onClick={logout}>
                <LogOut className="h-4 w-4" /> خروج از حساب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
