"use client";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/states";
import { OverviewCards, BurnChart, WorkloadChart, StreamProgress, EffortDonut, WorkloadTable } from "@/features/reports/report-widgets";
import { usePermission } from "@/hooks/use-permission";

export default function ProjectReportsPage() {
  const { id } = useParams() as { id: string };
  const { can } = usePermission();
  if (!can("reports.view")) return <PermissionDenied />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="گزارش‌های پروژه" description="تحلیل پیشرفت، حجم کاری و تلاش تیم." />
      <OverviewCards projectId={id} />
      <div className="grid gap-6 xl:grid-cols-2">
        <BurnChart projectId={id} />
        <WorkloadChart projectId={id} />
        <StreamProgress projectId={id} />
        <EffortDonut projectId={id} />
      </div>
      <WorkloadTable projectId={id} />
    </div>
  );
}
