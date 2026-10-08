"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, FolderKanban, CheckSquare, Users, FileText, MessageSquare,
  Plus, CalendarDays, FolderOpen, Settings, Moon, Sun, LayoutDashboard,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useGlobalSearch } from "@/services/queries";
import { useUIStore } from "@/stores/ui-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useAuthStore } from "@/stores/auth-store";

export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommand);
  const [q, setQ] = useState("");
  const { data } = useGlobalSearch(q);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const activePid = useWorkspaceStore((s) => s.activeProjectId);
  const openCreateTask = useUIStore((s) => s.openCreateTask);
  const can = useAuthStore((s) => s.hasPermission);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUIStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => { if (!open) setQ(""); }, [open ]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const commands = [
    { label: "ایجاد تسک", icon: <Plus className="h-4 w-4" />, run: () => { setOpen(false); openCreateTask(activePid ? { projectId: activePid } : {}); }, show: can("tasks.create") },
    { label: "رفتن به داشبورد", icon: <LayoutDashboard className="h-4 w-4" />, run: () => go("/dashboard"), show: true },
    { label: "باز کردن تقویم", icon: <CalendarDays className="h-4 w-4" />, run: () => go("/calendar"), show: true },
    { label: "باز کردن پیام‌ها", icon: <MessageSquare className="h-4 w-4" />, run: () => go("/messages"), show: true },
    { label: "باز کردن فایل‌ها", icon: <FolderOpen className="h-4 w-4" />, run: () => go("/files"), show: true },
    { label: "باز کردن تنظیمات", icon: <Settings className="h-4 w-4" />, run: () => go("/settings"), show: true },
    { label: theme === "dark" ? "حالت روشن" : "حالت تیره", icon: theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, run: () => { setTheme(theme === "dark" ? "light" : "dark"); setOpen(false); }, show: true },
  ].filter((c) => c.show && (!q || c.label.includes(q)));

  const hasResults = data && (data.projects.length + data.tasks.length + data.users.length + data.files.length + data.messages.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent size="lg" className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0">
        <div className="relative border-b">
          <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجوی پروژه، تسک، کاربر، فایل، پیام…"
            className="h-[3.25rem] rounded-none border-0 py-4 ps-11 text-[15px] focus-visible:ring-0"
          />
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {commands.length > 0 && (
            <div className="mb-1">
              <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground">دستورات</p>
              {commands.map((c) => (
                <button key={c.label} onClick={c.run} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] hover:bg-accent hover:text-accent-foreground">
                  <span className="text-muted-foreground">{c.icon}</span>{c.label}
                </button>
              ))}
            </div>
          )}
          {q.trim().length >= 2 && !hasResults && (
            <p className="p-4 text-center text-[13px] text-muted-foreground">نتیجه‌ای برای «{q}» یافت نشد.</p>
          )}
          {data && (
            <>
              <ResultGroup title="پروژه‌ها" icon={<FolderKanban className="h-3.5 w-3.5" />} items={data.projects.map((p) => ({ label: p.name, sub: p.key, run: () => go(`/projects/${p.id}/overview`) }))} />
              <ResultGroup title="تسک‌ها" icon={<CheckSquare className="h-3.5 w-3.5" />} items={data.tasks.map((t) => ({ label: t.title, sub: t.id, run: () => go(`/tasks/${t.id}`) }))} />
              <ResultGroup title="کاربران" icon={<Users className="h-3.5 w-3.5" />} items={data.users.map((u) => ({ label: u.name, sub: u.position, run: () => go("/team") }))} />
              <ResultGroup title="فایل‌ها" icon={<FileText className="h-3.5 w-3.5" />} items={data.files.map((f) => ({ label: f.fileName, sub: f.folder, run: () => go(`/projects/${f.projectId}/files`) }))} />
              <ResultGroup title="پیام‌ها" icon={<MessageSquare className="h-3.5 w-3.5" />} items={data.messages.map((m) => ({ label: m.body.slice(0, 60), sub: m.sender?.name, run: () => go(`/messages?c=${m.conversationId}`) }))} />
            </>
          )}
        </div>
        <div className="flex items-center gap-3 border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <span><kbd className="rounded border bg-card px-1.5 py-0.5 font-sans">Ctrl K</kbd> باز/بسته</span>
          <span><kbd className="rounded border bg-card px-1.5 py-0.5 font-sans">Esc</kbd> بستن</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultGroup({ title, icon, items }: { title: string; icon: React.ReactNode; items: { label: string; sub?: string; run: () => void }[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-1">
      <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground">{icon}{title}</p>
      {items.map((it, i) => (
        <button key={i} onClick={it.run} className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-start text-[13px] hover:bg-accent hover:text-accent-foreground">
          <span className="truncate">{it.label}</span>
          {it.sub && <span className="shrink-0 text-[11px] text-muted-foreground">{it.sub}</span>}
        </button>
      ))}
    </div>
  );
}
