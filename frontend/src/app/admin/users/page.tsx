"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, UserCog, Ban, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, LoadingList } from "@/components/shared/states";
import { useUsers, useRoles, useCreateUser, useUpdateUser } from "@/services/queries";
import { Can } from "@/hooks/use-permission";
import { formatDateFa } from "@/lib/format";
import { toFaDigits } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(3, "نام حداقل ۳ کاراکتر."),
  username: z.string().min(3, "نام کاربری حداقل ۳ کاراکتر.").regex(/^[a-zA-Z0-9._-]+$/, "فقط حروف انگلیسی، عدد و . _ -"),
  email: z.string().email("ایمیل معتبر نیست."),
  password: z.string().min(8, "رمز موقت حداقل ۸ کاراکتر."),
  role: z.string().min(1, "نقش را انتخاب کنید."),
  department: z.string().min(1, "دپارتمان را وارد کنید."),
  position: z.string().min(1, "سمت را وارد کنید."),
});

function UsersInner() {
  const params = useSearchParams();
  const { data: users = [], isLoading, isError, refetch } = useUsers();
  const { data: roles = [] } = useRoles();
  const create = useCreateUser();
  const update = useUpdateUser();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", username: "", email: "", password: "", role: "Employee", department: "", position: "" },
  });

  const shown = users.filter((u) => {
    if (role !== "all" && u.role !== role) return false;
    if (q && !u.name.includes(q) && !u.username.includes(q) && !u.email.includes(q)) return false;
    return true;
  });

  const submit = (v: z.infer<typeof schema>) => {
    create.mutate(v, { onSuccess: () => { setOpen(false); form.reset(); } });
  };

  return (
    <div>
      <PageHeader
        title="کاربران"
        description={`${toFaDigits(users.length)} کاربر در سامانه.`}
        actions={
          <Can perm="users.create">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" /> کاربر جدید</Button>
              </DialogTrigger>
              <DialogContent size="lg">
                <DialogHeader><DialogTitle>ایجاد کاربر جدید</DialogTitle></DialogHeader>
                <form onSubmit={form.handleSubmit(submit)} className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium">نام و نام خانوادگی *</label>
                    <Input {...form.register("name")} placeholder="مثلاً: علی رضایی" />
                    {form.formState.errors.name && <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium">نام کاربری *</label>
                    <Input {...form.register("username")} placeholder="ali.r" dir="ltr" />
                    {form.formState.errors.username && <p className="mt-1 text-xs text-destructive">{form.formState.errors.username.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium">ایمیل *</label>
                    <Input {...form.register("email")} placeholder="ali@company.local" dir="ltr" />
                    {form.formState.errors.email && <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium">رمز موقت *</label>
                    <Input {...form.register("password")} placeholder="حداقل ۸ کاراکتر" dir="ltr" />
                    {form.formState.errors.password && <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium">نقش *</label>
                    <Select value={form.watch("role")} onValueChange={(v) => form.setValue("role", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => <SelectItem key={r.id} value={r.name}>{r.titleFa}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium">دپارتمان *</label>
                    <Input {...form.register("department")} placeholder="فنی" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[13px] font-medium">سمت *</label>
                    <Input {...form.register("position")} placeholder="توسعه‌دهنده فرانت‌اند" />
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">کاربر در اولین ورود ملزم به تغییر رمز موقت خواهد بود.</p>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" loading={create.isPending}>ایجاد کاربر</Button>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[11.25rem] flex-1 sm:max-w-64">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="جست‌وجوی کاربر…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 ps-8" />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="نقش" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه نقش‌ها</SelectItem>
            {roles.map((r) => <SelectItem key={r.id} value={r.name}>{r.titleFa}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingList rows={8} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && shown.length === 0 && <EmptyState title="کاربری یافت نشد" />}

      {!isLoading && !isError && shown.length > 0 && (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>کاربر</TableHead>
                  <TableHead>نقش</TableHead>
                  <TableHead>دپارتمان</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>عضویت</TableHead>
                  <TableHead>اقدامات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <span className="flex items-center gap-2.5">
                        <UserAvatar name={u.name} src={u.avatarUrl} size="sm" online={u.isOnline} />
                        <span>
                          <span className="block font-medium">{u.name}</span>
                          <span className="block text-[11px] text-muted-foreground" dir="ltr">@{u.username}</span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{u.roleTitleFa}</Badge></TableCell>
                    <TableCell className="text-xs">{u.department}</TableCell>
                    <TableCell>
                      {u.status === "active" ? <Badge variant="success">فعال</Badge> : u.status === "invited" ? <Badge variant="warning">دعوت‌شده</Badge> : <Badge variant="muted">غیرفعال</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{formatDateFa(u.createdAt)}</TableCell>
                    <TableCell>
                      <UserRowActions userId={u.id} status={u.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:hidden">
            {shown.map((u) => (
              <Card key={u.id} className="p-3.5">
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={u.name} src={u.avatarUrl} size="md" online={u.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground">{u.roleTitleFa} · {u.department}</p>
                  </div>
                  <UserRowActions userId={u.id} status={u.status} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UserRowActions({ userId, status }: { userId: string; status: string }) {
  const update = useUpdateUser();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="اقدامات کاربر"><UserCog className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <Can perm="users.edit">
          <DropdownMenuItem onClick={() => update.mutate({ id: userId, patch: { forcePasswordChange: true } })}>
            بازنشانی رمز (اجبار به تغییر)
          </DropdownMenuItem>
        </Can>
        <Can perm="users.disable">
          {status === "active" ? (
            <ConfirmDialog
              trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Ban className="h-4 w-4" /> غیرفعال‌سازی</DropdownMenuItem>}
              title="غیرفعال‌سازی کاربر" description="کاربر دیگر نمی‌تواند وارد سامانه شود." confirmLabel="غیرفعال‌سازی"
              onConfirm={() => update.mutate({ id: userId, patch: { status: "disabled" } })}
            />
          ) : (
            <DropdownMenuItem onClick={() => update.mutate({ id: userId, patch: { status: "active" } })}>
              <CheckCircle2 className="h-4 w-4" /> فعال‌سازی مجدد
            </DropdownMenuItem>
          )}
        </Can>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense>
      <UsersInner />
    </Suspense>
  );
}
