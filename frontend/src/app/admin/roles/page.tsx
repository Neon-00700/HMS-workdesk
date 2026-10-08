"use client";
import { useState } from "react";
import { KeyRound, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingList, ErrorState } from "@/components/shared/states";
import { PERMISSIONS, PERMISSION_GROUPS, type PermissionKey } from "@/config/permissions";
import { toFaDigits, cn } from "@/lib/utils";
import { useRoles, useUpdateRolePerms } from "@/services/queries";
import { Can } from "@/hooks/use-permission";

export default function AdminRolesPage() {
  const { data: roles = [], isLoading, isError, refetch } = useRoles();
  const update = useUpdateRolePerms();
  const [selected, setSelected] = useState<string>("r_pm");
  const [draft, setDraft] = useState<string[] | null>(null);

  const role = roles.find((r) => r.id === selected);
  const current = draft ?? role?.permissions ?? [];
  const dirty = draft !== null && role !== undefined && JSON.stringify([...draft].sort()) !== JSON.stringify([...role.permissions].sort());

  const toggle = (p: string) => {
    setDraft((d) => {
      const base = d ?? role?.permissions ?? [];
      return base.includes(p) ? base.filter((x) => x !== p) : [...base, p];
    });
  };

  if (isLoading) return <LoadingList rows={6} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader title="نقش‌ها و دسترسی‌ها" description="مدیریت دانه‌ای دسترسی‌ها؛ تغییرات بلافاصله روی کاربران آن نقش اعمال می‌شود." />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-2">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => { setSelected(r.id); setDraft(null); }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl p-2.5 text-start transition-colors",
                selected === r.id ? "bg-primary/10" : "hover:bg-muted/60",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <KeyRound className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{r.titleFa}</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" />{toFaDigits(r.membersCount)} عضو · {toFaDigits(r.permissions.length)} دسترسی
                </span>
              </span>
            </button>
          ))}
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>دسترسی‌های «{role?.titleFa}»</CardTitle>
              <CardDescription>بک‌اند همه این دسترسی‌ها را سمت سرور اعمال می‌کند.</CardDescription>
            </div>
            <Can perm="roles.manage">
              <div className="flex gap-2">
                {dirty && <Button variant="outline" size="sm" onClick={() => setDraft(null)}>انصراف</Button>}
                <Button size="sm" disabled={!dirty} loading={update.isPending}
                  onClick={() => role && update.mutate({ roleId: role.id, permissions: current }, { onSuccess: () => setDraft(null) })}>
                  ذخیره تغییرات
                </Button>
              </div>
            </Can>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {PERMISSION_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
                  {g.title}
                  <Badge variant="secondary" className="tnum">{toFaDigits(g.keys.filter((k) => current.includes(k)).length)}/{toFaDigits(g.keys.length)}</Badge>
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {g.keys.map((k: PermissionKey) => (
                    <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition-colors hover:bg-muted/50">
                      <Checkbox checked={current.includes(k)} onCheckedChange={() => toggle(k)} />
                      <span className="flex-1">{PERMISSIONS[k]}</span>
                      <code className="hidden text-[10px] text-muted-foreground xl:block" dir="ltr">{k}</code>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
