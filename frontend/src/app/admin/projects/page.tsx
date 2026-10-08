"use client";
import Link from "next/link";
import { FolderKanban, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState, LoadingList } from "@/components/shared/states";
import { PROJECT_STATUS_META, HEALTH_META } from "@/config/constants";
import { timeAgoFa } from "@/lib/format";
import { toFaDigits } from "@/lib/utils";
import { useProjects } from "@/services/queries";
import { projectsApi } from "@/services/api";
import { Can } from "@/hooks/use-permission";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminProjectsPage() {
  const { data: projects = [], isLoading, isError, refetch } = useProjects();
  const qc = useQueryClient();

  if (isLoading) return <LoadingList rows={6} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader title="مدیریت پروژه‌ها" description="نظارت و مدیریت همه پروژه‌های سامانه." />
      <Card className="hidden overflow-hidden p-0 lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>پروژه</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>سلامت</TableHead>
              <TableHead>پیشرفت</TableHead>
              <TableHead>اعضا</TableHead>
              <TableHead>آخرین فعالیت</TableHead>
              <TableHead>اقدامات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/projects/${p.id}/overview`} className="flex items-center gap-2.5 hover:text-primary">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: p.iconColor }}>
                      {p.key.slice(0, 2)}
                    </span>
                    <span className="font-medium">{p.name}</span>
                  </Link>
                </TableCell>
                <TableCell><Badge variant="secondary">{PROJECT_STATUS_META[p.status].label}</Badge></TableCell>
                <TableCell><Badge variant="secondary">{HEALTH_META[p.health].label}</Badge></TableCell>
                <TableCell><span className="flex items-center gap-2"><Progress value={p.progress} className="h-1.5 w-20" /><span className="text-xs tnum">{toFaDigits(p.progress)}٪</span></span></TableCell>
                <TableCell className="tnum">{toFaDigits(p.membersCount)}</TableCell>
                <TableCell className="text-xs">{timeAgoFa(p.lastActivityAt)}</TableCell>
                <TableCell>
                  <span className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild><Link href={`/projects/${p.id}/settings`}>تنظیمات</Link></Button>
                    <Can perm="projects.delete">
                      <ConfirmDialog
                        trigger={<Button variant="ghost" size="icon-sm" aria-label={`حذف ${p.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        title="حذف پروژه" description={`«${p.name}» و همه داده‌های آن حذف می‌شود.`}
                        confirmLabel="حذف"
                        onConfirm={async () => {
                          await projectsApi.remove(p.id);
                          qc.invalidateQueries({ queryKey: ["projects"] });
                          toast.success("پروژه حذف شد.");
                        }}
                      />
                    </Can>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="grid gap-2.5 lg:hidden">
        {projects.map((p) => (
          <Card key={p.id} className="p-3.5">
            <Link href={`/projects/${p.id}/overview`} className="flex items-center gap-2.5">
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 truncate text-sm font-semibold">{p.name}</span>
              <Badge variant="secondary">{PROJECT_STATUS_META[p.status].label}</Badge>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
