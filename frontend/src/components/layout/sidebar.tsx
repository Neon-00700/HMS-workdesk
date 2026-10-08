"use client";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, MessagesSquare,
  FolderOpen, BarChart3, Users, Settings, LogOut, ShieldCheck,
  ClipboardList, GanttChart, Activity, Box, ChevronLeft, PanelRightClose, PanelRightOpen,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { Tip } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WORKSPACE_NAME } from "@/config/constants";
import { cn } from "@/lib/utils";
import { toFaDigits } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { usePermission } from "@/hooks/use-permission";
import { useConversations } from "@/services/queries";

interface NavItem { href: string; label: string; icon: React.ReactNode; badge?: number }

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg">
        <Box className="h-5 w-5" />
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-extrabold leading-6 text-white">{WORKSPACE_NAME}</span>
          <span className="block text-[11px] text-sidebar-muted">فضای کاری تیم</span>
        </span>
      )}
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  // Both hooks must run unconditionally: short-circuiting one of them behind
  // `??` changes the hook count between project and non-project routes and
  // crashes React. Read the store first, then prefer the route param.
  const activePid = useWorkspaceStore((s) => s.activeProjectId);
  const pid = (params?.id as string) ?? activePid;
  const { data: convs = [] } = useConversations();
  const unread = convs.reduce((s, c) => s + c.unreadCount, 0);

  const inProject = pathname.startsWith("/projects/") && pid;

  const mainNav: NavItem[] = [
    { href: "/dashboard", label: "داشبورد", icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/projects", label: "پروژه‌ها", icon: <FolderKanban className="h-5 w-5" /> },
    { href: "/my-tasks", label: "کارهای من", icon: <CheckSquare className="h-5 w-5" /> },
    { href: "/calendar", label: "تقویم", icon: <CalendarDays className="h-5 w-5" /> },
    { href: "/messages", label: "پیام‌ها", icon: <MessagesSquare className="h-5 w-5" />, badge: unread },
    { href: "/files", label: "فایل‌ها", icon: <FolderOpen className="h-5 w-5" /> },
    { href: "/reports", label: "گزارش‌ها", icon: <BarChart3 className="h-5 w-5" /> },
    { href: "/team", label: "اعضای تیم", icon: <Users className="h-5 w-5" /> },
    { href: "/settings", label: "تنظیمات", icon: <Settings className="h-5 w-5" /> },
  ];

  const projectNav: NavItem[] = pid
    ? [
        { href: `/projects/${pid}/overview`, label: "نمای کلی", icon: <LayoutDashboard className="h-5 w-5" /> },
        { href: `/projects/${pid}/board`, label: "بورد", icon: <ClipboardList className="h-5 w-5" /> },
        { href: `/projects/${pid}/tasks`, label: "وظایف", icon: <CheckSquare className="h-5 w-5" /> },
        { href: `/projects/${pid}/calendar`, label: "تقویم", icon: <CalendarDays className="h-5 w-5" /> },
        { href: `/projects/${pid}/timeline`, label: "تایم‌لاین", icon: <GanttChart className="h-5 w-5" /> },
        { href: `/projects/${pid}/files`, label: "فایل‌ها", icon: <FolderOpen className="h-5 w-5" /> },
        { href: `/projects/${pid}/chat`, label: "گفتگوی پروژه", icon: <MessagesSquare className="h-5 w-5" /> },
        { href: `/projects/${pid}/members`, label: "اعضا", icon: <Users className="h-5 w-5" /> },
        { href: `/projects/${pid}/activity`, label: "فعالیت‌ها", icon: <Activity className="h-5 w-5" /> },
        { href: `/projects/${pid}/reports`, label: "گزارش‌ها", icon: <BarChart3 className="h-5 w-5" /> },
      ]
    : [];

  const renderList = (items: NavItem[], collapsed: boolean) => (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.href === "/dashboard" || item.href === "/projects"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 items-center gap-3 rounded-xl px-3.5 text-[13.5px] font-medium transition-colors",
              collapsed && "justify-center px-0",
              active
                ? "bg-sidebar-active font-semibold text-white shadow-md"
                : "text-sidebar-muted hover:bg-white/5 hover:text-white",
            )}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
            {!collapsed && !!item.badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white tnum">
                {toFaDigits(item.badge)}
              </span>
            )}
            {collapsed && !!item.badge && (
              <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Link>
        );
        return collapsed ? (
          <Tip key={item.href} label={item.label} side="left">{link}</Tip>
        ) : (
          link
        );
      })}
    </nav>
  );

  const collapsed = useUIStore((s) => !s.sidebarOpen);

  return { mainNav, projectNav, inProject, collapsed, renderList };
}

