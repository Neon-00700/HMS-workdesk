"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, UserMinus, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { UserPicker } from "@/components/shared/user-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState, ErrorState, LoadingList } from "@/components/shared/states";
import { timeAgoFa } from "@/lib/format";
import { useMembers, useAddMember, useRemoveMember, useProject } from "@/services/queries";
import { Can } from "@/hooks/use-permission";

const PROJECT_ROLES = ["مدیر پروژه", "سرپرست بک‌اند", "سرپرست فرانت‌اند", "توسعه‌دهنده", "طراح", "تست", "زیرساخت", "مالک محصول", "ناظر"];

export default function ProjectMembersPage() {
  const { id } = useParams() as { id: string };
  const { data: members = [], isLoading, isError, refetch } = useMembers(id);
  const { data: project } = useProject(id);
  const add = useAddMember();
  const remove = useRemoveMember();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string>();
  const [role, setRole] = useState(PROJECT_ROLES[3]);

  const shown = members.filter((m) => !q || m.user.name.includes(q) || m.roleInProject.includes(q));

  return (
    <div>
      <PageHeader
        title="اعضای پروژه"
        description={`${members.length} عضو در این پروژه.`}
        actions={
          <Can perm="projects.manage_members">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" /> افزودن عضو</Button>
              </DialogTrigger>
              <DialogContent size="sm">
                <DialogHeader><DialogTitle>افزودن عضو به پروژه</DialogTitle></DialogHeader>
                <div className="flex flex-col gap-3">
                  <UserPicker value={userId} onChange={(v) => setUserId(v as string)} placeholder="انتخاب کاربر…" />
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button disabled={!userId} loading={add.isPending}
                    onClick={() => add.mutate({ pid: id, userId: userId!, role }, { onSuccess: () => { setOpen(false); setUserId(undefined); } })}>
                    افزودن
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </Can>
        }
      />

      <div className="relative mb-4 max-w-72">
        <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="جست‌وجوی عضو…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 ps-8" />
      </div>

      {isLoading && <LoadingList rows={6} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && shown.length === 0 && <EmptyState title="عضوی یافت نشد" />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((m) => {
          const isOwner = project?.ownerId === m.userId;
          return (
            <Card key={m.userId}>
              <CardContent className="flex items-center gap-3 p-4">
                <UserAvatar name={m.user.name} src={m.user.avatarUrl} size="lg" online={m.user.isOnline} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {m.user.name}
                    {isOwner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.user.position}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[11px]">{m.roleInProject}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">عضویت {timeAgoFa(m.joinedAt)}</p>
                </div>
                <Can perm="projects.manage_members">
                  {!isOwner && (
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="icon-sm" aria-label={`حذف ${m.user.name}`}><UserMinus className="h-4 w-4" /></Button>}
                      title="حذف عضو" description={`${m.user.name} از پروژه حذف می‌شود.`}
                      confirmLabel="حذف" onConfirm={() => remove.mutate({ pid: id, userId: m.userId })}
                    />
                  )}
                </Can>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
