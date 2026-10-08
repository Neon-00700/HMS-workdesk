"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, KeyRound, FolderKanban, History, Settings, ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PermissionDenied } from "@/components/shared/states";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/use-permission";

const TABS = [
  { key: "", label: "داشبورد", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "/users", label: "کاربران", icon: <Users className="h-4 w-4" /> },
  { key: "/roles", label: "نقش‌ها و دسترسی‌ها", icon: <KeyRound className="h-4 w-4" /> },
  { key: "/projects", label: "پروژه‌ها", icon: <FolderKanban className="h-4 w-4" /> },
  { key: "/logs", label: "لاگ حسابرسی", icon: <History className="h-4 w-4" /> },
  { key: "/settings", label: "تنظیمات سامانه", icon: <Settings className="h-4 w-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = usePermission();
  const allowed = can("users.view") || can("audit.view") || can("system.settings");

  return (
    <AppShell>
      {!allowed ? (
        <PermissionDenied description="فقط مدیران سامانه به این بخش دسترسی دارند." />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-card">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold">پنل مدیریت</h1>
              <p className="text-xs text-muted-foreground">مدیریت کاربران، نقش‌ها، پروژه‌ها و نظارت سامانه</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <nav className="flex min-w-max gap-1 border-b" aria-label="ناوبری مدیریت">
              {TABS.map((t) => {
                const href = `/admin${t.key}`;
                const active = pathname === href;
                return (
                  <Link
                    key={href} href={href} aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium",
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
      )}
    </AppShell>
  );
}
