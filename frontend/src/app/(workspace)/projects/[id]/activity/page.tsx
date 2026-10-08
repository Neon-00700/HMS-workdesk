"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingList } from "@/components/shared/states";
import { timeAgoFa } from "@/lib/format";
import { useActivity } from "@/services/queries";

export default function ProjectActivityPage() {
  const { id } = useParams() as { id: string };
  const { data: activity = [], isLoading, isError, refetch } = useActivity(id);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");

  const shown = activity.filter((a) => {
    if (kind !== "all" && a.entityType !== kind) return false;
    if (q && !(a.entityTitle ?? "").includes(q) && !a.actionFa.includes(q) && !(a.actor?.name ?? "").includes(q)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="فعالیت‌های پروژه" description="تاریخچه تغییرات و رویدادهای این پروژه." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="جست‌وجو در فعالیت‌ها…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-64" />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="نوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="task">تسک</SelectItem>
            <SelectItem value="project">پروژه</SelectItem>
            <SelectItem value="board">بورد</SelectItem>
            <SelectItem value="file">فایل</SelectItem>
            <SelectItem value="message">پیام</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingList rows={8} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && shown.length === 0 && (
        <EmptyState icon={<History className="h-6 w-6" />} title="فعالیتی نیست" description="هنوز فعالیتی در این پروژه ثبت نشده است." />
      )}

      {!isLoading && !isError && shown.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <ol className="relative flex flex-col gap-5 border-s-2 border-muted ps-5">
              {shown.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -start-7 top-0.5">
                    <UserAvatar name={a.actor?.name ?? "?"} src={a.actor?.avatarUrl} size="sm" className="ring-2 ring-card" />
                  </span>
                  <p className="text-[13px] leading-6">
                    <span className="font-semibold">{a.actor?.name}</span>{" "}
                    <span className="text-muted-foreground">{a.actionFa}</span>{" "}
                    {a.entityTitle && <span className="font-medium">«{a.entityTitle}»</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgoFa(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
