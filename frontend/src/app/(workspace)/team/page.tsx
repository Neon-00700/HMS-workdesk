"use client";
import { useState } from "react";
import { Search, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingList } from "@/components/shared/states";
import { timeAgoFa } from "@/lib/format";
import { toFaDigits } from "@/lib/utils";
import { useUsers, useWorkload } from "@/services/queries";
import { Users } from "lucide-react";

export default function TeamPage() {
  const { data: users = [], isLoading, isError, refetch } = useUsers();
  const { data: workload = [] } = useWorkload();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [onlineOnly, setOnlineOnly] = useState(false);

  const depts = [...new Set(users.map((u) => u.department))];
  const loadOf = (id: string) => workload.find((w) => w.userId === id);

  const shown = users.filter((u) => {
    if (u.status !== "active") return false;
    if (dept !== "all" && u.department !== dept) return false;
    if (onlineOnly && !u.isOnline) return false;
    if (q && !u.name.includes(q) && !u.position.includes(q)) return false;
    return true;
  });

  const online = users.filter((u) => u.isOnline).length;

  return (
    <div>
      <PageHeader
        title="اعضای تیم"
        description={`${toFaDigits(users.length)} عضو · ${toFaDigits(online)} نفر آنلاین`}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[11.25rem] flex-1 sm:max-w-64">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="جست‌وجوی عضو…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 ps-8" />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="دپارتمان" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دپارتمان‌ها</SelectItem>
            {depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          onClick={() => setOnlineOnly((v) => !v)}
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] transition-colors ${onlineOnly ? "border-primary bg-primary/10 text-primary" : "bg-card"}`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> فقط آنلاین‌ها
        </button>
      </div>

      {isLoading && <LoadingList rows={6} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && shown.length === 0 && (
        <EmptyState icon={<Users className="h-6 w-6" />} title="عضوی یافت نشد" />
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((u) => {
          const w = loadOf(u.id);
          return (
            <Card key={u.id} className="transition-all hover:border-primary/40 hover:shadow-pop">
              <CardContent className="flex items-center gap-3 p-4">
                <UserAvatar name={u.name} src={u.avatarUrl} size="lg" online={u.isOnline} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.position} · {u.department}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-[11px]">{u.roleTitleFa}</Badge>
                    {w && <Badge variant="outline" className="text-[11px] tnum">{toFaDigits(w.assigned)} تسک</Badge>}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Mail className="h-3 w-3" /><span className="truncate" dir="ltr">{u.email}</span>
                  </p>
                  {!u.isOnline && <p className="text-[11px] text-muted-foreground">آخرین بازدید {timeAgoFa(u.lastSeenAt)}</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
