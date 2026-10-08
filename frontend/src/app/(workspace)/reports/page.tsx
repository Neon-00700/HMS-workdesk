"use client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/states";
import { OverviewCards, WorkloadChart, EffortDonut, WorkloadTable, BurnChart, StreamProgress, TrendChart, MemberProgress, ProjectsProgress } from "@/features/reports/report-widgets";
import { useProjects } from "@/services/queries";
import { usePermission } from "@/hooks/use-permission";
import { useWorkspaceStore } from "@/stores/workspace-store";

export default function ReportsPage() {
  const { can } = usePermission();
  const { data: projects = [] } = useProjects();
  const activePid = useWorkspaceStore((s) => s.activeProjectId);
  const [pid, setPid] = useState<string>(activePid ?? projects[0]?.id ?? "");

  if (!can("reports.view")) return <PermissionDenied />;
  const selected = pid || activePid || projects[0]?.id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="گزارش‌ها و تحلیل‌ها"
        description="عملکرد تیم، پیشرفت پروژه‌ها و حجم کاری."
        actions={
          <Select value={selected} onValueChange={setPid}>
            <SelectTrigger className="w-56"><SelectValue placeholder="انتخاب پروژه" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      <OverviewCards />
      <div className="grid gap-6 xl:grid-cols-2">
        {selected && <BurnChart projectId={selected} />}
        <TrendChart projectId={selected} />
        <WorkloadChart />
        {selected && <StreamProgress projectId={selected} />}
        <EffortDonut />
        <MemberProgress projectId={selected} />
      </div>
      <ProjectsProgress />
      <WorkloadTable />
    </div>
  );
}
