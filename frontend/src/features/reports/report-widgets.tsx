"use client";
import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/ui/avatar";
import { STREAM_META } from "@/config/constants";
import { toFaDigits } from "@/lib/utils";
import { formatMinutes } from "@/lib/utils";
import { useWorkload, useBurn, useStreams, useOverview, useTrend, useProjectsStats } from "@/services/queries";
import Link from "next/link";
import { LoadingCards } from "@/components/shared/states";

const COLORS = ["#16a34a", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#f97316"];

export function OverviewCards({ projectId }: { projectId?: string }) {
  const { data, isLoading } = useOverview(projectId);
  if (isLoading) return <LoadingCards count={4} />;
  if (!data) return null;
  const cards = [
    { label: "نرخ تکمیل", value: `${toFaDigits(data.completionRate)}٪`, sub: `${toFaDigits(data.completed)} از ${toFaDigits(data.total)} تسک` },
    { label: "در حال انجام", value: toFaDigits(data.inProgress), sub: "تسک فعال" },
    { label: "مسدود", value: toFaDigits(data.blocked), sub: "نیازمند توجه", alert: data.blocked > 0 },
    { label: "معوق", value: toFaDigits(data.overdue), sub: `${toFaDigits(data.dueSoon)} مورد نزدیک ددلاین`, alert: data.overdue > 0 },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-5">
            <p className="text-[13px] text-muted-foreground">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold tnum ${c.alert ? "text-destructive" : ""}`}>{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function BurnChart({ projectId }: { projectId: string }) {
  const { data = [], isLoading } = useBurn(projectId);
  const chart = useMemo(() => data.map((p) => ({
    date: p.date.slice(5).replace("-", "/"),
    "باقیمانده واقعی": p.remaining,
    "روند ایده‌آل": p.ideal,
  })), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>نمودار برن‌داون</CardTitle>
        <CardDescription>پیشرفت واقعی در برابر روند ایده‌آل (۱۴ روز اخیر)</CardDescription>
      </CardHeader>
      <CardContent className="h-72" dir="ltr">
        {isLoading ? <div className="h-full animate-pulse rounded bg-muted" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border)", background: "hsl(var(--popover))", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="باقیمانده واقعی" stroke="#16a34a" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="روند ایده‌آل" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkloadChart({ projectId }: { projectId?: string }) {
  const { data = [], isLoading } = useWorkload(projectId);
  const chart = useMemo(() => data.slice(0, 8).map((r) => ({
    name: r.user.name.split(" ")[0] + " " + (r.user.name.split(" ")[1] ?? ""),
    "تخصیص‌یافته": r.assigned,
    "تکمیل‌شده": r.completed,
    "معوق": r.overdue,
  })), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>حجم کاری تیم</CardTitle>
        <CardDescription>تسک‌های تخصیص‌یافته، تکمیل‌شده و معوق هر عضو</CardDescription>
      </CardHeader>
      <CardContent className="h-72" dir="ltr">
        {isLoading ? <div className="h-full animate-pulse rounded bg-muted" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={0} angle={-15} dy={8} height={46} />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border)", background: "hsl(var(--popover))", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="تخصیص‌یافته" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="تکمیل‌شده" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="معوق" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function StreamProgress({ projectId }: { projectId: string }) {
  const { data = [], isLoading } = useStreams(projectId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>پیشرفت حوزه‌های کاری</CardTitle>
        <CardDescription>فرانت‌اند، بک‌اند، دیتابیس و…</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading && <div className="h-32 animate-pulse rounded bg-muted" />}
        {data.map((s) => {
          const meta = STREAM_META[s.stream];
          return (
            <div key={s.stream}>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
                <span className="text-muted-foreground tnum">{toFaDigits(s.done)}/{toFaDigits(s.total)} · {toFaDigits(s.progress)}٪</span>
              </div>
              <Progress value={s.progress} indicatorClassName="" className="h-2" />
            </div>
          );
        })}
        {!isLoading && data.length === 0 && <p className="text-[13px] text-muted-foreground">داده‌ای نیست.</p>}
      </CardContent>
    </Card>
  );
}

export function EffortDonut({ projectId }: { projectId?: string }) {
  const { data } = useOverview(projectId);
  const chart = useMemo(() => {
    if (!data) return [];
    const remaining = Math.max(0, data.plannedMinutes - data.spentMinutes);
    return [
      { name: "صرف‌شده", value: Math.round(data.spentMinutes / 60) },
      { name: "باقیمانده تخمین", value: Math.round(remaining / 60) },
    ];
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>تلاش برنامه‌ریزی‌شده در برابر واقعی</CardTitle>
        <CardDescription>
          تخمین {data ? formatMinutes(data.plannedMinutes) : "…"} · صرف‌شده {data ? formatMinutes(data.spentMinutes) : "…"}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
              {chart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function WorkloadTable({ projectId }: { projectId?: string }) {
  const { data = [], isLoading } = useWorkload(projectId);
  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-muted" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>ظرفیت اعضا</CardTitle>
        <CardDescription>بار کاری دو هفته اخیر نسبت به ظرفیت</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {data.map((r) => {
          const load = r.capacityMinutes ? Math.round((r.estimateMinutes / r.capacityMinutes) * 100) : 0;
          const over = load > 100;
          return (
            <div key={r.userId} className="flex items-center gap-3">
              <UserAvatar name={r.user.name} src={r.user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="truncate font-medium">{r.user.name}</span>
                  <span className={`tnum text-xs ${over ? "font-bold text-destructive" : "text-muted-foreground"}`}>
                    {toFaDigits(load)}٪ ظرفیت
                  </span>
                </div>
                <Progress value={Math.min(100, load)} className="mt-1 h-1.5" indicatorClassName={over ? "bg-destructive" : load > 80 ? "bg-warning" : ""} />
              </div>
              <span className="hidden text-[11px] text-muted-foreground sm:block tnum">
                {toFaDigits(r.assigned)} تسک · {toFaDigits(r.overdue)} معوق
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function TrendChart({ projectId }: { projectId?: string }) {
  const { data = [], isLoading } = useTrend(projectId);
  const chart = useMemo(() => data.map((p) => ({
    date: p.date.slice(5).replace("-", "/"),
    "ایجادشده": p.created,
    "تکمیل‌شده": p.completed,
  })), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>روند تکمیل کارها</CardTitle>
        <CardDescription>تسک‌های ایجادشده در برابر تکمیل‌شده (۱۴ روز اخیر)</CardDescription>
      </CardHeader>
      <CardContent className="h-72" dir="ltr">
        {isLoading ? <div className="h-full animate-pulse rounded bg-muted" /> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border)", background: "hsl(var(--popover))", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="ایجادشده" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="تکمیل‌شده" stroke="#16a34a" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function MemberProgress({ projectId }: { projectId?: string }) {
  const { data = [], isLoading } = useWorkload(projectId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>پیشرفت اعضا</CardTitle>
        <CardDescription>نرخ تکمیل تسک‌های هر عضو</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading && <div className="h-32 animate-pulse rounded bg-muted" />}
        {data.map((r) => {
          const pct = r.assigned ? Math.round((r.completed / r.assigned) * 100) : 0;
          return (
            <div key={r.userId} className="flex items-center gap-3">
              <UserAvatar name={r.user.name} src={r.user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="truncate font-medium">{r.user.name}</span>
                  <span className="tnum text-xs text-muted-foreground">
                    {toFaDigits(r.completed)}/{toFaDigits(r.assigned)} · {toFaDigits(pct)}٪
                  </span>
                </div>
                <Progress value={pct} className="mt-1 h-1.5" />
              </div>
            </div>
          );
        })}
        {!isLoading && data.length === 0 && <p className="text-[13px] text-muted-foreground">عضوی با تسک تخصیص‌یافته نیست.</p>}
      </CardContent>
    </Card>
  );
}

export function ProjectsProgress() {
  const { data = [], isLoading } = useProjectsStats();
  return (
    <Card>
      <CardHeader>
        <CardTitle>پیشرفت پروژه‌ها</CardTitle>
        <CardDescription>نرخ تکمیل هر پروژه</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading && <div className="h-32 animate-pulse rounded bg-muted" />}
        {data.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}/overview`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-muted/60">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
              style={{ backgroundColor: p.iconColor }}
            >
              {p.key.slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-[13px]">
                <span className="truncate font-medium">{p.name}</span>
                <span className="tnum text-xs text-muted-foreground">
                  {toFaDigits(p.done)}/{toFaDigits(p.total)} · {toFaDigits(p.progress)}٪
                </span>
              </div>
              <Progress value={p.progress} className="mt-1 h-1.5" />
            </div>
          </Link>
        ))}
        {!isLoading && data.length === 0 && <p className="text-[13px] text-muted-foreground">پروژه‌ای ساخته نشده است.</p>}
      </CardContent>
    </Card>
  );
}
