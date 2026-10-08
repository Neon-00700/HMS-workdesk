"use client";
import Link from "next/link";
import { Users, FolderKanban, CheckSquare, HardDrive, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { OverviewCards, WorkloadChart } from "@/features/reports/report-widgets";
import { timeAgoFa } from "@/lib/format";
import { toFaDigits, formatBytes } from "@/lib/utils";
import { useUsers, useProjects, useActivity, useFiles } from "@/services/queries";

export default function AdminDashboard() {
  const { data: users = [] } = useUsers();
  const { data: projects = [] } = useProjects();
  const { data: activity = [] } = useActivity();
  const { data: files = [] } = useFiles();

  const active = users.filter((u) => u.status === "active").length;
  const storage = files.reduce((s, f) => s + f.sizeBytes, 0);

  const stats = [
    { label: "کاربران فعال", value: toFaDigits(active), sub: `از ${toFaDigits(users.length)} کاربر`, icon: <Users className="h-5 w-5" /> },
    { label: "پروژه‌ها", value: toFaDigits(projects.length), sub: `${toFaDigits(projects.filter((p) => p.status === "active").length)} فعال`, icon: <FolderKanban className="h-5 w-5" /> },
    { label: "حجم فایل‌ها", value: formatBytes(storage), sub: `${toFaDigits(files.length)} فایل`, icon: <HardDrive className="h-5 w-5" /> },
    { label: "رویدادهای امروز", value: toFaDigits(activity.filter((a) => new Date(a.createdAt).toDateString() === new Date().toDateString()).length), sub: "فعالیت ثبت‌شده", icon: <CheckSquare className="h-5 w-5" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold tnum">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label} · {s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <OverviewCards />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <WorkloadChart />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>آخرین رویدادهای حساس</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/admin/logs">همه <ArrowLeft className="h-3.5 w-3.5" /></Link></Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {activity.slice(0, 7).map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <UserAvatar name={a.actor?.name ?? "?"} size="sm" />
                <div className="min-w-0 text-xs leading-5">
                  <span className="font-semibold">{a.actor?.name}</span> <span className="text-muted-foreground">{a.actionFa}</span>{" "}
                  {a.entityTitle && <span className="font-medium">«{a.entityTitle}»</span>}
                  <p className="text-[11px] text-muted-foreground">{timeAgoFa(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
