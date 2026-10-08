"use client";
import { useState } from "react";
import { History, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingList } from "@/components/shared/states";
import { formatDateTimeFa } from "@/lib/format";
import { useActivity, useProjects } from "@/services/queries";
import { toast } from "sonner";

const ACTION_FA: Record<string, string> = {
  "auth.login": "ورود", "auth.logout": "خروج", "user.create": "ایجاد کاربر",
  "role.update": "تغییر دسترسی", "project.create": "ایجاد پروژه", "project.delete": "حذف پروژه",
  "task.create": "ایجاد تسک", "task.move": "جابه‌جایی تسک", "task.comment": "نظر",
  "board.create": "ایجاد بورد", "file.upload": "آپلود فایل", "file.delete": "حذف فایل",
};

export default function AdminLogsPage() {
  const { data: activity = [], isLoading, isError, refetch } = useActivity();
  const { data: projects = [] } = useProjects();
  const [q, setQ] = useState("");
  const [project, setProject] = useState("all");

  const pname = (pid?: string) => projects.find((p) => p.id === pid)?.name ?? "—";

  const shown = activity.filter((a) => {
    if (project !== "all" && a.projectId !== project) return false;
    if (q && !(a.entityTitle ?? "").includes(q) && !a.actionFa.includes(q) && !(a.actor?.name ?? "").includes(q)) return false;
    return true;
  });

  const exportCsv = () => {
    const rows = [["زمان", "کاربر", "اقدام", "موجودیت", "عنوان", "پروژه"],
      ...shown.map((a) => [a.createdAt, a.actor?.name ?? "", a.actionFa, a.entityType, a.entityTitle ?? "", pname(a.projectId)])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = "audit-log.csv";
    el.click();
    URL.revokeObjectURL(url);
    toast.success("خروجی CSV دانلود شد.");
  };

  return (
    <div>
      <PageHeader
        title="لاگ حسابرسی"
        description="رویدادهای امنیتی و تغییرات مهم سامانه."
        actions={<Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> خروجی CSV</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="جست‌وجو…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-64" />
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="پروژه" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه پروژه‌ها</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingList rows={8} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && shown.length === 0 && (
        <EmptyState icon={<History className="h-6 w-6" />} title="رویدادی نیست" />
      )}
      {!isLoading && !isError && shown.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>زمان</TableHead>
              <TableHead>کاربر</TableHead>
              <TableHead>اقدام</TableHead>
              <TableHead>جزئیات</TableHead>
              <TableHead>پروژه</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap text-xs">{formatDateTimeFa(a.createdAt)}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <UserAvatar name={a.actor?.name ?? "?"} size="xs" />
                    <span className="text-xs">{a.actor?.name}</span>
                  </span>
                </TableCell>
                <TableCell><Badge variant="secondary">{ACTION_FA[a.action] ?? a.actionFa}</Badge></TableCell>
                <TableCell className="max-w-60 truncate text-xs">{a.entityTitle ?? a.actionFa}</TableCell>
                <TableCell className="text-xs">{pname(a.projectId)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
