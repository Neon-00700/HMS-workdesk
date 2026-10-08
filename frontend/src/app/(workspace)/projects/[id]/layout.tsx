"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, CheckSquare, CalendarDays, GanttChart,
  FolderOpen, MessagesSquare, Users, Activity, BarChart3, Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { ErrorState } from "@/components/shared/states";
import { PROJECT_STATUS_META, HEALTH_META } from "@/config/constants";
import { cn } from "@/lib/utils";
import { useProject, useMembers } from "@/services/queries";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { usePermission } from "@/hooks/use-permission";

const TABS = [
  { key: "overview", label: "نمای کلی", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "board", label: "بورد", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "tasks", label: "وظایف", icon: <CheckSquare className="h-4 w-4" /> },
  { key: "calendar", label: "تقویم", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "timeline", label: "تایم‌لاین", icon: <GanttChart className="h-4 w-4" /> },
  { key: "files", label: "فایل‌ها", icon: <FolderOpen className="h-4 w-4" /> },
  { key: "chat", label: "گفتگو", icon: <MessagesSquare className="h-4 w-4" /> },
  { key: "members", label: "اعضا", icon: <Users className="h-4 w-4" /> },
  { key: "activity", label: "فعالیت‌ها", icon: <Activity className="h-4 w-4" /> },
  { key: "reports", label: "گزارش‌ها", icon: <BarChart3 className="h-4 w-4" />, perm: "reports.view" },
  { key: "settings", label: "تنظیمات", icon: <Settings className="h-4 w-4" />, perm: "projects.edit" },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string;
  const { data: project, isLoading, isError } = useProject(id);
  const { data: members = [] } = useMembers(id);
  const setActive = useWorkspaceStore((s) => s.setActiveProject);
  const { can } = usePermission();

  useEffect(() => {
    if (id) setActive(id);
  }, [id, setActive]);

  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-4">
        <div className="h-20 rounded-xl bg-muted" />
        <div className="h-10 rounded-xl bg-muted" />
        <div className="h-80 rounded-xl bg-muted" />
      </div>
    );
  }
  if (isError || !project) return <ErrorState title="پروژه یافت نشد" description="پروژه موردنظر وجود ندارد یا به آن دسترسی ندارید." />;

  const st = PROJECT_STATUS_META[project.status];
  const health = HEALTH_META[project.health];
  const current = pathname.split("/").pop();

  return (
    <div className="flex flex-col gap-5">
      {/* Project header */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white" style={{ backgroundColor: project.iconColor }}>
            {project.key.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{project.name}</h1>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{project.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: st.color }} />{st.label}
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: health.color }} />{health.label}
          </Badge>
          <span className="ms-1 flex items-center -space-x-2 space-x-reverse">
            {members.slice(0, 5).map((m) => (
              <UserAvatar key={m.userId} name={m.user.name} src={m.user.avatarUrl} size="sm" className="ring-2 ring-card" />
            ))}
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${id}/members`}>مدیریت اعضا</Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="-mb-1 overflow-x-auto">
        <nav className="flex min-w-max gap-1 border-b" aria-label="ناوبری پروژه">
          {TABS.filter((t) => !t.perm || can(t.perm)).map((t) => {
            const active = current === t.key;
            return (
              <Link
                key={t.key}
                href={`/projects/${id}/${t.key}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.icon}{t.label}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