function SectionLabel({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  if (collapsed) return <div className="mx-3 my-3 h-px bg-white/10" />;
  return <p className="mb-1.5 mt-4 px-3.5 text-[11px] font-semibold text-sidebar-muted/80">{children}</p>;
}

function UserCard({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuthStore();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("flex w-full items-center gap-2.5 rounded-xl p-2 text-start transition-colors hover:bg-white/5", collapsed && "justify-center")}>
          <UserAvatar name={user.name} src={user.avatarUrl} size="md" online={user.isOnline} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-white">{user.name}</span>
                <span className="block truncate text-[11px] text-sidebar-muted">{user.position || user.roleTitleFa}</span>
              </span>
              <ChevronLeft className="h-4 w-4 shrink-0 text-sidebar-muted" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate">{user.name}</span>
          <span className="block truncate text-[11px] font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">پروفایل من</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">تنظیمات حساب</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onClick={logout}>
          <LogOut className="h-4 w-4" /> خروج از حساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar() {
  const { can } = usePermission();
  const collapsed = useUIStore((s) => !s.sidebarOpen);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const nav = SidebarNav({});

  return (
    <aside
      className={cn(
        "sidebar-surface sticky top-0 z-30 hidden h-screen shrink-0 flex-col transition-all duration-200 lg:flex",
        collapsed ? "w-[88px]" : "w-60",
      )}
    >
      <div className={cn("flex h-20 shrink-0 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
        <Brand collapsed={collapsed} />
        {!collapsed && (
          <button onClick={toggle} aria-label="جمع کردن سایدبار" className="rounded-lg p-1.5 text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white">
            <PanelRightClose className="h-5 w-5" />
          </button>
        )}
      </div>
      {collapsed && (
        <div className="flex justify-center pb-1">
          <button onClick={toggle} aria-label="باز کردن سایدبار" className="rounded-lg p-1.5 text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white">
            <PanelRightOpen className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto px-3 pb-3", collapsed && "px-2.5")}>
        {nav.renderList(nav.mainNav, collapsed)}
        {can("audit.view") && (
          <>
            <SectionLabel collapsed={collapsed}>مدیریت</SectionLabel>
            {nav.renderList([{ href: "/admin", label: "پنل مدیریت", icon: <ShieldCheck className="h-5 w-5" /> }], collapsed)}
          </>
        )}
        {nav.inProject && nav.projectNav.length > 0 && (
          <>
            <SectionLabel collapsed={collapsed}>پروژه جاری</SectionLabel>
            {nav.renderList(nav.projectNav, collapsed)}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        <UserCard collapsed={collapsed} />
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const open = useUIStore((s) => s.mobileNavOpen);
  const setOpen = useUIStore((s) => s.setMobileNav);
  const { can } = usePermission();
  const nav = SidebarNav({ onNavigate: () => setOpen(false) });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 animate-in fade-in-0 bg-black/50" onClick={() => setOpen(false)} />
      <aside className="sidebar-surface absolute inset-y-0 right-0 flex w-72 flex-col shadow-pop animate-in slide-in-from-right">
        <div className="flex h-20 shrink-0 items-center px-4">
          <Brand collapsed={false} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {nav.renderList(nav.mainNav, false)}
          {can("audit.view") && (
            <>
              <SectionLabel collapsed={false}>مدیریت</SectionLabel>
              {nav.renderList([{ href: "/admin", label: "پنل مدیریت", icon: <ShieldCheck className="h-5 w-5" /> }], false)}
            </>
          )}
          {nav.inProject && nav.projectNav.length > 0 && (
            <>
              <SectionLabel collapsed={false}>پروژه جاری</SectionLabel>
              {nav.renderList(nav.projectNav, false)}
            </>
          )}
        </div>
        <div className="shrink-0 border-t border-white/10 p-3">
          <UserCard collapsed={false} />
        </div>
      </aside>
    </div>
  );
}
